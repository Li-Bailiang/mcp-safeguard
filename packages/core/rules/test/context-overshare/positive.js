// Test cases that SHOULD be detected by context-overshare rules

const fs = require('fs');

// mcp-resource-exposes-env - should detect
server.setRequestHandler(ListResourcesRequestSchema, async () => ({
  resources: [{
    uri: "env://all",
    name: "Environment"
  }]
}));
const envVars = process.env;

// mcp-excessive-file-access - should detect
fs.readdir("/", (err, files) => {
  console.log(files);
});

// mcp-credential-in-prompt - should detect
const prompt = `API Key: ${process.env.API_KEY}`;
const prompt2 = `Your key: ${apiKey}`;

// mcp-excessive-logging - should detect
console.log(sensitiveData);
logger.info(userData);

// mcp-pii-exposure - should detect
return {
  content: [{
    type: "text",
    text: userData
  }]
};
