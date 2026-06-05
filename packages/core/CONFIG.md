# MCP-Safeguard Configuration System

Comprehensive configuration system for customizing MCP-Safeguard security scans.

## Overview

The configuration system allows you to:
- Enable/disable specific security rules
- Override rule severity levels
- Define ignore patterns for files and directories
- Extend from preset configurations
- Configure output formats and paths
- Set severity thresholds for scan failures

## Configuration Files

MCP-Safeguard automatically discovers configuration files by walking up the directory tree. Supported formats:

- `.mcp-safeguardrc.js` (JavaScript, supports dynamic configuration)
- `.mcp-safeguardrc.json` (JSON)
- `.mcp-safeguardrc.yaml` or `.mcp-safeguardrc.yml` (YAML)
- `.mcp-safeguardrc` (JSON without extension)
- `mcp-safeguard.config.js` (JavaScript alternative)

Files are searched in order of precedence from the scan directory upward.

## Configuration Schema

### Complete Example

```javascript
module.exports = {
  extends: ['@mcp-safeguard/config-recommended'],
  
  rules: {
    'indirect-prompt-injection': 'error',
    'excessive-agency': 'warn',
    'typosquatting': 'off',
    'missing-input-validation': {
      severity: 'warn',
      options: {
        allowedPatterns: ['email', 'url']
      }
    }
  },
  
  ignore: [
    '**/test/**',
    '**/fixtures/**',
    'node_modules/**'
  ],
  
  severity: {
    failOn: 'high'
  },
  
  languages: ['javascript', 'typescript', 'python', 'go'],
  
  output: {
    format: 'json',
    path: './reports/'
  }
};
```

### Configuration Options

#### `extends`
Type: `string | string[]`

Extend from one or more preset configurations or other config files.

```javascript
// Single preset
extends: '@mcp-safeguard/config-recommended'

// Multiple presets (later configs override earlier ones)
extends: ['@mcp-safeguard/config-recommended', '@mcp-safeguard/config-strict']

// Relative path
extends: './base-config.json'
```

#### `rules`
Type: `Record<string, RuleSeverity | RuleOptions>`

Configure individual security rules.

**Rule Severity:** `'error'` | `'warn'` | `'off'`
- `error`: Treat as high severity issue
- `warn`: Treat as medium severity issue
- `off`: Disable the rule

**Simple Configuration:**
```javascript
rules: {
  'indirect-prompt-injection': 'error',
  'typosquatting': 'off'
}
```

**Advanced Configuration with Options:**
```javascript
rules: {
  'missing-input-validation': {
    severity: 'warn',
    options: {
      allowedPatterns: ['email', 'url'],
      maxLength: 1000
    }
  }
}
```

#### `ignore`
Type: `string[]`

Array of glob patterns for files and directories to ignore during scanning.

```javascript
ignore: [
  '**/node_modules/**',
  '**/dist/**',
  '**/test/**',
  '**/*.test.js',
  '*.config.js'
]
```

**Pattern Syntax:**
- `**` matches any number of directories
- `*` matches any characters except `/`
- `?` matches a single character
- `[abc]` matches any character in the set

#### `severity`
Type: `{ failOn: 'low' | 'medium' | 'high' | 'critical' }`

Configure when the scan should fail (exit with code 1).

```javascript
severity: {
  failOn: 'high'  // Fail only on high or critical severity issues
}
```

#### `languages`
Type: `string[]`

Specify which programming languages to scan. Limiting languages improves performance.

```javascript
languages: ['javascript', 'typescript', 'python', 'go']
```

Supported languages: `javascript`, `typescript`, `python`, `go`, `rust`, `java`, `csharp`, `php`, `ruby`

#### `output`
Type: `{ format: OutputFormat, path: string }`

Configure default output settings.

```javascript
output: {
  format: 'json',  // 'text' | 'json' | 'sarif' | 'html'
  path: './reports/'
}
```

## Preset Configurations

### @mcp-safeguard/config-recommended

Balanced security checks suitable for most projects. This is the default preset.

- Critical security issues: `error`
- Important security issues: `warn`
- Best practices: `off`
- Fail on: `high` severity

### @mcp-safeguard/config-strict

Maximum security checks with zero tolerance. Use for high-security projects.

- All security issues: `error`
- Best practices: `warn`
- Minimal ignore patterns
- Fail on: `medium` severity

### @mcp-safeguard/config-minimal

Only critical security checks. Use for legacy projects or quick scans.

- Only critical injection vulnerabilities: `error`
- Everything else: `off`
- Fail on: `critical` severity

## Using Presets

### Install a Preset

```bash
pnpm add -D @mcp-safeguard/config-recommended
```

### Extend from Preset

```javascript
// .mcp-safeguardrc.js
module.exports = {
  extends: '@mcp-safeguard/config-recommended'
};
```

### Override Preset Rules

```javascript
module.exports = {
  extends: '@mcp-safeguard/config-strict',
  rules: {
    // Relax specific rules
    'missing-rate-limiting': 'warn',
    'excessive-logging': 'off'
  }
};
```

## Environment Variable Overrides

Environment variables can override configuration settings:

```bash
# Override fail-on severity
export MCP_SAFEGUARD_FAIL_ON=medium

# Override output format
export MCP_SAFEGUARD_OUTPUT_FORMAT=json

# Override output path
export MCP_SAFEGUARD_OUTPUT_PATH=/custom/reports/

# Run scan
mcp-safeguard scan ./my-project
```

## CLI Integration

### Specify Config File

```bash
# Use specific config file
mcp-safeguard scan ./my-project --config ./custom-config.json
```

### Disable Config File Lookup

```bash
# Use defaults only, ignore config files
mcp-safeguard scan ./my-project --no-config
```

### Verbose Mode

```bash
# Show loaded configuration details
mcp-safeguard scan ./my-project --verbose
```

## Configuration Discovery

MCP-Safeguard searches for configuration files in this order:

1. Path specified via `--config` flag
2. `.mcp-safeguardrc.js` in current directory
3. `.mcp-safeguardrc.json` in current directory
4. `.mcp-safeguardrc.yaml` in current directory
5. Walk up directory tree repeating steps 2-4
6. Use default configuration if no file found

## Configuration Merging

When using `extends`, configurations are merged with this behavior:

- **Rules**: Later configs override earlier ones
- **Ignore patterns**: All patterns are combined (additive)
- **Severity**: Later config overrides
- **Languages**: Later config replaces
- **Output**: Later config overrides

### Example

```javascript
// base-config.json
{
  "rules": {
    "rule-a": "error",
    "rule-b": "warn"
  },
  "ignore": ["**/test/**"]
}

// .mcp-safeguardrc.json
{
  "extends": "./base-config.json",
  "rules": {
    "rule-b": "error",  // Overrides base
    "rule-c": "warn"    // Adds new rule
  },
  "ignore": ["**/fixtures/**"]  // Combined with base
}

// Result:
// rules: { "rule-a": "error", "rule-b": "error", "rule-c": "warn" }
// ignore: ["**/test/**", "**/fixtures/**"]
```

## Available Security Rules

### Critical Rules (Injection Attacks)
- `indirect-prompt-injection`: Indirect prompt injection vulnerabilities
- `direct-prompt-injection`: Direct prompt injection vulnerabilities
- `command-injection`: OS command injection
- `sql-injection`: SQL injection vulnerabilities
- `path-traversal`: Path traversal vulnerabilities
- `insecure-deserialization`: Unsafe deserialization

### Security Rules (Common Vulnerabilities)
- `excessive-agency`: Excessive tool/function permissions
- `insecure-tool-execution`: Unsafe tool execution patterns
- `xxe-vulnerability`: XML external entity vulnerabilities
- `hardcoded-secrets`: Hardcoded credentials and secrets
- `weak-crypto`: Weak cryptographic algorithms
- `insecure-randomness`: Insecure random number generation
- `exposed-sensitive-data`: Exposed sensitive information
- `insecure-cors`: Insecure CORS configuration
- `regex-dos`: Regular expression DoS vulnerabilities
- `prototype-pollution`: JavaScript prototype pollution

### Authentication & Authorization
- `missing-authentication`: Missing authentication checks
- `missing-authorization`: Missing authorization checks
- `missing-input-validation`: Missing input validation

### Supply Chain Security
- `typosquatting`: Suspicious package names
- `malicious-package`: Known malicious packages
- `outdated-dependencies`: Outdated dependencies
- `vulnerable-dependencies`: Known vulnerable dependencies

### Operational Security
- `missing-rate-limiting`: Missing rate limiting
- `missing-error-handling`: Missing error handling
- `excessive-logging`: Excessive or sensitive logging

## Validation

Configuration is validated on load. Invalid configurations will show warnings:

```bash
⚠ Configuration validation warnings:
  - Invalid rule configuration for 'test-rule': must be 'error', 'warn', 'off'
  - Invalid severity.failOn: must be one of low, medium, high, critical
```

## API Usage

### Programmatic Configuration

```typescript
import { ConfigLoader, ConfigValidator, RuleFilter, PathMatcher } from '@mcp-safeguard/core';

// Load configuration
const loader = new ConfigLoader();
const config = await loader.load('/path/to/project');

// Validate configuration
const validator = new ConfigValidator();
const result = validator.validate(config);
if (!result.valid) {
  console.error('Config errors:', result.errors);
}

// Use rule filter
const ruleFilter = new RuleFilter(config.rules);
const filteredFindings = ruleFilter.filterFindings(findings);
const withOverrides = ruleFilter.applySeverityOverrides(findings);

// Use path matcher
const pathMatcher = new PathMatcher(config.ignore);
const shouldIgnore = pathMatcher.shouldIgnore('test/file.js');
const filteredPaths = pathMatcher.filter(allPaths);
```

## Best Practices

1. **Start with recommended preset**: Begin with `@mcp-safeguard/config-recommended` and customize as needed.

2. **Version control your config**: Commit `.mcp-safeguardrc.js` to share configuration across team.

3. **Use extends for reusability**: Create a base config for your organization and extend it in projects.

4. **Document rule overrides**: Add comments explaining why specific rules are disabled or changed.

5. **Test configuration changes**: Run scans after config changes to ensure expected behavior.

6. **Use environment variables for CI/CD**: Override settings in different environments without changing config files.

7. **Review ignored patterns regularly**: Ensure ignored paths don't hide security issues.

## Examples

See the `/examples` directory for complete configuration examples:
- `.mcp-safeguardrc.js` - Fully commented JavaScript config
- `.mcp-safeguardrc.json` - JSON format example
- `.mcp-safeguardrc.yaml` - YAML format example
