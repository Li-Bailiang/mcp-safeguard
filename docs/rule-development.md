# Rule Development Guide

Learn how to create, test, and contribute custom security rules for MCP-Safeguard.

## Overview

MCP-Safeguard uses Semgrep for pattern-based static analysis. Rules are written in YAML and use Semgrep's powerful pattern matching syntax.

## Rule Structure

### Basic Rule Template

```yaml
rules:
  - id: mcp-rule-name
    languages: [javascript, typescript, python]
    message: |
      Clear description of the security issue and why it matters.
      Explain the risk and potential impact.
    severity: ERROR  # ERROR, WARNING, or INFO
    patterns:
      - pattern: dangerous_function(...)
    metadata:
      category: category-name
      subcategory: [specific-issue]
      confidence: HIGH    # HIGH, MEDIUM, LOW
      impact: HIGH        # HIGH, MEDIUM, LOW
      likelihood: MEDIUM  # HIGH, MEDIUM, LOW
      cwe:
        - "CWE-78"
      owasp:
        - "A03:2021"
      references:
        - https://owasp.org/...
      technology:
        - mcp
        - nodejs
```

### Rule Components

#### 1. ID (Required)
Unique identifier for the rule. Convention: `mcp-{category}-{issue-name}`

```yaml
id: mcp-supply-chain-command-injection
```

#### 2. Languages (Required)
Supported languages: `javascript`, `typescript`, `python`, `go`, `java`, `ruby`, `php`

```yaml
languages: [javascript, typescript]
```

#### 3. Message (Required)
Human-readable description of the issue. Should be clear and actionable.

```yaml
message: |
  Command injection vulnerability detected. User input is passed to exec()
  without sanitization, allowing arbitrary command execution.
  
  Recommendation: Use execFile() with argument arrays or validate input.
```

#### 4. Severity (Required)
- **ERROR**: Critical security issues requiring immediate action
- **WARNING**: Important issues that should be reviewed
- **INFO**: Informational findings for awareness

```yaml
severity: ERROR
```

#### 5. Patterns (Required)
Semgrep patterns that match vulnerable code. See pattern syntax below.

#### 6. Metadata (Required)
Additional context for scoring and categorization:

```yaml
metadata:
  category: supply-chain          # Main category
  subcategory: [command-injection] # Specific issues
  confidence: HIGH                 # Detection accuracy
  impact: HIGH                     # Damage if exploited
  likelihood: MEDIUM               # Probability of exploitation
  cwe: ["CWE-78"]                 # Common Weakness Enumeration
  owasp: ["A03:2021"]             # OWASP Top 10 reference
  references:                      # Learning resources
    - https://cwe.mitre.org/data/definitions/78.html
  technology: [mcp, nodejs]        # Relevant technologies
```

## Semgrep Pattern Syntax

### Basic Patterns

#### Simple Pattern Matching
```yaml
patterns:
  - pattern: eval($X)  # Matches any eval() call
```

#### Multiple Patterns (AND logic)
```yaml
patterns:
  - pattern: exec($CMD)
  - pattern-not: exec("fixed-string")  # Exclude safe cases
```

#### Pattern Either (OR logic)
```yaml
patterns:
  - pattern-either:
      - pattern: eval($X)
      - pattern: Function($X)
```

### Metavariables

Metavariables (like `$X`, `$CMD`) match any expression:

```yaml
# Matches: exec(userInput), exec(req.body.cmd), etc.
pattern: exec($CMD)
```

#### Metavariable Comparison
```yaml
patterns:
  - pattern: if ($X) { return $X; }
  - metavariable-comparison:
      metavariable: $X
      comparison: $X == "dangerous-value"
```

#### Metavariable Regex
```yaml
patterns:
  - pattern: import $MODULE
  - metavariable-regex:
      metavariable: $MODULE
      regex: ^(eval|vm|child_process)$
```

### Advanced Patterns

#### Pattern Inside
Find patterns within a specific context:

```yaml
patterns:
  - pattern: $TOOL(...)
  - pattern-inside: |
      server.addTool({
        name: $NAME,
        execute: ($ARGS) => {
          ...
        }
      })
```

#### Pattern Not Inside
Exclude patterns in certain contexts:

```yaml
patterns:
  - pattern: fetch($URL)
  - pattern-not-inside: |
      if (isValidUrl($URL)) {
        ...
      }
```

#### Focus Metavariable
Highlight specific part of matched code:

```yaml
patterns:
  - pattern: exec($CMD, ...)
  - focus-metavariable: $CMD
```

### Taint Analysis

Track data flow from source to sink:

```yaml
mode: taint
pattern-sources:
  - pattern: req.body.$FIELD
  - pattern: req.query.$FIELD
pattern-sinks:
  - pattern: exec($CMD)
  - pattern: eval($CODE)
pattern-sanitizers:
  - pattern: sanitize($X)
  - pattern: validate($X)
```

## Example Rules

### Example 1: Command Injection

```yaml
rules:
  - id: mcp-command-injection
    languages: [javascript, typescript]
    message: |
      Command injection vulnerability. User input is passed to child_process.exec()
      without proper sanitization, allowing arbitrary command execution.
      
      Fix: Use execFile() with argument arrays, or sanitize input with allowlists.
    severity: ERROR
    mode: taint
    pattern-sources:
      - pattern: req.body.$FIELD
      - pattern: req.query.$FIELD
      - pattern: req.params.$FIELD
    pattern-sinks:
      - pattern: exec($CMD, ...)
      - pattern: spawn($CMD, ..., {shell: true})
    pattern-sanitizers:
      - pattern: shellEscape($X)
      - pattern: validator.escape($X)
    metadata:
      category: supply-chain
      subcategory: [command-injection]
      confidence: HIGH
      impact: HIGH
      likelihood: HIGH
      cwe: ["CWE-78"]
      owasp: ["A03:2021"]
      references:
        - https://owasp.org/www-community/attacks/Command_Injection
```

### Example 2: Missing Authentication

```yaml
rules:
  - id: mcp-server-no-auth
    languages: [javascript, typescript]
    message: |
      MCP server is exposed without authentication. This allows unauthorized
      access to server tools and resources.
      
      Fix: Add authentication middleware before initializing the server.
    severity: ERROR
    patterns:
      - pattern-either:
          - pattern: |
              const server = new Server(...)
              ...
              server.connect($TRANSPORT)
          - pattern: |
              createServer({
                ...,
              })
      - pattern-not-inside: |
          server.use(authenticate(...))
          ...
      - pattern-not-inside: |
          if ($AUTH) {
            ...
          }
    metadata:
      category: shadow-server
      subcategory: [missing-authentication]
      confidence: MEDIUM
      impact: HIGH
      likelihood: HIGH
      cwe: ["CWE-306"]
      owasp: ["A07:2021"]
```

### Example 3: Path Traversal

```yaml
rules:
  - id: mcp-path-traversal
    languages: [javascript, typescript]
    message: |
      Path traversal vulnerability. User input is used in file paths without
      validation, allowing access to arbitrary files.
      
      Fix: Validate paths, use path.join() with base directory, check for ".."
    severity: ERROR
    mode: taint
    pattern-sources:
      - pattern: req.body.$FIELD
      - pattern: req.query.$FIELD
      - pattern: process.argv[...]
    pattern-sinks:
      - pattern: fs.readFile($PATH, ...)
      - pattern: fs.readFileSync($PATH, ...)
      - pattern: fs.createReadStream($PATH, ...)
    pattern-sanitizers:
      - pattern: path.resolve(basePath, $PATH)
      - pattern: validatePath($PATH)
    metadata:
      category: indirect-injection
      subcategory: [path-traversal]
      confidence: HIGH
      impact: HIGH
      likelihood: MEDIUM
      cwe: ["CWE-22"]
      owasp: ["A01:2021"]
```

### Example 4: Prompt Injection

```yaml
rules:
  - id: mcp-prompt-injection-risk
    languages: [javascript, typescript]
    message: |
      External content is included in LLM prompt without sanitization.
      This enables prompt injection attacks.
      
      Fix: Sanitize external content, use structured prompts, validate sources.
    severity: ERROR
    patterns:
      - pattern-either:
          - pattern: |
              const $DATA = await fetch($URL)
              ...
              llm.complete(`... ${$DATA} ...`)
          - pattern: |
              const $CONTENT = fs.readFileSync($PATH)
              ...
              prompt.format({..., data: $CONTENT})
      - pattern-not-inside: |
          const sanitized = sanitizePrompt($DATA)
          ...
    metadata:
      category: indirect-injection
      subcategory: [prompt-injection]
      confidence: MEDIUM
      impact: HIGH
      likelihood: MEDIUM
      cwe: ["CWE-74"]
      references:
        - https://simonwillison.net/2023/Apr/14/worst-that-can-happen/
```

## Testing Rules

### 1. Create Test Fixtures

Create both vulnerable and safe code examples:

**Vulnerable example** (`tests/fixtures/vulnerable/command-injection.js`):
```javascript
const { exec } = require('child_process');

function runCommand(userInput) {
  // Should trigger: mcp-command-injection
  exec(`ls ${userInput}`, (error, stdout) => {
    console.log(stdout);
  });
}
```

**Safe example** (`tests/fixtures/safe/command-injection.js`):
```javascript
const { execFile } = require('child_process');

function runCommand(userInput) {
  // Should NOT trigger: using execFile with args array
  execFile('ls', [userInput], (error, stdout) => {
    console.log(stdout);
  });
}
```

### 2. Run Tests

```bash
# Test your rule against fixtures
semgrep --config packages/core/rules/supply-chain/mcp-command-injection.yml \
  tests/fixtures/vulnerable/

# Should detect issues
# Expected: 1 finding

semgrep --config packages/core/rules/supply-chain/mcp-command-injection.yml \
  tests/fixtures/safe/

# Should be clean
# Expected: 0 findings
```

### 3. Test with MCP-Safeguard

```bash
# Build and test
pnpm build
mcp-safeguard scan tests/fixtures/vulnerable/
```

### 4. Automated Testing

Create test specs (`packages/core/rules/__tests__/supply-chain.test.ts`):

```typescript
import { Scanner } from '../src/scanner';
import { resolve } from 'path';

describe('Supply Chain Rules', () => {
  it('should detect command injection', async () => {
    const scanner = new Scanner();
    const result = await scanner.scan(
      resolve(__dirname, '../../tests/fixtures/vulnerable/command-injection.js')
    );
    
    expect(result.findings).toHaveLength(1);
    expect(result.findings[0].check_id).toBe('mcp-command-injection');
    expect(result.findings[0].severity).toBe('ERROR');
  });

  it('should not flag safe code', async () => {
    const scanner = new Scanner();
    const result = await scanner.scan(
      resolve(__dirname, '../../tests/fixtures/safe/command-injection.js')
    );
    
    expect(result.findings).toHaveLength(0);
  });
});
```

## Rule Quality Checklist

Before submitting a rule, verify:

### Accuracy
- [ ] Rule detects the intended vulnerability
- [ ] No false positives on safe code
- [ ] No false negatives on vulnerable code
- [ ] Tested with at least 5 real-world examples

### Documentation
- [ ] Clear, actionable message
- [ ] Explains why the issue matters
- [ ] Provides fix recommendations
- [ ] Includes CWE and OWASP references
- [ ] Links to learning resources

### Metadata
- [ ] Correct category and subcategory
- [ ] Appropriate severity level
- [ ] Realistic confidence rating
- [ ] Impact and likelihood assessed
- [ ] All relevant technologies listed

### Code Quality
- [ ] Follows naming conventions
- [ ] Uses appropriate pattern syntax
- [ ] Optimized for performance
- [ ] Comments explain complex patterns
- [ ] YAML syntax is valid

### Testing
- [ ] Vulnerable test case created
- [ ] Safe test case created
- [ ] Edge cases covered
- [ ] Automated tests pass
- [ ] Manual testing completed

## Performance Tips

### Optimize Pattern Matching

**Slow:**
```yaml
# Searches entire codebase for any function call
patterns:
  - pattern: $F(...)
  - metavariable-regex:
      metavariable: $F
      regex: ^(eval|exec)$
```

**Fast:**
```yaml
# Direct pattern matching
patterns:
  - pattern-either:
      - pattern: eval(...)
      - pattern: exec(...)
```

### Limit Language Scope

Only specify languages where the rule applies:

```yaml
# Instead of all languages
languages: [javascript, typescript]

# Don't use
languages: [javascript, typescript, python, go, java, ruby, php]
```

### Use Pattern-Not Wisely

Avoid complex exclusions that require full code analysis:

```yaml
# Good: Simple exclusion
patterns:
  - pattern: eval($X)
  - pattern-not: eval("fixed-string")

# Slow: Complex exclusion
patterns:
  - pattern: eval($X)
  - pattern-not-inside: |
      function complexFunction(...) {
        ...
      }
```

## Contributing Rules

### Submission Process

1. **Create rule file**: `packages/core/rules/{category}/{rule-name}.yml`
2. **Add test fixtures**: `tests/fixtures/vulnerable/` and `tests/fixtures/safe/`
3. **Write tests**: `packages/core/rules/__tests__/`
4. **Update documentation**: Add to `docs/rules.md`
5. **Submit PR**: Include description and examples

### PR Template

```markdown
## New Rule: mcp-rule-name

**Category**: supply-chain
**Severity**: ERROR

### Description
Brief description of the vulnerability detected.

### Example Vulnerable Code
```javascript
// Vulnerable code example
```

### Example Fix
```javascript
// Fixed code example
```

### Testing
- [x] Test fixtures created
- [x] Automated tests pass
- [x] Manual testing completed
- [x] Documentation updated

### Checklist
- [x] Rule quality checklist completed
- [x] No false positives in test suite
- [x] Performance is acceptable
```

## Resources

### Semgrep Documentation
- [Semgrep Pattern Syntax](https://semgrep.dev/docs/writing-rules/pattern-syntax/)
- [Semgrep Rule Examples](https://semgrep.dev/docs/writing-rules/rule-ideas/)
- [Taint Analysis](https://semgrep.dev/docs/writing-rules/data-flow/taint-mode/)
- [Metavariables](https://semgrep.dev/docs/writing-rules/pattern-syntax/#metavariables)

### Security Resources
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [CWE List](https://cwe.mitre.org/data/index.html)
- [MCP Security Best Practices](https://modelcontextprotocol.io/docs/security)

### MCP-Safeguard
- [Existing Rules](https://github.com/Li-Bailiang/mcp-safeguard/tree/main/packages/core/rules)
- [Test Fixtures](https://github.com/Li-Bailiang/mcp-safeguard/tree/main/tests/fixtures)
- [Contributing Guide](../CONTRIBUTING.md)

## Common Patterns

### Check for Missing Validation

```yaml
patterns:
  - pattern: dangerousFunction($INPUT)
  - pattern-not-inside: |
      if (validate($INPUT)) {
        ...
      }
```

### Detect Hardcoded Secrets

```yaml
patterns:
  - pattern-either:
      - pattern: password = "..."
      - pattern: apiKey = "..."
  - metavariable-regex:
      metavariable: $VALUE
      regex: ^[A-Za-z0-9+/=]{20,}$
```

### Find Unvalidated User Input

```yaml
mode: taint
pattern-sources:
  - pattern: req.body.$F
  - pattern: req.query.$F
pattern-sinks:
  - pattern: dangerousFunction($X)
```

## FAQ

**Q: How do I debug a rule that isn't working?**
A: Use `semgrep --config your-rule.yml --debug` to see matching details.

**Q: Can rules span multiple files?**
A: No, Semgrep analyzes files independently. Use taint mode for intra-file data flow.

**Q: How do I handle language-specific syntax?**
A: Create separate rules for each language with appropriate patterns.

**Q: What if my rule is too slow?**
A: Simplify patterns, limit language scope, and avoid complex exclusions.

**Q: How do I test for false positives?**
A: Create diverse safe code examples and verify no findings are reported.
