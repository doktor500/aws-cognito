export const successPage = (authToken: string) => {
  return `
  <!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>Success</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          padding: 2rem;
          text-align: center;
          background: #f0f8ff;
        }
        .success-message {
          font-size: 1.5rem;
          color: #2e7d32;
          margin-bottom: 1.5rem;
        }
        button {
          font-size: 1rem;
          padding: 0.5rem 1rem;
          cursor: pointer;
          background-color: #1976d2;
          color: white;
          border: none;
          border-radius: 4px;
          transition: background-color 0.2s ease;
        }
        button:hover {
          background-color: #115293;
        }
        .hidden-input {
          display: none;
        }
      </style>
    </head>
    <body>
      <div class="success-message">Success!</div>
      <input type="text" id="hiddenInput" class="hidden-input" value="${authToken}" />
      <button id="copyButton">Copy auth token</button>
      <script>
        const button = document.getElementById('copyButton');
        const hiddenInput = document.getElementById('hiddenInput');

        button.addEventListener('click', async () => {
          try {
            await navigator.clipboard.writeText(hiddenInput.value);
          } catch (error) {
            alert("Failed to copy");
          }
        });
      </script>
    </body>
  </html>
  `
}
