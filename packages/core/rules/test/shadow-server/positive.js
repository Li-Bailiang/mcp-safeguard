// Test cases that SHOULD be detected by shadow-server rules

const { Server } = require('@modelcontextprotocol/sdk/server');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio');

// mcp-server-no-auth - should detect
const server = new Server({ name: "test" });
server.connect(transport);

// mcp-server-insecure-transport - should detect
new StdioServerTransport();

// mcp-hardcoded-credentials - should detect
const config = { apiKey: "EXAMPLE_API_KEY_DO_NOT_USE", password: "secret123" };
const API_KEY = "hardcoded-key-value";
const PASSWORD = "hardcoded-password";

// mcp-unrestricted-cors - should detect
res.setHeader("Access-Control-Allow-Origin", "*");
const corsConfig = { cors: { origin: "*" } };

// mcp-disabled-tls-verification - should detect
const httpsOptions = { rejectUnauthorized: false };
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

// mcp-debug-mode-production - should detect
const appConfig = { debug: true };
process.env.DEBUG = "*";
