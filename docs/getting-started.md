# Getting Started with MCP-Safeguard

Get up and running with MCP-Safeguard in under 5 minutes.

## Installation

MCP-Safeguard requires Node.js 18+ and Semgrep. Semgrep is auto-installed on first run if it isn't already present.

### Option 1: npm

Install the published CLI package:

```bash
npm install -g @mcp-safeguard/cli
mcp-safeguard scan ./my-mcp-server
```

### Option 2: Build from source

MCP-Safeguard is a pnpm monorepo. Clone the repository and build the CLI:

```bash
git clone https://github.com/Li-Bailiang/mcp-safeguard.git
cd mcp-safeguard
pnpm install
pnpm build
node packages/cli/dist/index.js scan ./my-mcp-server
```

### Option 3: Docker

Build the image from source (no image is published to a registry yet):

```bash
docker build -t mcp-safeguard .

# Run a scan (mount the directory you want to scan at /scan)
docker run -v "$(pwd):/scan" mcp-safeguard scan /scan
```

> Container images and standalone binary downloads are not published yet. Use npm for the CLI, or build the Docker image locally from source.

## Installing Semgrep

MCP-Safeguard requires Semgrep for static analysis. MCP-Safeguard will attempt to auto-install Semgrep on first run, or you can install it manually:

```bash
# Using pip (recommended)
pip install semgrep

# Using pipx
pipx install semgrep

# Using Homebrew (macOS)
brew install semgrep

# Using Docker
docker pull semgrep/semgrep
```

Verify installation:
```bash
semgrep --version
```

## Your First Scan

Run a basic security scan on an MCP server:

```bash
mcp-safeguard scan ./my-mcp-server
```

You'll see output like:

```
Scanning: /path/to/my-mcp-server

=== Scan Summary ===

Total Findings: 8
High Severity (ERROR): 3
Medium Severity (WARNING): 5
Low Severity (INFO): 0
Risk Score: 42.50

Top Categories:
  - shadow-server: 3
  - indirect-injection: 2
  - excessive-agency: 2
  - supply-chain: 1

Scan completed in 2534ms
```

## Understanding Results

### Severity Levels

- **ERROR** (High): Critical security issues requiring immediate attention
  - Command injection vulnerabilities
  - Hardcoded credentials
  - SQL injection risks
  - Path traversal vulnerabilities

- **WARNING** (Medium): Important issues that should be reviewed
  - Missing authentication checks
  - Insecure configurations
  - Potential data leaks
  - Resource exhaustion risks

- **INFO** (Low): Informational findings for awareness
  - Code quality issues
  - Potential improvements
  - Best practice violations

### Risk Score

The risk score (0-100) is calculated based on:
- Number and severity of findings
- Impact of vulnerabilities
- Likelihood of exploitation

**Risk Levels:**
- 75-100: **CRITICAL** - Immediate action required
- 50-74: **HIGH** - Address soon
- 25-49: **MEDIUM** - Review and plan fixes
- 0-24: **LOW** - Monitor and improve gradually

### Security Categories

1. **Supply Chain**: Suspicious package usage, command injection
2. **Shadow Server**: Authentication, credentials, TLS configuration
3. **Indirect Injection**: SSRF, path traversal, prompt injection
4. **Excessive Agency**: Destructive actions without confirmation
5. **Context Overshare**: Environment exposure, credential leaks
6. **Typosquatting**: Suspicious package names
7. **DoS**: Resource exhaustion vulnerabilities

## Common Workflows

### Filter by Severity

Only show high-severity findings:

```bash
mcp-safeguard scan ./my-server --severity error
```

### Export Results

Save results to JSON for further analysis:

```bash
mcp-safeguard scan ./my-server --format json -o report.json
```

Export SARIF for CI/CD integration:

```bash
mcp-safeguard scan ./my-server --format sarif -o results.sarif
```

### Scan Multiple Directories

```bash
# Scan each package
mcp-safeguard scan ./packages/server
mcp-safeguard scan ./packages/client
```

### Ignore Files

Create a `.mcpignore` file in your project root:

```
# Ignore patterns (gitignore syntax)
node_modules/
dist/
*.test.ts
test-fixtures/
```

## Next Steps

Now that you've run your first scan, explore these topics:

1. **[CI/CD Integration](./ci-integration.md)** - Automate security scans in your pipeline
2. **[Architecture](./architecture.md)** - Understand how MCP-Safeguard works
3. **[API Reference](./api-reference.md)** - Use MCP-Safeguard programmatically
4. **[Rule Development](./rule-development.md)** - Create custom security rules
5. **[FAQ](./faq.md)** - Common questions and troubleshooting

## Quick Tips

### Run Scans Faster

Exclude test files and dependencies:

```bash
# Add to .mcpignore
__tests__/
*.test.ts
node_modules/
```

### Integrate with Pre-commit Hooks

```bash
# .git/hooks/pre-commit
#!/bin/bash
mcp-safeguard scan . --severity error || exit 1
```

### Use in Package Scripts

```json
{
  "scripts": {
    "security": "mcp-safeguard scan .",
    "security:ci": "mcp-safeguard scan . --format sarif -o results.sarif"
  }
}
```

## Getting Help

- **Documentation**: [docs/](https://github.com/Li-Bailiang/mcp-safeguard/tree/main/docs)
- **Issues**: [GitHub Issues](https://github.com/Li-Bailiang/mcp-safeguard/issues)
- **Discussions**: [GitHub Discussions](https://github.com/Li-Bailiang/mcp-safeguard/discussions)
- **Security**: See [SECURITY.md](../SECURITY.md) for vulnerability reporting

## Examples

See the [examples/](https://github.com/Li-Bailiang/mcp-safeguard/tree/main/examples) directory for:
- Sample vulnerable MCP servers
- Fixed versions with explanations
- Integration examples
- Custom rule examples
