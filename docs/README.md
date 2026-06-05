# MCP-Safeguard Documentation Index

Welcome to the MCP-Safeguard documentation! This index provides an overview of all available documentation.

## 📚 Documentation Structure

### Getting Started
- **[Getting Started Guide](./getting-started.md)** - Complete beginner's guide
  - Installation methods (from source, Docker)
  - Your first scan in 5 minutes
  - Understanding scan results
  - Common workflows
  - Next steps

### Architecture & Design
- **[Architecture Overview](./architecture.md)** - System design documentation
  - High-level architecture diagram
  - Component descriptions
  - Data flow diagrams
  - Monorepo structure
  - Extension points
  - Performance considerations

### Development
- **[Rule Development Guide](./rule-development.md)** - Creating custom security rules
  - Semgrep pattern syntax
  - Rule structure and metadata
  - Testing rules
  - Rule quality checklist
  - Contributing rules
  - Example rules

### Integration
- **[CI/CD Integration Guide](./ci-integration.md)** - Automate security scans
  - GitHub Actions setup
  - GitLab CI configuration
  - Jenkins pipeline
  - Azure DevOps
  - CircleCI
  - Generic CI/CD patterns
  - Docker integration

### API Reference
- **[API Reference](./api-reference.md)** - Programmatic usage
  - Core API (Scanner, Reporter, RiskScorer)
  - TypeScript types
  - Runtime SDK API
  - Complete examples
  - Error handling

### Support
- **[FAQ](./faq.md)** - Frequently asked questions
  - Installation issues
  - False positives
  - Performance tuning
  - Custom rules
  - Integration problems
  - Troubleshooting

### Comparison
- **[Tool Comparison](./comparison.md)** - How MCP-Safeguard compares
  - vs Snyk
  - vs SonarQube
  - vs Semgrep OSS
  - vs LLM Guard
  - Unique advantages
  - Decision matrix

### Rules Reference
- **[Security Rules](./rules.md)** - Complete rule documentation
  - All 170 security rules
  - Categories and severities
  - CWE and OWASP mappings
  - Examples and remediation

## 🚀 Quick Navigation

### I want to...

**Get started quickly**
→ [Getting Started Guide](./getting-started.md)

**Understand how it works**
→ [Architecture Overview](./architecture.md)

**Create custom rules**
→ [Rule Development Guide](./rule-development.md)

**Integrate with CI/CD**
→ [CI/CD Integration Guide](./ci-integration.md)

**Use the API programmatically**
→ [API Reference](./api-reference.md)

**Troubleshoot issues**
→ [FAQ](./faq.md)

**Compare with other tools**
→ [Tool Comparison](./comparison.md)

**See all security rules**
→ [Security Rules](./rules.md)

## 📖 Documentation by Role

### For Developers
1. [Getting Started](./getting-started.md) - Quick setup
2. [API Reference](./api-reference.md) - Programmatic usage
3. [FAQ](./faq.md) - Common issues

### For DevOps Engineers
1. [CI/CD Integration](./ci-integration.md) - Pipeline setup
2. [Getting Started](./getting-started.md) - Installation options
3. [FAQ](./faq.md) - Troubleshooting

### For Security Engineers
1. [Security Rules](./rules.md) - All vulnerability patterns
2. [Rule Development](./rule-development.md) - Custom rules
3. [Architecture](./architecture.md) - Security design

### For Architects
1. [Architecture](./architecture.md) - System design
2. [Comparison](./comparison.md) - Tool selection
3. [API Reference](./api-reference.md) - Integration options

## 📦 Key Concepts

### Static Analysis
MCP-Safeguard uses Semgrep to analyze source code without executing it, detecting security vulnerabilities through pattern matching.

**Covered in:**
- [Architecture](./architecture.md#semgrep-runner)
- [Rule Development](./rule-development.md)

### Runtime Protection
The Runtime SDK provides active security during server execution with tool call interception, rate limiting, and prompt validation.

**Covered in:**
- [API Reference](./api-reference.md#runtime-sdk-api)
- [Getting Started](./getting-started.md)

### Risk Scoring
MCP-Safeguard calculates a 0-100 risk score based on severity, impact, and likelihood of findings.

**Covered in:**
- [Architecture](./architecture.md#risk-scorer)
- [Getting Started](./getting-started.md#understanding-results)

### Security Categories
170 rules total. The 57 MCP-focused rules span 8 categories: MCP Threats, Supply Chain, Shadow Server, Indirect Injection, Excessive Agency, Context Overshare, Typosquatting, and DoS — plus 25 infrastructure rules and 88 general-purpose Go/Java/Rust SAST rules.

**Covered in:**
- [Security Rules](./rules.md)
- [Getting Started](./getting-started.md#security-categories)

## 🎯 Use Case Documentation

### Scanning an MCP Server
```bash
mcp-safeguard scan ./my-mcp-server
```
**Read:** [Getting Started](./getting-started.md#your-first-scan)

### Adding Runtime Protection
```typescript
import { MCPSafeguardRuntime } from '@mcp-safeguard/runtime';
const shield = new MCPSafeguardRuntime();
shield.init();
```
**Read:** [API Reference](./api-reference.md#runtime-sdk-api)

### Creating Custom Rules
```yaml
rules:
  - id: my-custom-rule
    languages: [javascript]
    severity: ERROR
    patterns:
      - pattern: dangerousFunction(...)
```
**Read:** [Rule Development](./rule-development.md)

### CI/CD Integration
```yaml
- name: Security Scan
  run: mcp-safeguard scan . -f sarif -o results.sarif
```
**Read:** [CI/CD Integration](./ci-integration.md)

## 🔍 Search Documentation

Can't find what you're looking for? Try:

1. **Search within documentation** - Use Ctrl+F in your browser
2. **GitHub search** - Search the repository
3. **FAQ** - Check [Frequently Asked Questions](./faq.md)
4. **Ask the community** - [GitHub Discussions](https://github.com/Li-Bailiang/mcp-safeguard/discussions)

## 📝 Documentation Conventions

### Symbols Used

- ✅ **Checkmark** - Supported feature
- ❌ **Cross** - Not supported / vulnerability
- ⚠️ **Warning** - Partial support / caution
- 🚧 **Construction** - In development
- 💡 **Lightbulb** - Tip or best practice
- 📘 **Book** - Link to documentation
- 🔴 **Red dot** - High severity
- 🟡 **Yellow dot** - Medium severity
- 🟢 **Green dot** - Low severity

### Code Block Types

**Command line:**
```bash
mcp-safeguard scan .
```

**TypeScript:**
```typescript
const scanner = new Scanner();
```

**YAML configuration:**
```yaml
rules:
  - id: example-rule
```

**Output examples:**
```
Scan completed in 2.4s ✓
```

## 🤝 Contributing to Documentation

Documentation contributions are welcome! Please:

1. Check for accuracy and clarity
2. Follow existing formatting
3. Test all code examples
4. Update this index if adding new files
5. Submit a pull request

**Contributing guide:** [CONTRIBUTING.md](../CONTRIBUTING.md)

## 📅 Documentation Updates

Documentation is continuously updated. Last major update: **2026-06-03**

**Version:** 0.1.0

### Recent Updates
- ✨ Added comprehensive getting started guide
- ✨ Added detailed architecture documentation
- ✨ Added rule development guide
- ✨ Added CI/CD integration guide
- ✨ Added complete API reference
- ✨ Added FAQ with troubleshooting
- ✨ Added tool comparison

## 📧 Documentation Feedback

Found an issue or have a suggestion?

- **Report documentation issues:** [GitHub Issues](https://github.com/Li-Bailiang/mcp-safeguard/issues/new?labels=documentation)
- **Suggest improvements:** [GitHub Discussions](https://github.com/Li-Bailiang/mcp-safeguard/discussions)
- **Submit corrections:** Pull requests welcome

## 📜 License

Documentation is licensed under [MIT License](../LICENSE).

---

<div align="center">

**Need help? Check the [FAQ](./faq.md) or ask in [Discussions](https://github.com/Li-Bailiang/mcp-safeguard/discussions)**

[⬅️ Back to README](../README.md)

</div>
