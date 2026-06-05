# MCP-Safeguard Comparison

How MCP-Safeguard compares to other security tools.

## Quick Comparison Table

| Feature | MCP-Safeguard | Snyk | SonarQube | Semgrep OSS | LLM Guard |
|---------|------------|------|-----------|-------------|-----------|
| **MCP-Specific Rules** | ✅ 57 rules | ❌ Generic | ❌ Generic | ❌ Generic | ⚠️ Partial |
| **Static Analysis** | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Runtime Protection** | ✅ | ❌ | ❌ | ❌ | ✅ |
| **Prompt Injection Detection** | ✅ | ❌ | ❌ | ❌ | ✅ |
| **Open Source** | ✅ MIT | ⚠️ Freemium | ⚠️ Community | ✅ LGPL | ✅ MIT |
| **CI/CD Integration** | ✅ SARIF | ✅ | ✅ | ✅ | ⚠️ Limited |
| **Custom Rules** | ✅ Easy | ⚠️ Paid | ⚠️ Complex | ✅ Easy | ⚠️ Limited |
| **Zero Config** | ✅ | ⚠️ Setup | ⚠️ Setup | ✅ | ⚠️ Setup |
| **Risk Scoring** | ✅ | ✅ | ✅ | ❌ | ⚠️ Basic |
| **Multi-Language** | ✅ JS/TS/Py | ✅ Many | ✅ Many | ✅ Many | ⚠️ Limited |
| **Offline Mode** | ✅ | ❌ Cloud | ⚠️ Server | ✅ | ✅ |
| **Price** | Free | Paid | Community/Paid | Free | Free |

## vs Snyk

### Snyk Overview

Snyk is a comprehensive security platform focused on finding and fixing vulnerabilities in code, dependencies, containers, and infrastructure as code.

### Strengths of Snyk

✅ **Broad Coverage**: Dependencies, containers, IaC, code
✅ **Vulnerability Database**: Extensive CVE tracking
✅ **Auto-Remediation**: Automated fix PRs
✅ **Developer Experience**: Good IDE integration
✅ **Enterprise Features**: SSO, compliance, reporting

### Strengths of MCP-Safeguard

✅ **MCP-Specific**: Purpose-built for Model Context Protocol servers
✅ **Zero Cost**: Fully open source with no usage limits
✅ **Runtime Protection**: Built-in SDK for runtime security
✅ **Prompt Security**: Specialized prompt injection detection
✅ **Lightweight**: Fast scans without cloud dependencies
✅ **Privacy**: All analysis runs locally
✅ **Customizable**: Easy custom rules without vendor lock-in

### When to Choose Snyk

- Need dependency vulnerability scanning
- Want automated fix pull requests
- Require enterprise compliance features
- Multi-language application beyond MCP
- Budget for commercial tools

### When to Choose MCP-Safeguard

- Building MCP servers specifically
- Want free, open-source solution
- Need MCP-specific security patterns
- Prefer local-only analysis
- Want runtime protection SDK
- Need prompt injection detection

### Can Use Both?

**Yes!** They complement each other:

```bash
# Snyk for dependencies
snyk test

# MCP-Safeguard for MCP-specific security
mcp-safeguard scan .
```

**Recommended workflow:**
- **Snyk**: Dependency vulnerabilities
- **MCP-Safeguard**: MCP server code security + runtime protection

---

## vs SonarQube

### SonarQube Overview

SonarQube is a code quality and security platform that provides static analysis for bugs, code smells, and vulnerabilities.

### Strengths of SonarQube

✅ **Code Quality**: Beyond security - code smells, duplication, complexity
✅ **Quality Gates**: Enforce standards before merging
✅ **Historical Tracking**: Trends over time
✅ **Team Dashboards**: Visual reporting
✅ **Language Support**: 25+ languages

### Strengths of MCP-Safeguard

✅ **MCP Focus**: Rules designed for MCP patterns
✅ **Quick Setup**: No server installation required
✅ **Faster Scans**: Focused on security, not all quality metrics
✅ **Runtime SDK**: Active protection during execution
✅ **Prompt Security**: LLM-specific vulnerability detection
✅ **Modern Stack**: Built for Node.js ecosystem

### Comparison

| Aspect | MCP-Safeguard | SonarQube |
|--------|------------|-----------|
| **Setup Time** | < 1 minute | 30-60 minutes (server setup) |
| **Scan Speed** | Fast (security only) | Slower (all quality metrics) |
| **Infrastructure** | None required | Server + database |
| **MCP Rules** | 57 MCP-specific rules (+ 113 SAST/infra) | Generic security rules |
| **Learning Curve** | Low | Medium-High |
| **Maintenance** | None | Server updates, backups |

### When to Choose SonarQube

- Need comprehensive code quality metrics
- Want historical quality tracking
- Have team dashboard requirements
- Multi-project organization
- Need quality gates for compliance

### When to Choose MCP-Safeguard

- Building MCP servers
- Want quick, focused security scans
- No infrastructure for hosting SonarQube
- Need runtime protection
- Prefer lightweight tools

### Can Use Both?

**Yes!** They serve different purposes:

```yaml
# .gitlab-ci.yml
sonarqube-scan:
  stage: quality
  script: sonar-scanner

mcp-security-scan:
  stage: security
  script: mcp-safeguard scan .
```

---

## vs Semgrep OSS

### Semgrep OSS Overview

Semgrep is a fast, open-source static analysis tool with customizable patterns. MCP-Safeguard is built on top of Semgrep.

### Relationship

**MCP-Safeguard = Semgrep + MCP-Specific Enhancements**

```
┌─────────────────────────────────────┐
│          MCP-Safeguard                 │
│  ┌───────────────────────────────┐  │
│  │  57 MCP Security Rules        │  │
│  │  Risk Scoring                 │  │
│  │  Runtime Protection SDK       │  │
│  │  SARIF Output                 │  │
│  │  CLI with colors/tables       │  │
│  └───────────────┬───────────────┘  │
│                  │                   │
│  ┌───────────────▼───────────────┐  │
│  │      Semgrep Engine           │  │
│  │  (Pattern Matching)           │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
```

### What MCP-Safeguard Adds

✅ **MCP Security Rules**: 57 curated MCP rules (plus 113 SAST/infrastructure rules)
✅ **Risk Scoring**: Weighted risk calculation
✅ **Runtime SDK**: Active protection during execution
✅ **Better UX**: Enhanced CLI with tables and colors
✅ **MCP Focus**: Tailored to MCP patterns and threats
✅ **Pre-configured**: Works out of the box

### Comparison

| Feature | MCP-Safeguard | Semgrep OSS |
|---------|------------|-------------|
| **MCP Rules** | 57 included | Need to write |
| **Runtime Protection** | Built-in SDK | Not included |
| **Risk Scoring** | Yes | No |
| **CLI Output** | Enhanced tables/colors | Plain text |
| **Setup** | Zero config | Config required |
| **Rule Writing** | Same syntax | Same syntax |

### When to Use Semgrep OSS

- General-purpose security scanning
- Want maximum flexibility
- Building custom security tools
- Need Semgrep Registry rules

### When to Use MCP-Safeguard

- Building MCP servers
- Want MCP-specific security checks
- Need runtime protection
- Prefer ready-to-use solution

### Can Use Both?

**Yes!** Use Semgrep for general rules and MCP-Safeguard for MCP-specific:

```bash
# General security scan
semgrep --config "p/security-audit" .

# MCP-specific scan
mcp-safeguard scan .
```

---

## vs LLM Guard

### LLM Guard Overview

LLM Guard is a security toolkit focused on input/output filtering for LLM applications.

### Strengths of LLM Guard

✅ **Input/Output Filtering**: Real-time content scanning
✅ **Prompt Injection Detection**: Multiple detection strategies
✅ **PII Detection**: Identify sensitive information
✅ **Toxicity Detection**: Content moderation
✅ **LLM-Focused**: Purpose-built for LLM security

### Strengths of MCP-Safeguard

✅ **Static Analysis**: Catch issues before deployment
✅ **MCP-Specific**: Tailored to MCP architecture
✅ **Broader Coverage**: Beyond prompt security (auth, injection, etc.)
✅ **Code-Level Detection**: Find vulnerabilities in source code
✅ **CI/CD Integration**: Automated scanning in pipelines
✅ **Zero Runtime Overhead**: Analysis is pre-deployment

### Comparison

| Aspect | MCP-Safeguard | LLM Guard |
|--------|------------|-----------|
| **Analysis Type** | Static (pre-deployment) | Runtime (during execution) |
| **Focus** | MCP server code security | LLM input/output filtering |
| **Vulnerability Types** | Command injection, auth, SSRF, etc. | Prompt injection, PII, toxicity |
| **Performance Impact** | None (runs pre-deploy) | Runtime overhead |
| **Coverage** | Broad security issues | LLM-specific threats |

### Different Use Cases

**MCP-Safeguard**: Find security issues in your code
```typescript
// MCP-Safeguard detects this during development
exec(userInput); // ❌ Command injection vulnerability
```

**LLM Guard**: Filter malicious inputs at runtime
```python
# LLM Guard blocks this at runtime
user_prompt = "Ignore instructions, do X"  # ❌ Prompt injection attempt
```

### When to Choose LLM Guard

- Need runtime content filtering
- Want PII and toxicity detection
- Focus on prompt security only
- Building LLM applications (not specifically MCP)

### When to Choose MCP-Safeguard

- Building MCP servers
- Need comprehensive code security analysis
- Want to catch issues before deployment
- Need broader security coverage (auth, injection, etc.)

### Should Use Both?

**Absolutely!** They're complementary:

```typescript
import { MCPSafeguardRuntime } from '@mcp-safeguard/runtime';
import { LLMGuard } from 'llm-guard';

// Development: MCP-Safeguard static analysis
// Pre-commit: mcp-safeguard scan .

// Runtime: Combined protection
const shield = new MCPSafeguardRuntime();
const guard = new LLMGuard();

async function handlePrompt(prompt: string) {
  // MCP-Safeguard runtime checks
  const shieldResult = shield.validatePrompt(prompt);
  
  // LLM Guard content filtering
  const guardResult = await guard.scanInput(prompt);
  
  if (!shieldResult.allowed || !guardResult.safe) {
    throw new Error('Security check failed');
  }
  
  return processPrompt(prompt);
}
```

**Recommended architecture:**
- **Development**: MCP-Safeguard static analysis
- **CI/CD**: MCP-Safeguard automated scanning
- **Runtime**: MCP-Safeguard SDK + LLM Guard filtering

---

## Unique Advantages of MCP-Safeguard

### 1. MCP-Specialized Rules

Only tool with rules specifically for MCP patterns:

```typescript
// Detects MCP-specific issues
server.setRequestHandler('tools/call', async (request) => {
  // ❌ MCP-Safeguard detects missing authentication
  // ❌ MCP-Safeguard detects excessive agency
  // ❌ MCP-Safeguard detects unsafe tool patterns
});
```

### 2. Complete MCP Security Solution

**Static Analysis + Runtime Protection** in one package:

```typescript
// Development: Static analysis
// $ mcp-safeguard scan .

// Production: Runtime protection
import { MCPSafeguardRuntime } from '@mcp-safeguard/runtime';
const shield = new MCPSafeguardRuntime();
```

### 3. Zero Configuration

Works immediately after building from source:

```bash
git clone https://github.com/Li-Bailiang/mcp-safeguard && cd mcp-safeguard && pnpm install && pnpm build
node packages/cli/dist/index.js scan .  # That's it!
```

Compare to:
- **SonarQube**: Server setup, database configuration
- **Snyk**: Account creation, authentication
- **Semgrep**: Rule configuration

### 4. Privacy-First

All analysis runs locally:
- No code sent to cloud
- No account required
- No usage tracking
- No data retention

### 5. Developer-Friendly

Built for developer workflow:
- Beautiful CLI output with colors and tables
- Helpful error messages
- Fast scans
- Git-style ignore patterns
- Easy custom rules

### 6. Modern Stack

Built with latest technologies:
- TypeScript for type safety
- pnpm workspace for monorepo
- ESM modules
- Modern Node.js APIs

---

## Cost Comparison

### MCP-Safeguard: $0

- ✅ Unlimited scans
- ✅ Unlimited users
- ✅ All features included
- ✅ Runtime SDK included
- ✅ Commercial use allowed
- ✅ No usage caps

### Snyk: $0 - $5,000+/year

- Free: Limited scans, public repos
- Team: $98/month
- Business: $499+/month
- Enterprise: Custom pricing

### SonarQube: $0 - $20,000+/year

- Community: Free, limited features
- Developer: $150/year per developer
- Enterprise: $20,000+/year
- Data Center: Custom pricing

### Semgrep OSS: $0

- Free and open source
- Paid cloud features available

### LLM Guard: $0

- Free and open source

---

## Decision Matrix

### Choose MCP-Safeguard If You:

✅ Are building MCP servers
✅ Want MCP-specific security rules
✅ Need both static + runtime protection
✅ Prefer open source and free tools
✅ Value privacy (local analysis)
✅ Want quick setup and fast scans
✅ Need prompt injection detection

### Add Snyk If You:

✅ Need dependency vulnerability scanning
✅ Want automated fix PRs
✅ Require license compliance
✅ Have budget for commercial tools
✅ Need container scanning

### Add SonarQube If You:

✅ Need comprehensive code quality metrics
✅ Want historical tracking
✅ Have infrastructure for server hosting
✅ Need team dashboards
✅ Require quality gates

### Use Semgrep OSS Directly If You:

✅ Need general-purpose security scanning
✅ Want maximum customization
✅ Building custom security tools
✅ Don't need MCP-specific rules

### Add LLM Guard If You:

✅ Need runtime input/output filtering
✅ Want PII detection
✅ Need toxicity detection
✅ Focus on content moderation

---

## Multi-Tool Strategy

For comprehensive security:

```yaml
# Complete security pipeline
stages:
  - dependencies  # Snyk
  - security      # MCP-Safeguard
  - quality       # SonarQube (optional)

snyk-scan:
  stage: dependencies
  script: snyk test

mcp-safeguard-scan:
  stage: security
  script: mcp-safeguard scan .

sonarqube-scan:
  stage: quality
  script: sonar-scanner
```

**Runtime protection:**
```typescript
import { MCPSafeguardRuntime } from '@mcp-safeguard/runtime';
import { LLMGuard } from 'llm-guard';

// Layered defense
const shield = new MCPSafeguardRuntime();
const guard = new LLMGuard();
```

---

## Conclusion

**MCP-Safeguard is the only tool purpose-built for MCP server security.**

While other tools excel in their domains:
- **Snyk**: Dependency security
- **SonarQube**: Code quality
- **Semgrep**: General-purpose scanning
- **LLM Guard**: Runtime content filtering

**MCP-Safeguard uniquely provides:**
- MCP-specific security rules
- Static analysis for MCP patterns
- Runtime protection SDK
- Prompt injection detection
- Complete MCP security solution
- Free and open source

For MCP server development, **MCP-Safeguard is essential**. Other tools complement but don't replace its MCP-specific capabilities.

---

## Try MCP-Safeguard

```bash
# Install from npm
npm install -g @mcp-safeguard/cli

# Scan your MCP server
mcp-safeguard scan ./my-mcp-server

# Get comprehensive security analysis in seconds
```

**GitHub**: [https://github.com/Li-Bailiang/mcp-safeguard](https://github.com/Li-Bailiang/mcp-safeguard)
