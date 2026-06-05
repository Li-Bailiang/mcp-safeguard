/**
 * Strict configuration preset for MCP-Safeguard.
 *
 * Maximum coverage with low tolerance: every rule stays enabled at its default
 * severity, the lower-confidence advisory rules are escalated to errors, and the
 * scan fails on any finding. All rule IDs are real (see docs/rules.md).
 */
module.exports = {
  rules: {
    // Escalate advisory MCP rules to errors in strict mode.
    'mcp-tool-poisoning': 'error',
    'mcp-cross-server-shadowing': 'error',
    'mcp-credential-passthrough': 'error',
    'mcp-tool-description-dynamic': 'error',
    'mcp-tool-no-confirmation': 'error',
    'mcp-unrestricted-network-access': 'error',
    'mcp-unrestricted-file-write': 'error',
    'mcp-python-unrestricted-write': 'error',
    'mcp-excessive-file-access': 'error',
    'mcp-resource-exposes-env': 'error',
    'mcp-dynamic-import': 'error',
    'mcp-regex-dos': 'error',
    'mcp-missing-rate-limit': 'warn',
    'mcp-excessive-logging': 'warn',
    'mcp-python-excessive-logging': 'warn',
    'mcp-pii-exposure': 'warn',
  },

  ignore: [
    '**/node_modules/**',
    '**/.git/**',
  ],

  // Fail on anything (lowest threshold).
  severity: {
    failOn: 'low',
  },

  // All languages MCP-Safeguard actually supports.
  languages: ['javascript', 'typescript', 'python', 'go', 'rust', 'java'],

  output: {
    format: 'json',
    path: './reports/',
  },
};
