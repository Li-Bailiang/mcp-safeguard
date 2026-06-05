// Test cases that should NOT be detected (false positives)

const { Server } = require('@modelcontextprotocol/sdk/server');

// Server with auth
const server = new Server({
  name: "test",
  auth: true
});

// Credentials from environment
const config = {
  apiKey: process.env.API_KEY,
  password: process.env.PASSWORD
};

// Specific CORS origin
res.setHeader("Access-Control-Allow-Origin", "https://example.com");
const corsConfig = { cors: { origin: "https://trusted.com" } };

// TLS verification enabled (default)
const httpsOptions = { rejectUnauthorized: true };

// Debug disabled in production
const appConfig = { debug: false };
if (process.env.NODE_ENV === 'development') {
  config.debug = true;
}
