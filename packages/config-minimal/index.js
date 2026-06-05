/**
 * Minimal configuration preset for MCP-Safeguard.
 *
 * Only the highest-signal, critical security checks — suitable for legacy
 * projects or quick scans where you want to fail only on the worst issues.
 * Rules are enabled by default, so this preset turns OFF the advisory /
 * lower-confidence rules and leaves the critical ones at their default severity.
 * All rule IDs are real (see docs/rules.md).
 */
module.exports = {
  rules: {
    // Advisory / lower-confidence heuristics: off in minimal mode.
    'mcp-excessive-logging': 'off',
    'mcp-python-excessive-logging': 'off',
    'mcp-pii-exposure': 'off',
    'mcp-excessive-file-access': 'off',
    'mcp-tool-no-confirmation': 'off',
    'mcp-unrestricted-network-access': 'off',
    'mcp-unrestricted-file-write': 'off',
    'mcp-python-unrestricted-write': 'off',
    'mcp-dynamic-import': 'off',
    'mcp-tool-description-dynamic': 'off',
    'mcp-resource-exposes-env': 'off',
    'mcp-missing-rate-limit': 'off',
    'mcp-large-file-processing': 'off',
    'mcp-python-large-file': 'off',
    'mcp-regex-dos': 'off',
    'mcp-unbounded-loop': 'off',
    'mcp-python-unbounded-loop': 'off',
    'mcp-uncontrolled-memory-allocation': 'off',
    'mcp-uncontrolled-recursion': 'off',
    'mcp-debug-mode-production': 'off',
    'mcp-python-debug-enabled': 'off',
    'mcp-homoglyph-attack': 'off',
    'mcp-namespace-confusion': 'off',

    // The critical rules below stay on (listed for clarity).
    'mcp-tool-poisoning': 'error',
    'mcp-credential-passthrough': 'error',
    'mcp-suspicious-exec-package': 'error',
    'mcp-suspicious-eval': 'error',
    'mcp-python-subprocess-shell': 'error',
    'mcp-python-exec-eval': 'error',
    'mcp-sql-injection-risk': 'error',
    'mcp-python-sql-injection': 'error',
    'mcp-hardcoded-credentials': 'error',
    'mcp-python-hardcoded-secrets': 'error',
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
    '**/vendor/**',
    '**/.venv/**',
    '**/__pycache__/**',
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
