# MCP-Safeguard Architecture

This document describes the system design, component interactions, and data flow of MCP-Safeguard.

## Overview

MCP-Safeguard is a comprehensive security scanner for Model Context Protocol (MCP) servers. It uses static analysis via Semgrep with 170 rules: 57 MCP-focused rules across 8 categories, 25 infrastructure rules, and 88 general-purpose Go/Java/Rust SAST rules (loaded only when that language is present).

## System Design

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         MCP-Safeguard CLI                          │
│                    (User Interface Layer)                       │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                         Core Scanner                            │
│                    (Orchestration Layer)                        │
│  ┌──────────────┐  ┌─────────────┐  ┌────────────────────┐    │
│  │   Scanner    │  │   Scorer    │  │  IgnoreManager     │    │
│  └──────────────┘  └─────────────┘  └────────────────────┘    │
└───────────────┬─────────────────────────────────────┬───────────┘
                │                                     │
                ▼                                     ▼
┌───────────────────────────────┐   ┌─────────────────────────────┐
│     Semgrep Runner            │   │    Manifest Parser          │
│  (Analysis Engine)            │   │  (Metadata Extraction)      │
│  ┌─────────────────────────┐ │   │  ┌───────────────────────┐ │
│  │  UTF-8 Encoding Setup   │ │   │  │  package.json         │ │
│  │  Rule Path Config       │ │   │  │  requirements.txt     │ │
│  │  JSON Output Parsing    │ │   │  └───────────────────────┘ │
│  └─────────────────────────┘ │   └─────────────────────────────┘
└───────────────┬───────────────┘
                │
                ▼
┌───────────────────────────────────────────────────────────────────┐
│                     Security Rules (170)                          │
│  ┌────────────┐ ┌────────────┐ ┌──────────────┐ ┌─────────────┐ │
│  │Supply Chain│ │Shadow Server│ │Indirect Inj. │ │Excessive    │ │
│  │  (6 rules) │ │ (11 rules) │ │  (8 rules)   │ │Agency(8)    │ │
│  └────────────┘ └────────────┘ └──────────────┘ └─────────────┘ │
│  ┌────────────┐ ┌────────────┐ ┌──────────────┐                 │
│  │Context     │ │Typosquatting│ │DoS           │                 │
│  │Overshare(7)│ │  (4 rules) │ │  (7 rules)   │                 │
│  └────────────┘ └────────────┘ └──────────────┘                 │
└───────────────────────────────────────────────────────────────────┘
                │
                ▼
┌───────────────────────────────────────────────────────────────────┐
│                         Reporter                                  │
│                    (Output Formatting)                            │
│  ┌────────────┐  ┌─────────────┐  ┌────────────┐  ┌───────────┐ │
│  │    Text    │  │    JSON     │  │   SARIF    │  │   HTML    │ │
│  └────────────┘  └─────────────┘  └────────────┘  └───────────┘ │
└───────────────────────────────────────────────────────────────────┘
```

## Component Architecture

### Monorepo Structure

```
mcp-safeguard/
├── packages/
│   ├── cli/                    # Command-line interface
│   │   ├── src/
│   │   │   └── index.ts       # CLI entry point with commander
│   │   └── package.json
│   │
│   ├── core/                   # Core scanning engine
│   │   ├── src/
│   │   │   ├── scanner.ts     # Main orchestration
│   │   │   ├── semgrep.ts     # Semgrep runner
│   │   │   ├── reporter.ts    # Output formatting
│   │   │   ├── scorer.ts      # Risk calculation
│   │   │   ├── manifest.ts    # Package parsing
│   │   │   ├── ignore.ts      # File filtering
│   │   │   ├── config.ts      # Configuration management
│   │   │   ├── types.ts       # TypeScript definitions
│   │   │   └── index.ts       # Public API
│   │   ├── rules/             # 170 Semgrep rules
│   │   │   ├── mcp-threats/
│   │   │   ├── supply-chain/
│   │   │   ├── shadow-server/
│   │   │   ├── indirect-injection/
│   │   │   ├── excessive-agency/
│   │   │   ├── context-overshare/
│   │   │   ├── typosquatting/
│   │   │   └── dos/
│   │   └── package.json
│   │
│   ├── runtime/                # Runtime protection SDK
│   │   ├── src/
│   │   │   ├── index.ts       # MCPSafeguardRuntime class
│   │   │   ├── rate-limiter.ts
│   │   │   ├── prompt-validator.ts
│   │   │   ├── audit-logger.ts
│   │   │   ├── circuit-breaker.ts
│   │   │   └── types.ts
│   │   └── package.json
│   │
│   └── semgrep-installer/      # Auto-installer for Semgrep
│       └── src/
│           └── index.ts
│
├── tests/
│   └── fixtures/
│       ├── vulnerable-extended/
│       └── safe-extended/
│
└── docs/                       # Documentation
```

## Core Components

### 1. Scanner (scanner.ts)

**Responsibilities:**
- Orchestrates the entire scanning process
- Validates Semgrep installation
- Loads ignore patterns
- Executes Semgrep analysis
- Converts results to structured findings
- Calculates security summary and risk scores

**Key Methods:**
```typescript
class Scanner {
  async scan(targetPath: string): Promise<ScanResult>
  private calculateSummary(findings: Finding[]): ScanSummary
}
```

**Data Flow:**
1. Check Semgrep availability
2. Load `.mcpignore` patterns
3. Run Semgrep with custom rules
4. Filter ignored files
5. Convert Semgrep output to findings
6. Calculate summary and risk score
7. Return structured result

### 2. Semgrep Runner (semgrep.ts)

**Responsibilities:**
- Execute Semgrep with proper configuration
- Handle UTF-8 encoding for international characters
- Parse JSON output
- Handle errors gracefully

**Key Features:**
- **UTF-8 Fix**: Sets `PYTHONUTF8=1` and `PYTHONIOENCODING=utf-8`
- **Custom Rules**: Points to bundled security rules
- **JSON Output**: Structured machine-readable results
- **Error Handling**: Captures and reports Semgrep failures

**Configuration:**
```typescript
{
  env: {
    PYTHONUTF8: '1',
    PYTHONIOENCODING: 'utf-8'
  },
  args: [
    '--config', rulesPath,
    '--json',
    '--no-git-ignore',
    targetPath
  ]
}
```

### 3. Reporter (reporter.ts)

**Responsibilities:**
- Format scan results in multiple output formats
- Generate human-readable text reports
- Create machine-readable JSON
- Produce SARIF for CI/CD integration

**Output Formats:**

**Text Format:**
```
================================================================================
MCP-Safeguard Security Scan Report
================================================================================

Target: /path/to/project
Risk Score: 45/100 (MEDIUM)
Total Findings: 12

[ERROR] mcp-suspicious-exec-package
File: src/index.js:15
Message: Suspicious use of child_process exec functions
```

**JSON Format:**
```json
{
  "findings": [...],
  "summary": {
    "total": 12,
    "bySeverity": { "ERROR": 5, "WARNING": 7, "INFO": 0 },
    "byCategory": { "supply-chain": 3, ... },
    "riskScore": 42.5
  },
  "metadata": {
    "version": "0.1.0",
    "timestamp": "2026-06-03T...",
    "targetPath": "/path/to/project"
  }
}
```

**SARIF Format:**
Industry-standard format compatible with:
- GitHub Advanced Security
- GitLab Security Dashboard
- Azure DevOps
- SonarQube

### 4. Risk Scorer (scorer.ts)

**Responsibilities:**
- Calculate numerical risk scores (0-100)
- Determine risk levels (CRITICAL, HIGH, MEDIUM, LOW)
- Weight findings by severity, impact, and likelihood

**Algorithm:**
```
For each finding:
  base_score = severity_weight × impact_weight × likelihood_weight

Weights:
  - Severity: ERROR=10, WARNING=5, INFO=1
  - Impact: HIGH=3, MEDIUM=2, LOW=1
  - Likelihood: HIGH=3, MEDIUM=2, LOW=1

Total Risk Score = (sum of all scores / max possible score) × 100

Risk Levels:
  - CRITICAL: 75-100
  - HIGH: 50-74
  - MEDIUM: 25-49
  - LOW: 0-24
```

### 5. Manifest Parser (manifest.ts)

**Responsibilities:**
- Extract project metadata
- Parse package dependencies
- Identify project type

**Supported Formats:**
- **JavaScript/TypeScript**: `package.json`
- **Python**: `requirements.txt`, `setup.py`, `pyproject.toml`

### 6. Ignore Manager (ignore.ts)

**Responsibilities:**
- Load and parse `.mcpignore` files
- Filter files based on patterns
- Provide default ignore patterns

**Default Ignores:**
```
node_modules/
.git/
dist/
build/
*.min.js
coverage/
```

**Pattern Syntax:**
Uses gitignore-style patterns via the `ignore` npm package.

### 7. Runtime SDK (runtime/index.ts)

**Responsibilities:**
- Runtime protection for MCP servers
- Tool call interception and validation
- Rate limiting
- Prompt injection detection
- Audit logging
- Circuit breaker pattern

**Key Features:**
```typescript
const shield = new MCPSafeguardRuntime({
  blockDangerousTools: true,
  maxToolCallsPerMinute: 60,
  promptInjectionDetection: true,
  auditLogPath: './audit.log'
});

shield.init();

// Wrap tool functions
const safeTool = shield.wrapToolCall('myTool', myToolFunction);

// Validate prompts
const result = shield.validatePrompt(userInput);
```

## Data Flow

### Scan Flow Diagram

```
User Input (path)
    │
    ▼
┌─────────────────┐
│ CLI Entry Point │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Scanner.scan()  │
└────────┬────────┘
         │
         ├─────────────────────────┐
         │                         │
         ▼                         ▼
┌──────────────────┐    ┌──────────────────┐
│ IgnoreManager    │    │ Semgrep Check    │
│ Load .mcpignore  │    │ Installation     │
└────────┬─────────┘    └─────────┬────────┘
         │                        │
         │                        ▼
         │              ┌──────────────────┐
         │              │ SemgrepRunner    │
         │              │ Execute Analysis │
         │              └─────────┬────────┘
         │                        │
         │                        ▼
         │              ┌──────────────────┐
         │              │ Parse Results    │
         │              │ (Semgrep JSON)   │
         │              └─────────┬────────┘
         │                        │
         └────────┬───────────────┘
                  │
                  ▼
         ┌──────────────────┐
         │ Filter Ignored   │
         │ Files & Convert  │
         │ to Findings      │
         └────────┬─────────┘
                  │
                  ▼
         ┌──────────────────┐
         │ RiskScorer       │
         │ Calculate Score  │
         └────────┬─────────┘
                  │
                  ▼
         ┌──────────────────┐
         │ Reporter         │
         │ Format Output    │
         └────────┬─────────┘
                  │
                  ▼
         Display/Save Results
```

### Source → Scanner → Reporter Flow

```
┌──────────────────────────────────────────────────────────┐
│                     Source Files                         │
│  ├── src/server.ts                                       │
│  ├── src/tools/exec.ts      ← Contains vulnerabilities  │
│  ├── src/config.ts                                       │
│  └── package.json                                        │
└────────────────────┬─────────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────────────┐
│                  Semgrep Analysis                        │
│  Rules: 170 patterns (57 MCP across 8 categories +       │
│         25 infra + 88 SAST)                              │
│  ├── supply-chain/mcp-suspicious-exec-package.yml       │
│  ├── shadow-server/mcp-server-no-auth.yml               │
│  └── indirect-injection/mcp-prompt-injection-risk.yml   │
└────────────────────┬─────────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────────────┐
│                  Raw Findings                            │
│  {                                                       │
│    check_id: "mcp-suspicious-exec-package",             │
│    path: "src/tools/exec.ts",                           │
│    start: { line: 42, col: 5 },                         │
│    severity: "ERROR",                                    │
│    metadata: { category: "supply-chain", ... }          │
│  }                                                       │
└────────────────────┬─────────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────────────┐
│                Risk Scoring                              │
│  - Severity weights applied                              │
│  - Impact × Likelihood calculated                        │
│  - Normalized to 0-100 scale                             │
│  Result: Risk Score = 68.5 (HIGH)                        │
└────────────────────┬─────────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────────────┐
│               Formatted Output                           │
│  ├── Text Report (console, colored)                     │
│  ├── JSON (machine-readable)                             │
│  ├── SARIF (CI/CD integration)                           │
│  └── HTML (web dashboard, future)                        │
└──────────────────────────────────────────────────────────┘
```

## Extension Points

### 1. Custom Rules

Add new Semgrep rules by placing YAML files in `packages/core/rules/`:

```yaml
rules:
  - id: my-custom-rule
    languages: [javascript, typescript]
    message: Description of the issue
    severity: ERROR
    patterns:
      - pattern: dangerous_function(...)
    metadata:
      category: my-category
      confidence: HIGH
      impact: HIGH
      likelihood: MEDIUM
```

### 2. Custom Reporters

Extend the `Reporter` class to add new output formats:

```typescript
class CustomReporter extends Reporter {
  formatCustom(result: ScanResult): string {
    // Your custom format implementation
  }
}
```

### 3. Validation Hooks (Runtime SDK)

Add custom validation logic:

```typescript
const customHook = {
  validate: async (context: ValidationContext): Promise<ValidationResult> => {
    // Custom validation logic
    if (context.toolName === 'sensitive-tool') {
      return { allowed: false, reason: 'Custom policy violation' };
    }
    return { allowed: true };
  }
};

const shield = new MCPSafeguardRuntime({
  validationHooks: [customHook]
});
```

### 4. Configuration Files

Support for `.mcp-safeguardrc.yaml` configuration:

```yaml
version: 1
rules:
  mcp-suspicious-exec-package: error
  mcp-server-no-auth: warn
  mcp-excessive-logging: off

ignore:
  - test/**
  - fixtures/**

severity-threshold: error
```

## Performance Considerations

### Optimization Strategies

1. **Parallel Rule Execution**: Semgrep runs rules in parallel
2. **Incremental Scanning**: Cache results for unchanged files (planned)
3. **Rule Filtering**: Only run relevant rules for detected languages
4. **Ignore Patterns**: Exclude irrelevant files early

### Typical Performance

- **Small Project** (< 100 files): 2-5 seconds
- **Medium Project** (100-1000 files): 10-30 seconds
- **Large Project** (1000+ files): 30-120 seconds

### Bottlenecks

1. **Semgrep Execution**: Main performance factor
2. **File I/O**: Reading source files
3. **Pattern Matching**: Complex regex patterns

## Security Architecture

### Threat Model

**Protected Against:**
- Command injection
- Code injection
- Path traversal
- SQL injection
- Prompt injection
- Credential exposure
- Resource exhaustion

**Out of Scope:**
- Runtime vulnerabilities (use Runtime SDK)
- Network-based attacks
- Physical security
- Social engineering

### Security Features

1. **Static Analysis**: No code execution
2. **Sandboxed Execution**: Semgrep runs in isolated process
3. **Input Validation**: Path sanitization
4. **No Network Calls**: Offline operation (except updates)

## Technology Stack

- **Language**: TypeScript 5.3+
- **Runtime**: Node.js 18+
- **Package Manager**: pnpm (workspace)
- **Analysis Engine**: Semgrep (Python-based)
- **CLI Framework**: Commander.js
- **Output Formatting**: Chalk (colors), cli-table3 (tables)
- **Pattern Matching**: ignore (gitignore-style)

## Future Architecture Plans

1. **Plugin System**: Load custom analyzers
2. **Distributed Scanning**: Scan across multiple machines
3. **Incremental Analysis**: Only scan changed files
4. **Web Dashboard**: Visual result exploration
5. **IDE Extensions**: Real-time feedback in editors
6. **Rule Marketplace**: Share and discover rules
7. **Baseline Management**: Track improvements over time
8. **Auto-remediation**: Suggest and apply fixes
