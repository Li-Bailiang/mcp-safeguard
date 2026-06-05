/**
 * Recommended configuration preset for MCP-Safeguard.
 *
 * Balanced defaults for most projects. All rule IDs below are real MCP-Safeguard
 * rule IDs (see docs/rules.md). Rules not listed here keep the severity defined
 * in their rule definition; listing one here overrides it.
 */
module.exports = {
  rules: {
    // High-signal MCP-specific threats — always errors.
    'mcp-tool-poisoning': 'error',
    'mcp-cross-server-shadowing': 'error',
    'mcp-credential-passthrough': 'error',
    'mcp-tool-description-dynamic': 'warn',

    // Code/command injection — always errors.
    'mcp-suspicious-exec-package': 'error',
    'mcp-suspicious-eval': 'error',
    'mcp-python-subprocess-shell': 'error',
    'mcp-python-exec-eval': 'error',

    // Auth / transport.
    'mcp-server-no-auth': 'error',
    'mcp-python-server-no-auth': 'error',
    'mcp-disabled-tls-verification': 'error',
    'mcp-python-ssl-disabled': 'error',

    // Low-confidence advisory heuristics — keep as warnings (do not fail CI).
    'mcp-unrestricted-network-access': 'warn',
    'mcp-tool-no-confirmation': 'warn',

    // Noisy heuristics — off by default in the recommended preset.
    'mcp-excessive-logging': 'off',
    'mcp-python-excessive-logging': 'off',
    'mcp-pii-exposure': 'off',
    'mcp-excessive-file-access': 'off',
  },

  ignore: [
    '**/node_modules/**',
    '**/dist/**',
    '**/build/**',
    '**/.git/**',
    '**/coverage/**',
    '**/test/**',
    '**/tests/**',
    '**/__tests__/**',
    '**/fixtures/**',
    '**/*.test.js',
    '**/*.test.ts',
    '**/*.spec.js',
    '**/*.spec.ts',
  ],

  severity: {
    failOn: 'high',
  },

  languages: ['javascript', 'typescript', 'python'],

  output: {
    format: 'text',
    path: './reports/',
  },
};
