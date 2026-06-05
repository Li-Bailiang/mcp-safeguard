# Frequently Asked Questions (FAQ)

> **Install:** MCP-Safeguard is published as `@mcp-safeguard/cli`. Install it with
> `npm install -g @mcp-safeguard/cli`, then run `mcp-safeguard scan <path>`.

## Installation Issues

### Q: Semgrep is not found after installation

**A:** Ensure Semgrep is in your PATH:

```bash
# Verify installation
semgrep --version

# If not found, check Python paths
python -m semgrep --version

# Or install with pipx (recommended)
pipx install semgrep

# Add to PATH (Linux/macOS)
export PATH="$HOME/.local/bin:$PATH"

# Windows: Add to PATH via System Environment Variables
```

**Alternatively**, MCP-Safeguard can auto-install Semgrep on first run.

### Q: Global npm install fails with "permission denied" or access errors

**A:** Permission errors during global npm installs usually mean the global npm
prefix is not writable by your user. Prefer a user-owned npm prefix, `nvm`, or
`corepack`/project-local installs instead of using `sudo` blindly:

```bash
npm config set prefix ~/.npm-global
export PATH="$HOME/.npm-global/bin:$PATH"
npm install -g @mcp-safeguard/cli
```

### Q: Python version incompatibility

**A:** Semgrep requires Python 3.7+:

```bash
# Check Python version
python --version
python3 --version

# Install compatible Python version
# Ubuntu/Debian
sudo apt install python3.10

# macOS
brew install python@3.10

# Windows - download from python.org
```

### Q: How do I invoke the CLI?

**A:** After installing from npm, use the global `mcp-safeguard` command:

```bash
mcp-safeguard scan <path>
```

If you are developing from source, build the monorepo and invoke the CLI directly:

```bash
pnpm install
pnpm build
node packages/cli/dist/index.js scan <path>
```

---

## False Positives

### Q: How do I ignore false positives?

**A:** Several options:

**1. Use .mcpignore file:**
```
# Ignore specific files
src/legacy/old-code.js
test-fixtures/

# Ignore patterns
*.test.ts
**/__mocks__/**
```

**2. Inline comments (coming soon):**
```javascript
// mcp-safeguard-ignore-next-line
eval(safeExpression);
```

**3. Configure rule severity:**
```yaml
# .mcp-safeguardrc.yaml
rules:
  mcp-suspicious-eval: off
  mcp-server-no-auth: warn
```

### Q: Rule triggers on safe code patterns

**A:** This may indicate the rule needs improvement. Please:

1. Report the false positive: [GitHub Issues](https://github.com/Li-Bailiang/mcp-safeguard/issues)
2. Include code snippet and rule ID
3. Explain why it's a false positive
4. Consider contributing a rule improvement

**Example issue:**
```markdown
**Rule:** mcp-suspicious-exec-package
**False Positive:** Triggers on execFile() which is already safe
**Code:**
```javascript
execFile('ls', ['-la'], callback); // Safe - uses argument array
```
```

### Q: Too many findings in legacy code

**A:** Use incremental approach:

```bash
# Start with critical issues only
mcp-safeguard scan . --severity error

# Scan new code only
mcp-safeguard scan src/new-features/

# Ignore legacy directories
echo "src/legacy/" >> .mcpignore
```

---

## Performance Tuning

### Q: Scans are very slow

**A:** Optimize with these strategies:

**1. Exclude unnecessary files:**
```
# .mcpignore
node_modules/
dist/
build/
coverage/
.git/
*.min.js
vendor/
```

**2. Scan specific directories:**
```bash
# Instead of scanning everything
mcp-safeguard scan src/

# Or scan in parallel
mcp-safeguard scan packages/server &
mcp-safeguard scan packages/client &
wait
```

**3. Increase memory limit:**
```bash
export NODE_OPTIONS="--max-old-space-size=4096"
```

**4. Use faster storage:**
- Run scans on SSD instead of HDD
- Exclude mounted network drives

### Q: How long should a scan take?

**A:** Typical durations:

- **Small project** (<100 files): 2-5 seconds
- **Medium project** (100-1000 files): 10-30 seconds
- **Large project** (1000+ files): 30-120 seconds
- **Monorepo** (10,000+ files): 2-10 minutes

If significantly slower, check:
- File count: `find . -type f | wc -l`
- Ignored patterns in `.mcpignore`
- System resources (CPU, disk I/O)

### Q: Can I cache scan results?

**A:** Not directly, but you can:

**1. Save baseline results:**
```bash
mcp-safeguard scan . --format json -o baseline.json
```

**2. Compare subsequent scans:**
```bash
# Future feature - compare with baseline
mcp-safeguard scan . --baseline baseline.json
```

**3. Use CI caching:**
```yaml
# GitHub Actions
- uses: actions/cache@v3
  with:
    path: ~/.cache/semgrep
    key: semgrep-${{ hashFiles('**/*.ts') }}
```

---

## Custom Rules

### Q: How do I create a custom rule?

**A:** See [Rule Development Guide](./rule-development.md). Quick example:

```yaml
rules:
  - id: my-custom-rule
    languages: [javascript, typescript]
    message: Description of the issue
    severity: ERROR
    patterns:
      - pattern: dangerousFunction(...)
    metadata:
      category: my-category
      confidence: HIGH
      impact: HIGH
      likelihood: MEDIUM
```

Save to `packages/core/rules/custom/my-rule.yml` and rebuild.

### Q: Can I use rules from other sources?

**A:** MCP-Safeguard loads its rules from `packages/core/rules/`. To add your own,
drop a `.yaml` rule file into a category there and rebuild (see "How do I create
a custom rule?" above) — the CLI does not yet take an external `--rules-path`.

For ad-hoc external rule sets, run Semgrep directly alongside MCP-Safeguard:

```bash
# Semgrep registry rules
semgrep --config "p/security-audit" .

# Your own rules directory
semgrep --config /path/to/rules/ .
```

### Q: How do I test my custom rules?

**A:** Create test fixtures:

```bash
# Create vulnerable example
mkdir -p tests/fixtures/vulnerable/
cat > tests/fixtures/vulnerable/my-test.js << 'EOF'
// Should trigger my-custom-rule
dangerousFunction(userInput);
EOF

# Test the rule
semgrep --config packages/core/rules/custom/my-rule.yml \
  tests/fixtures/vulnerable/my-test.js
```

### Q: Can I disable specific rules?

**A:** Yes, via configuration:

```yaml
# .mcp-safeguardrc.yaml
rules:
  mcp-excessive-logging: off
  mcp-debug-mode-production: warn
```

Or programmatically:
```typescript
const config = {
  rules: {
    'mcp-excessive-logging': 'off'
  }
};
```

---

## Integration Problems

### Q: GitHub Actions workflow fails

**A:** Common issues:

**1. Semgrep not installed:**
```yaml
- name: Install Semgrep
  run: pip install semgrep
```

**2. Permission issues:**
```yaml
permissions:
  contents: read
  security-events: write  # Required for SARIF upload
```

**3. Exit code handling:**
```yaml
- name: Run scan
  continue-on-error: true  # Don't fail workflow on findings
  run: mcp-safeguard scan .
```

### Q: SARIF upload fails

**A:** Ensure:

1. **Correct permissions:**
```yaml
permissions:
  security-events: write
```

2. **Valid SARIF format:**
```bash
# Verify SARIF output
mcp-safeguard scan . --format sarif -o results.sarif
cat results.sarif | jq .  # Should be valid JSON
```

3. **GitHub Advanced Security enabled** (for private repos)

### Q: GitLab CI integration not working

**A:** Check:

```yaml
# Ensure SAST report format
artifacts:
  reports:
    sast: mcp-safeguard-results.sarif

# Use correct image
image: node:18

# Install Python for Semgrep
before_script:
  - apt-get update && apt-get install -y python3 python3-pip
  - pip3 install semgrep
```

### Q: Jenkins pipeline errors

**A:** Common solutions:

```groovy
// Ensure tools are in PATH
environment {
    PATH = "${env.PATH}:/usr/local/bin"
}

// Build MCP-Safeguard from source (not yet on npm)
sh 'git clone --depth 1 https://github.com/Li-Bailiang/mcp-safeguard mcp-safeguard-src'
sh '(cd mcp-safeguard-src && npm i -g pnpm && pnpm install && pnpm build)'
sh 'python3 -m pip install semgrep'

// Handle exit codes
sh 'node mcp-safeguard-src/packages/cli/dist/index.js scan . || true'
```

---

## Configuration

### Q: Where should I put configuration files?

**A:** MCP-Safeguard looks for configuration in this order:

1. `.mcp-safeguardrc.yaml` (project root)
2. `.mcp-safeguardrc.json`
3. `mcp-safeguard.config.js`
4. Command-line arguments

**Example `.mcp-safeguardrc.yaml`:**
```yaml
version: 1

rules:
  mcp-suspicious-eval: error
  mcp-excessive-logging: warn

ignore:
  - test/**
  - docs/**

severity-threshold: error
```

### Q: Can I use multiple configuration files?

**A:** Yes, for different environments:

```bash
# Development
mcp-safeguard scan . --config .mcp-safeguard.dev.yaml

# Production
mcp-safeguard scan . --config .mcp-safeguard.prod.yaml
```

### Q: How do I configure ignore patterns?

**A:** Use `.mcpignore` file (gitignore syntax):

```
# Dependencies
node_modules/
vendor/

# Build artifacts
dist/
build/
*.min.js

# Tests
__tests__/
*.test.ts
*.spec.js

# Configuration
config/test/
```

---

## Results and Reporting

### Q: What do the severity levels mean?

**A:**

- **ERROR (High)**: Critical security issues requiring immediate attention
  - Command injection, SQL injection
  - Hardcoded credentials
  - Authentication bypass
  
- **WARNING (Medium)**: Important issues that should be reviewed
  - Missing input validation
  - Insecure configurations
  - Potential data leaks
  
- **INFO (Low)**: Informational findings
  - Code quality issues
  - Best practice violations
  - Optimization opportunities

### Q: How is the risk score calculated?

**A:** Risk score formula:

```
For each finding:
  score = severity_weight × impact_weight × likelihood_weight

Weights:
  Severity: ERROR=10, WARNING=5, INFO=1
  Impact: HIGH=3, MEDIUM=2, LOW=1
  Likelihood: HIGH=3, MEDIUM=2, LOW=1

Total = (sum of scores / max possible) × 100

Levels:
  75-100: CRITICAL
  50-74:  HIGH
  25-49:  MEDIUM
  0-24:   LOW
```

### Q: Can I export results to other formats?

**A:** Yes, multiple formats supported:

```bash
# JSON (machine-readable)
mcp-safeguard scan . --format json -o report.json

# SARIF (CI/CD integration)
mcp-safeguard scan . --format sarif -o results.sarif

# Text (human-readable, with colors)
mcp-safeguard scan . --format text -o report.txt

# HTML (interactive report)
mcp-safeguard scan . --format html -o report.html
```

### Q: How do I compare scans over time?

**A:** Save timestamped reports:

```bash
# Create reports directory
mkdir -p reports/

# Save with timestamp
DATE=$(date +%Y%m%d-%H%M%S)
mcp-safeguard scan . --format json -o "reports/scan-$DATE.json"

# Compare manually
jq '.summary.riskScore' reports/scan-20260603-*.json
```

---

## Runtime Protection

### Q: How does runtime protection work?

**A:** The Runtime SDK provides:

1. **Tool call interception**: Wraps tool functions with security checks
2. **Rate limiting**: Prevents abuse with configurable limits
3. **Prompt injection detection**: Validates user prompts
4. **Audit logging**: Records all security events
5. **Circuit breaker**: Prevents cascading failures

**Example:**
```typescript
import { MCPSafeguardRuntime } from '@mcp-safeguard/runtime';

const shield = new MCPSafeguardRuntime({
  blockDangerousTools: true,
  maxToolCallsPerMinute: 60
});

shield.init();

const safeTool = shield.wrapToolCall('myTool', originalTool);
```

### Q: Does runtime protection affect performance?

**A:** Minimal impact:

- **Validation overhead**: <1ms per tool call
- **Prompt validation**: 2-5ms per prompt
- **Audit logging**: Async, non-blocking

For high-throughput applications, consider:
- Disable logging: `logAllInteractions: false`
- Increase rate limits
- Use validation hooks selectively

### Q: Can I customize validation logic?

**A:** Yes, use validation hooks:

```typescript
const customHook = {
  async validate(context) {
    // Your custom logic
    if (context.toolName === 'admin-tool') {
      const isAdmin = await checkAdminStatus(context.metadata.userId);
      if (!isAdmin) {
        return {
          allowed: false,
          reason: 'Admin privileges required'
        };
      }
    }
    return { allowed: true };
  }
};

const shield = new MCPSafeguardRuntime({
  validationHooks: [customHook]
});
```

---

## Troubleshooting

### Q: Scan fails with "spawn ENOMEM"

**A:** Out of memory. Solutions:

```bash
# Increase Node.js memory
export NODE_OPTIONS="--max-old-space-size=8192"

# Or reduce scan scope: scan a subdirectory
mcp-safeguard scan src/

# ...and exclude noisy files via a .mcpignore file in the project root:
#   **/*.min.js
#   vendor/
```

### Q: "Rule parsing error" message

**A:** Check rule syntax:

```bash
# Validate YAML syntax
yamllint packages/core/rules/**/*.yml

# Test rule directly with Semgrep
semgrep --config path/to/rule.yml --validate
```

### Q: Results are empty but code has issues

**A:** Verify:

1. **File extensions are recognized:**
```bash
# Check language detection
semgrep --config auto src/file.ts
```

2. **Files aren't ignored:**
```bash
# Check .mcpignore
cat .mcpignore
```

3. **Rules are loaded:**
```bash
# List loaded rules
mcp-safeguard scan . --format json | jq '.metadata.rulesVersion'
```

### Q: UTF-8 encoding errors

**A:** Already fixed in MCP-Safeguard, but if you see issues:

```bash
# Set encoding environment variables
export PYTHONUTF8=1
export PYTHONIOENCODING=utf-8

# Re-run scan
mcp-safeguard scan .
```

---

## Best Practices

### Q: When should I run scans?

**A:** Recommended workflow:

1. **Pre-commit hook**: Catch issues early
```bash
# .git/hooks/pre-commit
mcp-safeguard scan . --severity error || exit 1
```

2. **Pull request**: Review security before merge
3. **Daily scheduled**: Monitor for new vulnerabilities
4. **Pre-deployment**: Final check before production

### Q: How do I prioritize findings?

**A:** Focus on:

1. **High severity first** (ERROR level)
2. **High impact + high likelihood** combinations
3. **Categories most relevant** to your application:
   - Public servers → Shadow Server, Indirect Injection
   - Tool-heavy → Excessive Agency, Supply Chain
   - Data-intensive → Context Overshare

### Q: Should I block builds on findings?

**A:** Recommended approach:

```bash
# Block on critical issues only
mcp-safeguard scan . --severity error || exit 1

# Report warnings but don't fail
mcp-safeguard scan . --severity warning || true
```

Or use risk score threshold:
```bash
RISK=$(mcp-safeguard scan . --format json | jq '.summary.riskScore')
if [ "$RISK" -gt 50 ]; then
  echo "Risk score too high: $RISK"
  exit 1
fi
```

---

## Getting Help

### Q: Where can I get support?

**A:**

- **Documentation**: [docs/](https://github.com/Li-Bailiang/mcp-safeguard/tree/main/docs)
- **GitHub Issues**: [Report bugs](https://github.com/Li-Bailiang/mcp-safeguard/issues)
- **GitHub Discussions**: [Ask questions](https://github.com/Li-Bailiang/mcp-safeguard/discussions)
- **Security Issues**: See [SECURITY.md](../SECURITY.md)

### Q: How do I report a bug?

**A:** Include:

1. MCP-Safeguard version: `mcp-safeguard --version`
2. Semgrep version: `semgrep --version`
3. Node.js version: `node --version`
4. Operating system
5. Error message or unexpected behavior
6. Minimal reproduction steps

### Q: How can I contribute?

**A:** See [CONTRIBUTING.md](../CONTRIBUTING.md):

- Report bugs and false positives
- Suggest new rules
- Improve documentation
- Submit pull requests
- Share usage examples

---

## Advanced Topics

### Q: Can I use MCP-Safeguard as a library?

**A:** Yes! See [API Reference](./api-reference.md):

```typescript
import { Scanner, Reporter } from '@mcp-safeguard/core';

const scanner = new Scanner();
const result = await scanner.scan('./my-project');

console.log(`Risk score: ${result.summary.riskScore}`);
```

### Q: How do I integrate with custom CI systems?

**A:** Use JSON output and exit codes:

```bash
#!/bin/bash
mcp-safeguard scan . --format json -o results.json

ERRORS=$(jq '.summary.bySeverity.ERROR' results.json)

if [ "$ERRORS" -gt 0 ]; then
  echo "Security scan failed"
  exit 1
fi
```

### Q: Can I extend MCP-Safeguard with plugins?

**A:** Plugin system is planned. Currently, you can:

1. Add custom rules (YAML)
2. Use programmatic API
3. Add validation hooks (Runtime SDK)
4. Fork and modify source code

---

## License and Legal

### Q: What license is MCP-Safeguard under?

**A:** MIT License - see [LICENSE](../LICENSE)

### Q: Can I use MCP-Safeguard commercially?

**A:** Yes, MIT license allows commercial use.

### Q: Are the security rules accurate?

**A:** Rules are best-effort and continuously improved. Always:
- Review findings manually
- Test fixes thoroughly
- Consider security audits for critical applications
- Report false positives to improve accuracy

### Q: Does MCP-Safeguard guarantee security?

**A:** No security tool provides 100% coverage. MCP-Safeguard:
- Detects common vulnerabilities
- Follows OWASP and CWE standards
- Complements other security practices
- Should be part of defense-in-depth strategy
