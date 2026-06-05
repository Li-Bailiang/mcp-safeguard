# API Reference

Complete reference for using MCP-Safeguard programmatically.

## Installation

```bash
npm install @mcp-safeguard/core
```

## Core API

### Scanner

The main orchestration component for running security scans.

#### Constructor

```typescript
import { Scanner } from '@mcp-safeguard/core';

const scanner = new Scanner();
```

#### Methods

##### `scan(targetPath: string): Promise<ScanResult>`

Scan a directory or file for security vulnerabilities.

**Parameters:**
- `targetPath` (string): Absolute or relative path to scan

**Returns:** `Promise<ScanResult>`

**Example:**
```typescript
const result = await scanner.scan('./my-mcp-server');

console.log(`Total findings: ${result.summary.total}`);
console.log(`Risk score: ${result.summary.riskScore}`);
```

**Result Structure:**
```typescript
interface ScanResult {
  findings: Finding[];
  summary: ScanSummary;
  metadata: ScanMetadata;
}
```

---

### Reporter

Format scan results in different output formats.

#### Constructor

```typescript
import { Reporter } from '@mcp-safeguard/core';

const reporter = new Reporter();
```

#### Methods

##### `format(result: ScanResult, format: OutputFormat): string`

Format scan results for output.

**Parameters:**
- `result` (ScanResult): Scan results from Scanner
- `format` (OutputFormat): Output format ('json', 'text', 'sarif', 'html')

**Returns:** `string` - Formatted output

**Example:**
```typescript
const scanner = new Scanner();
const reporter = new Reporter();

const result = await scanner.scan('./src');

// JSON output
const jsonOutput = reporter.format(result, 'json');
console.log(jsonOutput);

// SARIF output for CI/CD
const sarifOutput = reporter.format(result, 'sarif');
fs.writeFileSync('results.sarif', sarifOutput);

// Text output for console
const textOutput = reporter.format(result, 'text');
console.log(textOutput);
```

---

### RiskScorer

Calculate risk scores for findings.

#### Constructor

```typescript
import { RiskScorer } from '@mcp-safeguard/core';

const scorer = new RiskScorer();
```

#### Methods

##### `calculateScore(findings: Finding[]): number`

Calculate risk score (0-100) based on findings.

**Parameters:**
- `findings` (Finding[]): Array of security findings

**Returns:** `number` - Risk score from 0 to 100

**Example:**
```typescript
const scorer = new RiskScorer();
const riskScore = scorer.calculateScore(findings);

console.log(`Risk score: ${riskScore.toFixed(2)}/100`);

if (riskScore >= 75) {
  console.log('CRITICAL risk level');
} else if (riskScore >= 50) {
  console.log('HIGH risk level');
} else if (riskScore >= 25) {
  console.log('MEDIUM risk level');
} else {
  console.log('LOW risk level');
}
```

##### `getRiskLevel(score: number): string`

Get risk level classification.

**Parameters:**
- `score` (number): Risk score (0-100)

**Returns:** `string` - 'CRITICAL', 'HIGH', 'MEDIUM', or 'LOW'

---

### ManifestParser

Parse project metadata and dependencies.

#### Constructor

```typescript
import { ManifestParser } from '@mcp-safeguard/core';

const parser = new ManifestParser();
```

#### Methods

##### `parse(projectPath: string): Promise<ManifestData | null>`

Parse project manifest file.

**Parameters:**
- `projectPath` (string): Path to project directory

**Returns:** `Promise<ManifestData | null>`

**Example:**
```typescript
const parser = new ManifestParser();
const manifest = await parser.parse('./my-project');

if (manifest) {
  console.log(`Project: ${manifest.name} v${manifest.version}`);
  console.log('Dependencies:', manifest.dependencies);
}
```

---

### IgnoreManager

Manage file ignore patterns.

#### Constructor

```typescript
import { IgnoreManager } from '@mcp-safeguard/core';

const ignoreManager = new IgnoreManager();
```

#### Methods

##### `loadIgnoreFile(projectPath: string): Promise<void>`

Load `.mcpignore` file from project.

**Parameters:**
- `projectPath` (string): Path to project directory

**Example:**
```typescript
const ignoreManager = new IgnoreManager();
await ignoreManager.loadIgnoreFile('./my-project');
```

##### `shouldIgnore(filePath: string): boolean`

Check if file should be ignored.

**Parameters:**
- `filePath` (string): Path to check

**Returns:** `boolean`

**Example:**
```typescript
if (ignoreManager.shouldIgnore('node_modules/package.json')) {
  console.log('File is ignored');
}
```

##### `addPattern(pattern: string): void`

Add custom ignore pattern.

**Parameters:**
- `pattern` (string): Glob pattern to ignore

**Example:**
```typescript
ignoreManager.addPattern('*.test.ts');
ignoreManager.addPattern('test-fixtures/**');
```

---

### ConfigLoader

Load and manage configuration.

#### Methods

##### `loadConfig(configPath?: string): Promise<ResolvedConfig>`

Load configuration from file.

**Parameters:**
- `configPath` (string, optional): Path to config file

**Returns:** `Promise<ResolvedConfig>`

**Example:**
```typescript
import { configLoader } from '@mcp-safeguard/core';

const config = await configLoader.loadConfig('./.mcp-safeguardrc.yaml');
console.log('Loaded config:', config);
```

---

## TypeScript Types

### Core Types

#### ScanResult

```typescript
interface ScanResult {
  findings: Finding[];
  summary: ScanSummary;
  metadata: ScanMetadata;
}
```

#### Finding

```typescript
interface Finding {
  id: string;
  check_id: string;
  path: string;
  start: Location;
  end: Location;
  message: string;
  severity: Severity;
  category: string;
  metadata: FindingMetadata;
  extra: {
    lines: string;
    message: string;
    metadata: FindingMetadata;
    metavars?: Record<string, any>;
  };
}
```

#### Location

```typescript
interface Location {
  line: number;
  col: number;
  offset?: number;
}
```

#### Severity

```typescript
type Severity = 'ERROR' | 'WARNING' | 'INFO';
```

#### ScanSummary

```typescript
interface ScanSummary {
  total: number;
  bySeverity: Record<Severity, number>;
  byCategory: Record<string, number>;
  riskScore: number;
}
```

#### ScanMetadata

```typescript
interface ScanMetadata {
  version: string;
  timestamp: string;
  targetPath: string;
  rulesVersion: string;
  duration?: number;
}
```

#### FindingMetadata

```typescript
interface FindingMetadata {
  category: string;
  confidence: string;  // 'HIGH' | 'MEDIUM' | 'LOW'
  impact: string;      // 'HIGH' | 'MEDIUM' | 'LOW'
  likelihood: string;  // 'HIGH' | 'MEDIUM' | 'LOW'
  subcategory?: string[];
  cwe?: string[];
  owasp?: string[];
  references?: string[];
  technology?: string[];
}
```

#### OutputFormat

```typescript
type OutputFormat = 'json' | 'text' | 'sarif' | 'html';
```

#### ManifestData

```typescript
interface ManifestData {
  name: string;
  version: string;
  dependencies: Record<string, string>;
  devDependencies?: Record<string, string>;
  mcpConfig?: any;
}
```

---

## Runtime SDK API

### MCPSafeguardRuntime

Runtime protection for MCP servers.

#### Constructor

```typescript
import { MCPSafeguardRuntime } from '@mcp-safeguard/runtime';

const shield = new MCPSafeguardRuntime({
  blockDangerousTools: true,
  maxToolCallsPerMinute: 60,
  promptInjectionDetection: true,
  auditLogPath: './audit.log',
  allowedTools: ['safe-tool-1', 'safe-tool-2'],
  blockedTools: ['dangerous-tool'],
  validationHooks: [],
  circuitBreakerThreshold: 5,
  circuitBreakerTimeout: 60000
});
```

#### Options

```typescript
interface RuntimeOptions {
  blockDangerousTools?: boolean;        // Block dangerous tools (default: true)
  logAllInteractions?: boolean;         // Log all tool calls (default: true)
  maxToolCallsPerMinute?: number;       // Rate limit (default: 0 = disabled)
  allowedTools?: string[];              // Allowlist of tools
  blockedTools?: string[];              // Blocklist of tools
  promptInjectionDetection?: boolean;   // Detect prompt injection (default: true)
  auditLogPath?: string;                // Path to audit log file
  validationHooks?: ValidationHook[];   // Custom validation hooks
  circuitBreakerThreshold?: number;     // Failures before opening (default: 5)
  circuitBreakerTimeout?: number;       // Reset timeout in ms (default: 60000)
}
```

#### Methods

##### `init(): void`

Initialize the runtime protection.

**Example:**
```typescript
const shield = new MCPSafeguardRuntime();
shield.init();
```

##### `wrapToolCall(toolName: string, toolFn: Function): Function`

Wrap a tool function with security checks.

**Parameters:**
- `toolName` (string): Name of the tool
- `toolFn` (Function): Original tool function

**Returns:** `Function` - Wrapped function with security checks

**Example:**
```typescript
const originalTool = async (args) => {
  // Tool implementation
  return result;
};

const safeTool = shield.wrapToolCall('myTool', originalTool);

// Use safe tool
try {
  const result = await safeTool(args);
} catch (error) {
  console.error('Tool call blocked:', error.message);
}
```

##### `validatePrompt(prompt: string): ValidationResult`

Validate a prompt for injection attempts.

**Parameters:**
- `prompt` (string): Prompt text to validate

**Returns:** `ValidationResult`

**Example:**
```typescript
const userPrompt = getUserInput();
const validation = shield.validatePrompt(userPrompt);

if (!validation.allowed) {
  console.error('Prompt injection detected:', validation.reason);
  console.log('Confidence:', validation.confidence);
  console.log('Patterns:', validation.detectedPatterns);
}
```

##### `auditLog(event: AuditEvent): void`

Log an audit event.

**Parameters:**
- `event` (AuditEvent): Event to log

**Example:**
```typescript
shield.auditLog({
  timestamp: Date.now(),
  type: 'tool_call',
  toolName: 'myTool',
  allowed: true,
  metadata: { userId: 'user123' }
});
```

##### `getToolMetrics(toolName: string): ToolCallMetrics | undefined`

Get metrics for a specific tool.

**Parameters:**
- `toolName` (string): Tool name

**Returns:** `ToolCallMetrics | undefined`

**Example:**
```typescript
const metrics = shield.getToolMetrics('myTool');
if (metrics) {
  console.log('Call count:', metrics.callCount);
  console.log('Error count:', metrics.errorCount);
  console.log('Last call:', new Date(metrics.lastCallTime));
}
```

##### `getAllMetrics(): Map<string, ToolCallMetrics>`

Get metrics for all tools.

**Returns:** `Map<string, ToolCallMetrics>`

##### `shutdown(): Promise<void>`

Shutdown the runtime protection and flush logs.

**Example:**
```typescript
await shield.shutdown();
```

---

### Runtime Types

#### ValidationResult

```typescript
interface ValidationResult {
  allowed: boolean;
  reason?: string;
  confidence?: number;
  detectedPatterns?: string[];
}
```

#### AuditEvent

```typescript
interface AuditEvent {
  timestamp: number;
  type: 'tool_call' | 'prompt_validation' | 'rate_limit' | 'circuit_breaker' | 'error';
  toolName?: string;
  allowed: boolean;
  reason?: string;
  metadata?: Record<string, any>;
}
```

#### ToolCallMetrics

```typescript
interface ToolCallMetrics {
  callCount: number;
  lastCallTime: number;
  errorCount: number;
  lastError?: Error;
}
```

#### ValidationContext

```typescript
interface ValidationContext {
  toolName?: string;
  args?: any[];
  metadata?: Record<string, any>;
}
```

#### ValidationHook

```typescript
interface ValidationHook {
  validate(context: ValidationContext): Promise<ValidationResult>;
}
```

---

## Complete Examples

### Basic Scanning

```typescript
import { Scanner, Reporter } from '@mcp-safeguard/core';

async function scanProject(path: string) {
  const scanner = new Scanner();
  const reporter = new Reporter();
  
  try {
    const result = await scanner.scan(path);
    
    console.log(`Total findings: ${result.summary.total}`);
    console.log(`Risk score: ${result.summary.riskScore}`);
    
    // Display findings
    for (const finding of result.findings) {
      console.log(`[${finding.severity}] ${finding.check_id}`);
      console.log(`  File: ${finding.path}:${finding.start.line}`);
      console.log(`  ${finding.message}`);
    }
    
    // Export results
    const jsonOutput = reporter.format(result, 'json');
    fs.writeFileSync('results.json', jsonOutput);
    
  } catch (error) {
    console.error('Scan failed:', error);
  }
}

scanProject('./my-mcp-server');
```

### Custom Filtering

```typescript
import { Scanner, RiskScorer } from '@mcp-safeguard/core';

async function scanWithFiltering(path: string) {
  const scanner = new Scanner();
  const scorer = new RiskScorer();
  
  const result = await scanner.scan(path);
  
  // Filter high-severity findings
  const criticalFindings = result.findings.filter(
    f => f.severity === 'ERROR'
  );
  
  // Filter by category
  const supplyChainIssues = result.findings.filter(
    f => f.category === 'supply-chain'
  );
  
  // Calculate risk for specific findings
  const supplyChainRisk = scorer.calculateScore(supplyChainIssues);
  
  console.log(`Critical issues: ${criticalFindings.length}`);
  console.log(`Supply chain risk: ${supplyChainRisk.toFixed(2)}`);
  
  return {
    critical: criticalFindings,
    supplyChain: supplyChainIssues,
    supplyChainRisk
  };
}
```

### Runtime Protection

```typescript
import { MCPSafeguardRuntime } from '@mcp-safeguard/runtime';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';

// Initialize runtime protection
const shield = new MCPSafeguardRuntime({
  blockDangerousTools: true,
  maxToolCallsPerMinute: 60,
  promptInjectionDetection: true,
  auditLogPath: './logs/audit.log'
});

shield.init();

// Create MCP server
const server = new Server(
  {
    name: 'protected-server',
    version: '1.0.0'
  },
  {
    capabilities: {
      tools: {}
    }
  }
);

// Register tools with protection
server.setRequestHandler('tools/call', async (request) => {
  const { name, arguments: args } = request.params;
  
  // Wrap tool execution
  const safeTool = shield.wrapToolCall(name, async (args) => {
    // Your tool implementation
    return executeToolLogic(name, args);
  });
  
  try {
    const result = await safeTool(args);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result)
        }
      ]
    };
  } catch (error) {
    throw new Error(`Tool execution failed: ${error.message}`);
  }
});

// Validate prompts
server.setRequestHandler('prompts/get', async (request) => {
  const { name, arguments: args } = request.params;
  
  const promptText = generatePrompt(name, args);
  const validation = shield.validatePrompt(promptText);
  
  if (!validation.allowed) {
    throw new Error(`Prompt validation failed: ${validation.reason}`);
  }
  
  return {
    messages: [
      {
        role: 'user',
        content: {
          type: 'text',
          text: promptText
        }
      }
    ]
  };
});

// Graceful shutdown
process.on('SIGINT', async () => {
  await shield.shutdown();
  process.exit(0);
});
```

### Custom Validation Hook

```typescript
import { MCPSafeguardRuntime, ValidationContext, ValidationResult } from '@mcp-safeguard/runtime';

// Custom validation hook
const businessRulesHook = {
  async validate(context: ValidationContext): Promise<ValidationResult> {
    // Custom business logic
    if (context.toolName === 'sensitive-operation') {
      const userId = context.metadata?.userId;
      
      // Check permissions
      const hasPermission = await checkUserPermissions(userId);
      
      if (!hasPermission) {
        return {
          allowed: false,
          reason: 'User does not have permission for this operation',
          confidence: 1.0
        };
      }
    }
    
    return { allowed: true };
  }
};

// Use custom hook
const shield = new MCPSafeguardRuntime({
  validationHooks: [businessRulesHook]
});

shield.init();
```

### Monitoring and Metrics

```typescript
import { MCPSafeguardRuntime } from '@mcp-safeguard/runtime';

const shield = new MCPSafeguardRuntime();
shield.init();

// Periodically log metrics
setInterval(() => {
  const allMetrics = shield.getAllMetrics();
  
  console.log('=== Tool Metrics ===');
  for (const [toolName, metrics] of allMetrics) {
    console.log(`${toolName}:`);
    console.log(`  Calls: ${metrics.callCount}`);
    console.log(`  Errors: ${metrics.errorCount}`);
    console.log(`  Error rate: ${(metrics.errorCount / metrics.callCount * 100).toFixed(2)}%`);
    
    if (metrics.lastError) {
      console.log(`  Last error: ${metrics.lastError.message}`);
    }
  }
}, 60000); // Every minute
```

---

## Error Handling

All async methods can throw errors. Always use try-catch:

```typescript
import { Scanner } from '@mcp-safeguard/core';

const scanner = new Scanner();

try {
  const result = await scanner.scan('./path');
} catch (error) {
  if (error.message.includes('Semgrep is not installed')) {
    console.error('Please install Semgrep: pip install semgrep');
  } else if (error.code === 'ENOENT') {
    console.error('Path not found:', error.path);
  } else {
    console.error('Scan failed:', error.message);
  }
}
```

---

## CLI Integration

Use programmatically in Node.js scripts:

```typescript
import { Scanner, Reporter } from '@mcp-safeguard/core';
import { writeFile } from 'fs/promises';

async function main() {
  const args = process.argv.slice(2);
  const targetPath = args[0] || '.';
  
  const scanner = new Scanner();
  const reporter = new Reporter();
  
  const result = await scanner.scan(targetPath);
  
  // Save reports
  await writeFile('report.json', reporter.format(result, 'json'));
  await writeFile('report.sarif', reporter.format(result, 'sarif'));
  
  // Exit with appropriate code
  process.exit(result.summary.bySeverity.ERROR > 0 ? 1 : 0);
}

main().catch(console.error);
```

---

## Additional Resources

- [TypeScript Definitions](https://github.com/Li-Bailiang/mcp-safeguard/tree/main/packages/core/src/types.ts)
- [Examples Directory](https://github.com/Li-Bailiang/mcp-safeguard/tree/main/examples)
- [Source Code](https://github.com/Li-Bailiang/mcp-safeguard)
