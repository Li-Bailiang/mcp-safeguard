// Test cases that SHOULD be detected by indirect-injection rules

// mcp-unsanitized-url-fetch - should detect
const data1 = await fetch(userInput);

// mcp-prompt-injection-risk - should detect
const data2 = await fetch("https://example.com");
const prompt = `User input: ${data2}`;

// mcp-unvalidated-file-read - should detect
const fs = require('fs');
fs.readFileSync(userPath);

// mcp-sql-injection-risk - should detect
const query = "SELECT * FROM users WHERE id = " + userId + " AND name = 'test'";
db.query(query);

// mcp-xml-external-entities - should detect
const parser = new XMLParser();
