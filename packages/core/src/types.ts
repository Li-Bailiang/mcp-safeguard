export interface ScanResult {
  findings: Finding[];
  summary: ScanSummary;
  metadata: ScanMetadata;
}

export interface Finding {
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

export interface Location {
  line: number;
  col: number;
  offset?: number;
}

export interface FindingMetadata {
  category: string;
  confidence: string;
  impact: string;
  likelihood: string;
  subcategory?: string[];
  cwe?: string[];
  owasp?: string[];
  references?: string[];
  technology?: string[];
}

export type Severity = 'ERROR' | 'WARNING' | 'INFO';

export interface ScanSummary {
  total: number;
  bySeverity: Record<Severity, number>;
  byCategory: Record<string, number>;
  riskScore: number;
}

export interface ScanMetadata {
  version: string;
  timestamp: string;
  targetPath: string;
  rulesVersion: string;
  duration?: number;
  hasInfrastructure?: boolean;
}

export interface SemgrepOutput {
  results: SemgrepResult[];
  errors: any[];
  version?: string;
}

export interface SemgrepResult {
  check_id: string;
  path: string;
  start: Location;
  end: Location;
  extra: {
    lines: string;
    message: string;
    metadata: FindingMetadata;
    metavars?: Record<string, any>;
    severity: string;
  };
}

export interface ManifestData {
  name: string;
  version: string;
  dependencies: Record<string, string>;
  devDependencies?: Record<string, string>;
  mcpConfig?: any;
}

export type OutputFormat = 'json' | 'text' | 'sarif' | 'html';

export interface ConfigTypes {
  McpShieldConfig: any;
  ResolvedConfig: any;
  RuleConfig: any;
  RuleSeverity: 'error' | 'warn' | 'off';
  RuleOptions: any;
  SeverityConfig: any;
  OutputConfig: any;
}
