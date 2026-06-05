// Test cases that should NOT be detected (false positives)

const fs = require('fs');

// Reading specific directory (not root)
fs.readdir("/app/data", (err, files) => {
  console.log(files);
});

// Logging non-sensitive data
console.log("Application started");
logger.info("Request completed");

// Returning data that's not user-specific
return {
  content: [{
    type: "text",
    text: "Static content"
  }]
};

// Using redacted credentials
const redacted = redact(apiKey);
const prompt = `API Key: ${redacted}`;
