/* DOM elements */
const chatForm = document.getElementById("chatForm");
const userInput = document.getElementById("userInput");
const chatWindow = document.getElementById("chatWindow");

const workerURL = "https://gca-worker.hbrittman.workers.dev/"; // Replace with your Cloudflare Worker URL

// System message to guide the assistant's behavior. Edit this to change
// the assistant's persona or instructions.
const systemMessage = "You are an expert on L'Oréal products and a friendly beauty consultant. Provide accurate, concise product recommendations from L'Oréal's range, ask clarifying questions when needed (skin/hair type, concerns, budget), and include short usage tips. Avoid making medical claims and suggest a professional if the issue appears medical. If a user asks a question that is unrelated to L'Oréal products, beauty routines, recommendations, or other beauty-related topics, politely refuse to answer: briefly explain that you only provide L'Oréal product and beauty guidance, offer a short one-line reason, and then offer to help with related questions (for example, ask about skin type, hair concerns, or budget). Do not attempt to answer questions on unrelated topics (for example, politics, unrelated technical support, legal advice, or in-depth medical diagnoses); instead, politely redirect the user to an appropriate professional or general resource.";

// Set initial message
chatWindow.textContent = "👋 Hello! How can I help you today?";

// Conversation history that will be sent to the worker on every request.
// It starts with the system message and is appended with user & assistant turns.
const messages = [
  { role: "system", content: systemMessage }
];

// Helper to append messages to the chat window. Simple DOM bubbles.
function appendMessage(role, text, isTemporary = false) {
  // Create message wrapper
  const el = document.createElement("div");
  // Map role names to CSS classes: keep `.user` and `.ai` (existing CSS uses .msg.ai)
  const roleClass = role === "assistant" || role === "ai" ? "ai" : role;
  el.className = `msg ${roleClass}`;

  // Tag (e.g., "You" or "L'Oréal") to indicate speaker
  const tag = document.createElement("span");
  tag.className = "msg-tag";
  tag.textContent = roleClass === "user" ? "You" : "L'Oréal";

  // Message content container (preserve whitespace)
  const content = document.createElement("div");
  content.className = "msg-content";
  content.textContent = text;
  content.style.whiteSpace = "pre-wrap"; // respect newlines and wrapping

  if (isTemporary) content.dataset.temp = "true";

  // Compose and append
  el.appendChild(tag);
  el.appendChild(content);
  chatWindow.appendChild(el);

  // Keep chat window scrolled to bottom
  chatWindow.scrollTop = chatWindow.scrollHeight;

  // Return the content element (useful for updating temporary text)
  return content;
}

/* Handle form submit */
chatForm.addEventListener("submit", (e) => {
  e.preventDefault();

  // Grab user input and do a quick validation
  const userText = userInput.value.trim();
  if (!userText) return;

  // Immediately clear the input so the user can type again
  userInput.value = "";

  // Append user message to local conversation and UI
  const userMsg = { role: "user", content: userText };
  messages.push(userMsg);
  appendMessage("user", userText);

    // Add a temporary assistant message that we'll replace when the reply arrives
    // Product-friendly thinking text shown while awaiting the worker reply
    const tempEl = appendMessage("assistant", "Finding the best L'Oréal recommendations...", true);

  // Build the request body using the full conversation history
  const body = { messages: messages };

  // Use async IIFE so we can use await inside this event handler
  (async () => {
    try {
      const res = await fetch(workerURL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
      });

      if (!res.ok) {
        // Throw to be caught in catch block below
        throw new Error(`Worker responded with status ${res.status}`);
      }

      // Parse JSON response from the worker
      const data = await res.json();

      // The worker proxies OpenAI and returns the choices array.
      // The assistant text is at data.choices[0].message.content
      const assistantText = (data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content)
        ? data.choices[0].message.content
        : JSON.stringify(data);

      // Replace the temporary assistant message text and add to history
      tempEl.textContent = assistantText;
      delete tempEl.dataset.temp;
      const assistantMsg = { role: "assistant", content: assistantText };
      messages.push(assistantMsg);
    } catch (err) {
      // Log full error for debugging (don't expose details to the user)
      console.error("Error sending to worker:", err);

      // Friendly message shown to the user
      const friendly = "Sorry — I couldn't get recommendations right now. Please try again shortly.";

      // Try to update the temporary element if it exists; otherwise append a new assistant message
      try {
        if (typeof tempEl !== "undefined" && tempEl) {
          tempEl.textContent = friendly;
          // Add a styling hook in case you want to style errors differently
          tempEl.classList.add("error");
          delete tempEl.dataset.temp;
        } else {
          appendMessage("assistant", friendly);
        }
      } catch (uiErr) {
        // If updating the UI fails for any reason, log and silently fallback
        console.error("Error updating UI after worker failure:", uiErr);
      }
    } finally {
      // nothing to do here; input was cleared immediately on submit
    }
  })();
});
