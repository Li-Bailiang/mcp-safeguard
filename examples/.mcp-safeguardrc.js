// Example MCP-Safeguard configuration file
// This file demonstrates all available configuration options

module.exports = {
  // Extend from a preset configuration
  // Available presets:
  //   - @mcp-safeguard/config-recommended (default, balanced security)
  //   - @mcp-safeguard/config-strict (maximum security, zero tolerance)
  //   - @mcp-safeguard/config-minimal (critical issues only)
  extends: ['@mcp-safeguard/config-recommended'],

  // Rule-level configuration
  // Format: 'rule-id': 'error' | 'warn' | 'off'
  // Or: 'rule-id': { severity: 'error' | 'warn' | 'off', options: {...} }
  rules: {
    // Override severity for specific rules
    'indirect-prompt-injection': 'error',
    'excessive-agency': 'warn',
    'typosquatting': 'off',

    // Configure rule with options
    'missing-input-validation': {
      severity: 'warn',
      options: {
        allowedPatterns: ['email', 'url'],
      },
    },

    // Disable rules that don't apply to your project
    'insecure-cors': 'off',
  },

  // Glob patterns for files/directories to ignore
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
    // Add your custom ignore patterns
    '**/generated/**',
    '**/vendor/**',
  ],

  // Severity configuration
  severity: {
    // Fail the scan (exit code 1) when issues of this level or higher are found
    // Options: 'low' | 'medium' | 'high' | 'critical'
    failOn: 'high',
  },

  // Languages to scan
  // Limiting languages can improve scan performance
  languages: ['javascript', 'typescript', 'python', 'go'],

  // Output configuration
  output: {
    // Default output format
    // Options: 'text' | 'json' | 'sarif' | 'html'
    format: 'text',

    // Default output path for reports
    path: './reports/',
  },
};
