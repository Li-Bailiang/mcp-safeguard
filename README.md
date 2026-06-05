# MCP-Safeguard

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![CI Status](https://github.com/Li-Bailiang/mcp-safeguard/workflows/CI/badge.svg)](https://github.com/Li-Bailiang/mcp-safeguard/actions/workflows/ci.yml)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3%2B-blue.svg)](https://www.typescriptlang.org/)

**A security scanner for Model Context Protocol (MCP) servers, built on Semgrep.**

Protect your MCP servers with static analysis, runtime protection, and a curated set of MCP-focused security rules plus general-purpose SAST. MCP-Safeguard ships **170 security rules** — 82 MCP/JS/Python/config rules (including dedicated MCP-threat rules for tool poisoning, rug-pulls, cross-server shadowing, and credential passthrough) plus 88 general-purpose Go/Java/Rust SAST rules.

### Who is this for?

- **You're building an MCP server** — run a pre-commit self-check to catch command injection, hardcoded secrets, prompt-injection sinks, and over-broad tool permissions before they ship.
- **Your team installs third-party MCP servers** — audit an unfamiliar server for tool poisoning, rug-pulls, and credential passthrough *before* you connect it to an agent that can act on your behalf.
- **You run CI** — wire the scan into a pull-request gate that fails on high-severity findings and uploads SARIF to GitHub's Security tab.

If any of those sound like you, the [Quick Start](#-quick-start) below gets you a first scan in under a minute.

---

## ⚡ Quick Start

```bash
npm install -g @mcp-safeguard/cli
mcp-safeguard scan ./my-mcp-server
```

On its first run, MCP-Safeguard will download/install Semgrep if it isn't already available.

---

## 🎯 Feature Highlights

✨ **MCP-Focused + General SAST** - 170 rules: 82 MCP/JS/Python/config plus 88 general-purpose Go/Java/Rust SAST  
🚀 **Built on Semgrep** - Downloads/installs Semgrep on first run if needed  
🎨 **Beautiful Output** - Colored tables, clear actionable results  
🔒 **Runtime Protection** - SDK for active security during execution  
🤖 **CI/CD Ready** - GitHub Actions, GitLab, Jenkins, Azure DevOps  
📊 **Risk Scoring** - Weighted 0-100 risk assessment  
🌍 **Multi-Language** - JavaScript, TypeScript, Python, Go, Java, Rust  
🐳 **Docker Support** - Build a container from source  
📝 **Multiple Formats** - JSON, SARIF, Text, and HTML reports

---

## 📊 Example Scan Output

Real output from scanning a deliberately vulnerable MCP server (the
`vulnerable-extended` fixture in this repo):

![MCP-Safeguard scan output](./docs/images/demo.png)

<details>
<summary>Prefer plain text? Show the same scan output (findings truncated to the first few rows; the real scan reports all 18)</summary>

```
┌────────────┬────────────────────┬──────────────────────────────┬────────┬──────────────────────────────────────────────────┐
│ Severity   │ Category           │ File                         │ Line   │ Message                                          │
├────────────┼────────────────────┼──────────────────────────────┼────────┼──────────────────────────────────────────────────┤
│ [!] ERROR  │ supply-chain       │ index.js                     │ 2      │ Suspicious use of child_process exec functions   │
│            │                    │                              │        │ without proper sanitization                      │
├────────────┼────────────────────┼──────────────────────────────┼────────┼──────────────────────────────────────────────────┤
│ [!] ERROR  │ supply-chain       │ index.js                     │ 13     │ Dangerous use of eval() function                 │
├────────────┼────────────────────┼──────────────────────────────┼────────┼──────────────────────────────────────────────────┤
│ [*]        │ supply-chain       │ index.js                     │ 17     │ Use of vm.runInNewContext with untrusted code    │
│ WARNING    │                    │                              │        │                                                  │
├────────────┼────────────────────┼──────────────────────────────┼────────┼──────────────────────────────────────────────────┤
│ [!] ERROR  │ shadow-server      │ index.js                     │ 28     │ Hardcoded credentials in MCP configuration       │
├────────────┼────────────────────┼──────────────────────────────┼────────┼──────────────────────────────────────────────────┤
│ [!] ERROR  │ excessive-agency   │ index.js                     │ 34     │ Automatic file deletion without confirmation     │
└────────────┴────────────────────┴──────────────────────────────┴────────┴──────────────────────────────────────────────────┘

  ... plus 13 more findings in server.py and index.js (SSL verification
  disabled, environment-variable exposure, shell=True subprocess, SSRF, … )

=== Scan Summary ===

┌───────────────────────────┬───────┐
│ Total Findings            │ 18    │
├───────────────────────────┼───────┤
│ High Severity (ERROR)     │ 13    │
├───────────────────────────┼───────┤
│ Medium Severity (WARNING) │ 5     │
├───────────────────────────┼───────┤
│ Low Severity (INFO)       │ 0     │
├───────────────────────────┼───────┤
│ Risk Score                │ 62.00 │
└───────────────────────────┴───────┘

Top Categories:
  - supply-chain: 5
  - shadow-server: 5
  - excessive-agency: 3
  - indirect-injection: 2
  - dos: 2

Scan completed in 29056ms
```

</details>

> Exit code is **1** when any finding meets the fail-on threshold (default: `high`/ERROR), so the scan doubles as a CI gate. A clean scan prints `✓ No security issues found!` and exits `0`.

---

## 🚀 Installation

### npm

```bash
npm install -g @mcp-safeguard/cli
mcp-safeguard scan .
```

### From Source (requires pnpm)

```bash
git clone https://github.com/Li-Bailiang/mcp-safeguard
cd mcp-safeguard
pnpm install
pnpm build
node packages/cli/dist/index.js scan .
```

### Docker

Build the image from source:

```bash
docker build -t mcp-safeguard .
docker run -v $(pwd):/workspace mcp-safeguard scan /workspace
```

**Prerequisites:** Semgrep — MCP-Safeguard downloads/installs it on first run if it is not already present.

---

## 📖 Usage

### Basic Scanning

```bash
# Scan current directory (downloads/installs Semgrep on first run if needed)
mcp-safeguard scan .

# Scan specific directory
mcp-safeguard scan ./packages/server

# Filter by severity
mcp-safeguard scan . --severity error
```

### Output Formats

```bash
# JSON for programmatic use
mcp-safeguard scan . --format json -o report.json

# SARIF for CI/CD integration
mcp-safeguard scan . --format sarif -o results.sarif

# Text with colors (default)
mcp-safeguard scan . --format text
```

### Ignore Files

Create `.mcpignore` in your project root:

```
# gitignore-style patterns
node_modules/
dist/
build/
*.test.ts
test-fixtures/
**/__mocks__/
```

---

## 🛡️ Security Categories

MCP-Safeguard ships **170 security rules** in total: **82 MCP/JS/Python/config rules** plus **88 general-purpose Go/Java/Rust SAST rules**. The MCP-focused rules are organized into **8 categories** (the Go/Java/Rust SAST packs are documented in the [rules reference](./docs/rules.md)):

### 1. MCP Threats (6 rules)
Detect attacks specific to the Model Context Protocol — these inspect the modern `McpServer.tool()` / `registerTool()` API, not just variable names
- ❌ Tool poisoning — hidden instructions in a tool description
- ❌ Rug-pull — tool description computed at runtime (can change after approval)
- ❌ Cross-server shadowing — a description that overrides another server's tools
- ❌ Credential passthrough — forwarding a server secret into an outbound request

### 2. Supply Chain (6 rules)
Detect malicious package usage and injection risks
- ❌ Command injection via `exec()`, `eval()`
- ❌ Dynamic imports with user input
- ❌ Unsafe subprocess calls (Python)

### 3. Shadow Server (11 rules)
Catch insecure MCP server configurations
- ❌ Missing authentication checks
- ❌ Hardcoded credentials in code
- ❌ Disabled TLS verification
- ❌ Unrestricted CORS policies
- ❌ Debug mode in production

### 4. Indirect Injection (8 rules)
Find external content handling vulnerabilities
- ❌ SSRF (Server-Side Request Forgery)
- ❌ Path traversal attacks
- ❌ Prompt injection risks
- ❌ SQL injection vulnerabilities
- ❌ XML external entity attacks

### 5. Excessive Agency (8 rules)
Identify autonomous actions without validation
- ❌ Destructive operations without user confirmation
- ❌ Automatic code execution
- ❌ Unrestricted file writes
- ❌ Unrestricted network access

### 6. Context Overshare (7 rules)
Prevent excessive data exposure
- ❌ Environment variable leaks
- ❌ Credentials in logs or prompts
- ❌ Excessive file system access
- ❌ PII (Personally Identifiable Information) exposure

### 7. Typosquatting (4 rules)
Detect package name confusion attacks
- ❌ Package names similar to popular MCP packages
- ❌ Homoglyph characters in names
- ❌ Namespace confusion attacks

### 8. DoS (Denial of Service) (7 rules)
Prevent resource exhaustion vulnerabilities
- ❌ Unbounded loops without limits
- ❌ Uncontrolled recursion
- ❌ Large file processing without size checks
- ❌ ReDoS (Regular Expression DoS)
- ❌ Uncontrolled memory allocation

📘 **[Complete Rule Documentation](./docs/rules.md)**

---

## 🔌 Runtime Protection SDK

Add active security to your running MCP server:

```typescript
import { MCPSafeguardRuntime } from '@mcp-safeguard/runtime';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';

// Initialize runtime protection
const shield = new MCPSafeguardRuntime({
  blockDangerousTools: true,           // Block dangerous operations
  maxToolCallsPerMinute: 60,           // Rate limiting
  promptInjectionDetection: true,      // Detect prompt injection
  auditLogPath: './logs/audit.log',    // Security event logging
  circuitBreakerThreshold: 5           // Failure threshold
});

shield.init();

// Create MCP server
const server = new Server({
  name: 'protected-server',
  version: '1.0.0'
});

// Wrap tool functions with security checks
server.setRequestHandler('tools/call', async (request) => {
  const { name, arguments: args } = request.params;
  
  // Wrap with protection
  const safeTool = shield.wrapToolCall(name, async (args) => {
    // Your tool implementation
    return executeToolLogic(name, args);
  });
  
  try {
    const result = await safeTool(args);
    return { content: [{ type: 'text', text: JSON.stringify(result) }] };
  } catch (error) {
    // Tool blocked by MCP-Safeguard
    throw new Error(`Security check failed: ${error.message}`);
  }
});

// Validate prompts before sending to LLM
server.setRequestHandler('prompts/get', async (request) => {
  const promptText = generatePrompt(request.params);
  
  const validation = shield.validatePrompt(promptText);
  if (!validation.allowed) {
    throw new Error(`Prompt injection detected: ${validation.reason}`);
  }
  
  return { messages: [{ role: 'user', content: { type: 'text', text: promptText } }] };
});

// Graceful shutdown with audit log flushing
process.on('SIGINT', async () => {
  await shield.shutdown();
  process.exit(0);
});
```

**Runtime SDK Features:**
- ✅ Tool call interception and validation
- ✅ Rate limiting (prevent DoS)
- ✅ Prompt injection detection
- ✅ Audit logging (complete event trail)
- ✅ Circuit breaker (prevent cascading failures)
- ✅ Custom validation hooks
- ✅ Real-time metrics

📘 **[Runtime SDK Documentation](./docs/api-reference.md#runtime-sdk-api)**

---

## 🤖 CI/CD Integration

> Install the published CLI in CI with `npm install -g @mcp-safeguard/cli`, then run `mcp-safeguard scan ...`.

### GitHub Actions

Use the composite action shipped in this repo — it builds the CLI from source, runs the scan, uploads SARIF to GitHub Security, and fails the job on the chosen severity:

```yaml
name: MCP Security Scan

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

permissions:
  contents: read
  security-events: write

jobs:
  security-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: Li-Bailiang/mcp-safeguard@main
        with:
          fail-on-severity: high   # high | medium | low
          working-directory: '.'
```

### GitLab CI

```yaml
mcp-security-scan:
  stage: security
  image: node:20
  before_script:
    - npm install -g @mcp-safeguard/cli
  script:
    - mcp-safeguard scan . --format sarif -o results.sarif
  artifacts:
    reports:
      sast: results.sarif
    paths:
      - results.sarif
    expire_in: 30 days
```

### Jenkins

```groovy
pipeline {
    agent any
    stages {
        stage('Security Scan') {
            steps {
                sh 'npm install -g @mcp-safeguard/cli'
                sh 'mcp-safeguard scan . -f sarif -o results.sarif'
            }
        }
    }
    post {
        always {
            recordIssues(tools: [sarif(pattern: 'results.sarif')])
        }
    }
}
```

### Azure DevOps

```yaml
- task: NodeTool@0
  inputs:
    versionSpec: '18.x'

- script: |
    npm install -g @mcp-safeguard/cli
    mcp-safeguard scan $(Build.SourcesDirectory) -f sarif -o results.sarif
  displayName: 'MCP Security Scan'

- task: PublishSecurityAnalysisLogs@3
  inputs:
    ArtifactName: 'CodeAnalysisLogs'
```

📘 **[Complete CI/CD Integration Guide](./docs/ci-integration.md)**

---

## 📊 Real-World Example

### Before MCP-Safeguard

```typescript
// ❌ Multiple security vulnerabilities
import { exec } from 'child_process';

server.setRequestHandler('tools/call', async (request) => {
  const { name, arguments: args } = request.params;
  
  // No authentication
  // No input validation
  // Command injection vulnerability
  exec(`ls ${args.path}`, (error, stdout) => {
    return stdout;
  });
});
```

**MCP-Safeguard Detection:**
- 🔴 ERROR: Missing authentication check
- 🔴 ERROR: Command injection via exec()
- 🔴 ERROR: Unvalidated user input in shell command

### After MCP-Safeguard

```typescript
// ✅ Secure implementation
import { execFile } from 'child_process';
import { validatePath, isAuthenticated } from './security';

server.setRequestHandler('tools/call', async (request) => {
  const { name, arguments: args } = request.params;
  
  // Authentication check
  if (!isAuthenticated(request)) {
    throw new Error('Unauthorized: Authentication required');
  }
  
  // Input validation
  const safePath = validatePath(args.path);
  if (!safePath) {
    throw new Error('Invalid path: Path traversal detected');
  }
  
  // Safe execution with argument array (not shell)
  return new Promise((resolve, reject) => {
    execFile('ls', ['-la', safePath], (error, stdout) => {
      if (error) reject(error);
      else resolve(stdout);
    });
  });
});
```

**MCP-Safeguard Result:**
- ✅ All security checks passed
- ✅ Risk score: 0/100 (LOW)

---

## 🌟 Language Support

| Language | Coverage | Rules |
|----------|----------|-------|
| **JavaScript / TypeScript** | MCP-specific threat packs + general patterns | `exec()`/`eval()`, CORS, auth, injection, agency, DoS |
| **Python** | MCP-specific threat packs (`mcp-python-*`) + general patterns | `subprocess`, `eval()`, SSRF, env exposure |
| **Go** | General-purpose SAST | 27 (concurrency, injection, TLS, crypto) |
| **Java** | General-purpose SAST | 32 (SQLi, XXE, deserialization, LDAP) |
| **Rust** | General-purpose SAST | 29 (`unsafe`, crypto, error handling) |
| **Infrastructure** | Config / IaC | 25 (Dockerfile, Kubernetes, MCP config) |

> The Go/Java/Rust packs are general-purpose static-analysis rules, not MCP-specific. They run only when files of that language are present in the scan target.

---

## 💡 Why MCP-Safeguard?

### vs Other Security Tools

| Feature | MCP-Safeguard | Snyk | SonarQube | Semgrep OSS | LLM Guard |
|---------|------------|------|-----------|-------------|-----------|
| **MCP-Specific Rules** | ✅ 57 | ❌ | ❌ | ❌ | ⚠️ |
| **Runtime Protection** | ✅ | ❌ | ❌ | ❌ | ✅ |
| **Static Analysis** | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Zero Config** | ✅ | ⚠️ | ⚠️ | ✅ | ⚠️ |
| **Price** | **Free** | Paid | Community/Paid | Free | Free |
| **Offline Mode** | ✅ | ❌ | ⚠️ | ✅ | ✅ |
| **CI/CD Integration** | ✅ | ✅ | ✅ | ✅ | ⚠️ |

📘 **[Detailed Comparison](./docs/comparison.md)**

**MCP-Safeguard is the only tool purpose-built for MCP servers.**

---

## 📚 Documentation

📖 **[Getting Started Guide](./docs/getting-started.md)** - First scan in 5 minutes  
🏗️ **[Architecture Overview](./docs/architecture.md)** - System design and components  
🔧 **[Rule Development](./docs/rule-development.md)** - Create custom security rules  
📋 **[API Reference](./docs/api-reference.md)** - Programmatic usage  
🤖 **[CI/CD Integration](./docs/ci-integration.md)** - Automate security scans  
❓ **[FAQ](./docs/faq.md)** - Common questions and troubleshooting  
⚖️ **[Comparison](./docs/comparison.md)** - vs Snyk, SonarQube, Semgrep, LLM Guard

---

## 🤖 Claude Code Skill

This repository includes a Claude Code project skill at
[`.claude/skills/mcp-safeguard/`](./.claude/skills/mcp-safeguard/) to help AI
assistants run MCP-Safeguard, explain findings, suggest minimal fixes, and add
GitHub Actions scanning. Open the repo in Claude Code and ask it to scan an MCP
server or wire MCP-Safeguard into CI.

The skill drives the published `@mcp-safeguard/cli` package; it does not
reimplement scanning logic and never needs passwords, OTP codes, recovery codes,
or API secrets.

---

## 🐳 Docker Support

```bash
# Build image
docker build -t mcp-safeguard .

# Scan a directory
docker run -v $(pwd):/workspace mcp-safeguard scan /workspace

# Export results
docker run -v $(pwd):/workspace \
  mcp-safeguard scan /workspace -f json -o /workspace/report.json
```

> No pre-built image is published yet — build it locally with `docker build -t mcp-safeguard .`.

---

## 🔧 Development

```bash
# Clone repository
git clone https://github.com/Li-Bailiang/mcp-safeguard.git
cd mcp-safeguard

# Install dependencies (requires pnpm)
pnpm install

# Build all packages
pnpm build

# Run tests
pnpm test

# Lint code
pnpm lint

# Clean build artifacts
pnpm clean
```

**Monorepo Structure:**
```
mcp-safeguard/
├── packages/
│   ├── cli/                # Command-line interface
│   ├── core/               # Scanning engine + rules
│   ├── runtime/            # Runtime protection SDK
│   └── semgrep-installer/  # Auto-installer
├── tests/                  # Test fixtures
└── docs/                   # Documentation
```

---

## 🤝 Contributing

We welcome contributions! Help make MCP security better for everyone.

### Ways to Contribute

- 🐛 **Report Bugs** - [Open an issue](https://github.com/Li-Bailiang/mcp-safeguard/issues/new?template=bug_report.md)
- 💡 **Suggest Features** - [Request a feature](https://github.com/Li-Bailiang/mcp-safeguard/issues/new?template=feature_request.md)
- 📝 **Improve Docs** - Documentation PRs always welcome
- 🔧 **Submit PRs** - See [CONTRIBUTING.md](./CONTRIBUTING.md)
- ⭐ **Star the Repo** - Show your support!

### Quick Contribution Guide

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-rule`
3. Make your changes
4. Add tests
5. Submit a pull request

📘 **[Contributing Guidelines](./CONTRIBUTING.md)**

---

## 💬 Community & Support

- 💬 **[GitHub Discussions](https://github.com/Li-Bailiang/mcp-safeguard/discussions)** - Ask questions, share ideas
- 🐛 **[GitHub Issues](https://github.com/Li-Bailiang/mcp-safeguard/issues)** - Report bugs, request features
- 🔒 **[Security Issues](./SECURITY.md)** - Responsible disclosure
- 📖 **[Documentation](./docs/)** - Complete guides and references

---

## 🗺️ Roadmap

### Already shipped in 0.1.0
- ✅ HTML report generation with charts
- ✅ Auto-fix suggestions (`--fix` / `--dry-run`)
- ✅ Go, Rust, and Java SAST packs
- ✅ GitHub composite action + SARIF upload

### Next
- [x] Publish to npm
- [ ] Baseline / diff comparison (track improvements over time)
- [ ] VS Code extension for real-time scanning
- [ ] Web dashboard for results visualization
- [ ] Rule marketplace for community rules

### Later
- [ ] Plugin system for extensibility
- [ ] Deeper taint analysis for MCP data flows
- [ ] Enterprise features (SSO, RBAC)

---

## 🔒 Security

**Found a security vulnerability in MCP-Safeguard?**

Please report it responsibly: [SECURITY.md](./SECURITY.md)

We take security seriously and will respond within 48 hours.

---

## 📄 License

MIT License - see [LICENSE](./LICENSE) for details.

**TL;DR:** Free for commercial and personal use.

---

## 🙏 Acknowledgments

- **[Semgrep](https://semgrep.dev/)** - Powerful static analysis engine
- **[MCP Community](https://modelcontextprotocol.io/)** - Feedback and testing
- **Contributors** - Everyone who helped improve MCP-Safeguard
- **Security Researchers** - Responsible disclosure and improvements

---

## 📞 Get in Touch

- 🐛 **Issues & questions:** [GitHub Issues](https://github.com/Li-Bailiang/mcp-safeguard/issues)
- 💬 **Discussion:** [GitHub Discussions](https://github.com/Li-Bailiang/mcp-safeguard/discussions)
- 🔒 **Security reports:** see [SECURITY.md](./SECURITY.md)

---

<div align="center">

**Built with ❤️ for the MCP community**

[⭐ Star on GitHub](https://github.com/Li-Bailiang/mcp-safeguard) • [📖 Documentation](./docs) • [🐛 Report Issue](https://github.com/Li-Bailiang/mcp-safeguard/issues) • [💬 Discuss](https://github.com/Li-Bailiang/mcp-safeguard/discussions)

---

**Secure your MCP servers today.**

```bash
git clone https://github.com/Li-Bailiang/mcp-safeguard && cd mcp-safeguard && pnpm install && pnpm build
node packages/cli/dist/index.js scan /path/to/your-mcp-server
```

</div>
