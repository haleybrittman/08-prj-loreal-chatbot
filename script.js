/* DOM elements */
const chatForm = document.getElementById("chatForm");
const userInput = document.getElementById("userInput");
const chatWindow = document.getElementById("chatWindow");

const workerURL = "https://gca-worker.hbrittman.workers.dev/"; // Replace with your Cloudflare Worker URL

// Set initial message
chatWindow.textContent = "👋 Hello! How can I help you today?";

/* Handle form submit */
chatForm.addEventListener("submit", (e) => {
  e.preventDefault();

  // Grab user input and do a quick validation
  const userText = userInput.value.trim();
  if (!userText) return;

  // Show a simple status in the chat window while we call the worker
  chatWindow.innerHTML = "Connect to the OpenAI API for a response!";

  // Build the request body: Cloudflare Worker expects a `messages` array
  const body = {
    messages: [
      { role: "user", content: userText }
    ]
  };

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
      // Students: the assistant text is at data.choices[0].message.content
      const assistantText = (data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content)
        ? data.choices[0].message.content
        : JSON.stringify(data);

      // Display the assistant reply
      chatWindow.textContent = assistantText;
    } catch (err) {
      // Log for debugging and show a friendly message
      console.error("Error sending to worker:", err);
      chatWindow.textContent = `Error: ${err.message}`;
    } finally {
      // Always clear the input so the user can type another message
      userInput.value = "";
    }
  })();
});
