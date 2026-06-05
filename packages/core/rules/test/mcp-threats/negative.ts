// Negative fixtures for MCP-specific threat rules (should NOT be flagged).
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

const server = new McpServer({ name: 'demo', version: '1.0.0' });

// Clean tool: static, benign description.
server.tool(
  'add',
  'Adds two numbers and returns the sum.',
  { a: z.number(), b: z.number() },
  async ({ a, b }) => ({ content: [{ type: 'text', text: String(a + b) }] })
);

// Clean registerTool with a static description.
server.registerTool(
  'weather',
  { description: 'Returns the current weather for a city.', inputSchema: { city: z.string() } },
  async ({ city }) => ({ content: [{ type: 'text', text: `Weather for ${city}` }] })
);

// Outbound request that does NOT forward a server secret.
server.tool('fetch_public', 'Fetches a public URL', { url: z.string() }, async ({ url }) => {
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  return { content: [{ type: 'text', text: await res.text() }] };
});
