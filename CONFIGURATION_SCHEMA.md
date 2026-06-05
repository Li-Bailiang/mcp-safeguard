# MCP-Safeguard Configuration Schema

## Type Definitions

```typescript
interface McpShieldConfig {
  extends?: string | string[];
  rules?: RuleConfig;
  ignore?: string[];
  severity?: SeverityConfig;
  languages?: string[];
  output?: OutputConfig;
}

interface RuleConfig {
  [ruleId: string]: RuleSeverity | RuleOptions;
}

type RuleSeverity = 'error' | 'warn' | 'off';

interface RuleOptions {
  severity: RuleSeverity;
  options?: Record<string, any>;
}

interface SeverityConfig {
  failOn?: 'low' | 'medium' | 'high' | 'critical';
}

interface OutputConfig {
  format?: 'json' | 'text' | 'sarif' | 'html';
  path?: string;
}

interface ResolvedConfig extends McpShieldConfig {
  rules: RuleConfig;
  ignore: string[];
  severity: Required<SeverityConfig>;
  languages: string[];
  output: Required<OutputConfig>;
}
```

## Default Configuration

```javascript
{
  rules: {},
  ignore: [
    '**/node_modules/**',
    '**/dist/**',
    '**/build/**',
    '**/.git/**',
    '**/coverage/**'
  ],
  severity: {
    failOn: 'high'
  },
  languages: ['javascript', 'typescript', 'python', 'go'],
  output: {
    format: 'text',
    path: './reports/'
  }
}
```

## Configuration File Formats

### JSON (.mcp-safeguardrc.json)
```json
{
  "extends": ["@mcp-safeguard/config-recommended"],
  "rules": {
    "indirect-injection": "error",
    "excessive-agency": "warn"
  },
  "ignore": ["**/test/**"],
  "severity": { "failOn": "high" },
  "languages": ["javascript", "typescript"],
  "output": { "format": "json", "path": "./reports/" }
}
```

### JavaScript (.mcp-safeguardrc.js)
```javascript
module.exports = {
  extends: ['@mcp-safeguard/config-recommended'],
  rules: {
    'indirect-injection': 'error',
    'excessive-agency': 'warn'
  },
  ignore: ['**/test/**'],
  severity: { failOn: 'high' },
  languages: ['javascript', 'typescript'],
  output: { format: 'json', path: './reports/' }
};
```

### YAML (.mcp-safeguardrc.yaml)
```yaml
extends:
  - '@mcp-safeguard/config-recommended'
rules:
  indirect-injection: error
  excessive-agency: warn
ignore:
  - '**/test/**'
severity:
  failOn: high
languages:
  - javascript
  - typescript
output:
  format: json
  path: ./reports/
```

## Environment Variables

| Variable | Type | Description |
|----------|------|-------------|
| `MCP_SAFEGUARD_FAIL_ON` | string | Override `severity.failOn` (low, medium, high, critical) |
| `MCP_SAFEGUARD_OUTPUT_FORMAT` | string | Override `output.format` (json, text, sarif, html) |
| `MCP_SAFEGUARD_OUTPUT_PATH` | string | Override `output.path` |

## CLI Flags

| Flag | Description |
|------|-------------|
| `--config <path>` | Specify configuration file path |
| `--no-config` | Disable configuration file lookup |
| `-v, --verbose` | Show loaded configuration details |

## Configuration Discovery Order

1. `--config` flag path (if specified)
2. `.mcp-safeguardrc.js` (current directory)
3. `.mcp-safeguardrc.json` (current directory)
4. `.mcp-safeguardrc.yaml` (current directory)
5. `.mcp-safeguardrc.yml` (current directory)
6. `.mcp-safeguardrc` (current directory)
7. `mcp-safeguard.config.js` (current directory)
8. Walk up directory tree, repeat steps 2-7
9. Use defaults if no config found

## Preset Packages

### @mcp-safeguard/config-recommended
**Install:** `pnpm add -D @mcp-safeguard/config-recommended`

Balanced security for most projects.
- Critical issues: error
- Important issues: warn
- Best practices: off
- Fail on: high

### @mcp-safeguard/config-strict
**Install:** `pnpm add -D @mcp-safeguard/config-strict`

Maximum security, zero tolerance.
- All security issues: error
- Best practices: warn
- Minimal ignores
- Fail on: medium

### @mcp-safeguard/config-minimal
**Install:** `pnpm add -D @mcp-safeguard/config-minimal`

Critical issues only.
- Only critical injections: error
- Everything else: off
- Fail on: critical

## API Classes

### ConfigLoader
```typescript
class ConfigLoader {
  async load(searchPath: string, options?: { configPath?: string }): Promise<ResolvedConfig>;
  clearCache(): void;
}
```

### ConfigValidator
```typescript
class ConfigValidator {
  validate(config: McpShieldConfig): ValidationResult;
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
}
```

### PathMatcher
```typescript
class PathMatcher {
  constructor(patterns: string[]);
  shouldIgnore(filePath: string): boolean;
  filter(paths: string[]): string[];
}
```

### RuleFilter
```typescript
class RuleFilter {
  constructor(config: RuleConfig);
  isEnabled(ruleId: string): boolean;
  getSeverity(ruleId: string): RuleSeverity | null;
  getOptions(ruleId: string): Record<string, any> | undefined;
  filterFindings(findings: any[]): any[];
  applySeverityOverrides(findings: any[]): any[];
}
```

## Configuration Merging Behavior

### Rules
Later configurations override earlier ones:
```javascript
Base: { "rule-a": "error", "rule-b": "warn" }
Override: { "rule-b": "error", "rule-c": "off" }
Result: { "rule-a": "error", "rule-b": "error", "rule-c": "off" }
```

### Ignore Patterns
All patterns are combined (additive):
```javascript
Base: ["**/test/**"]
Override: ["**/fixtures/**"]
Result: ["**/test/**", "**/fixtures/**"]
```

### Other Fields
Later configurations replace earlier ones:
```javascript
Base: { languages: ["javascript"] }
Override: { languages: ["typescript"] }
Result: { languages: ["typescript"] }
```

## Validation Rules

- `rules[].severity` must be: `'error'`, `'warn'`, or `'off'`
- `severity.failOn` must be: `'low'`, `'medium'`, `'high'`, or `'critical'`
- `output.format` must be: `'json'`, `'text'`, `'sarif'`, or `'html'`
- `languages` must be an array of strings
- `ignore` must be an array of strings

## Implementation Summary

### Core Components

1. **ConfigLoader** - Discovers and loads configuration files
   - Supports JS, JSON, YAML formats
   - Walks up directory tree
   - Handles extends mechanism
   - Caches results

2. **ConfigValidator** - Validates configuration schema
   - Checks rule severity values
   - Validates severity levels
   - Validates output formats
   - Returns detailed error messages

3. **PathMatcher** - Matches files against ignore patterns
   - Uses minimatch for glob patterns
   - Supports dot files
   - Filters path arrays

4. **RuleFilter** - Applies rule configurations to findings
   - Filters by enabled/disabled rules
   - Applies severity overrides
   - Extracts rule options

### Preset Packages

- **@mcp-safeguard/config-recommended** - Balanced (default)
- **@mcp-safeguard/config-strict** - Maximum security
- **@mcp-safeguard/config-minimal** - Critical only

### CLI Integration

- `--config` flag for custom config path
- `--no-config` flag to disable config lookup
- `--verbose` flag to show loaded configuration
- Automatic config discovery from scan directory
- Config filtering applied to scan results

### Features Implemented

✅ Config file discovery (walk up directory tree)
✅ Multiple format support (.js, .json, .yaml)
✅ Extends mechanism with preset support
✅ Rule-level enable/disable/severity override
✅ Path ignoring with glob patterns (minimatch)
✅ Schema validation with detailed errors
✅ Environment variable overrides
✅ Configuration caching
✅ CLI integration with verbose mode
✅ Three preset packages (recommended, strict, minimal)
✅ Comprehensive test suite
✅ Complete documentation
