/**
 * Runtime protection SDK types
 */

export interface RuntimeOptions {
  /** Block dangerous tools like exec, eval, etc. */
  blockDangerousTools?: boolean;
  /** Custom list of tool names treated as dangerous (defaults applied when blockDangerousTools is true) */
  dangerousTools?: string[];
  /** Log all tool interactions to audit log */
  logAllInteractions?: boolean;
  /** Maximum tool calls allowed per minute (0 = unlimited) */
  maxToolCallsPerMinute?: number;
  /** Whitelist of allowed tools (empty = all allowed) */
  allowedTools?: string[];
  /** Alias for allowedTools */
  allowList?: string[];
  /** Blacklist of blocked tools */
  blockedTools?: string[];
  /** Alias for blockedTools */
  blockList?: string[];
  /** Enable prompt injection detection */
  promptInjectionDetection?: boolean;
  /** Path to audit log file */
  auditLogPath?: string;
  /** Enable audit logging */
  auditLogging?: boolean;
  /** Custom validation hooks */
  validationHooks?: ValidationHook[];
  /** Rate limiting configuration */
  rateLimit?: {
    maxTokens?: number;
    refillRate?: number;
    windowMs?: number;
  };
  /** Circuit breaker configuration */
  circuitBreaker?: {
    threshold?: number;
    timeout?: number;
    failureThreshold?: number;
    resetTimeout?: number;
  };
  /** Circuit breaker threshold (failures before opening) */
  circuitBreakerThreshold?: number;
  /** Circuit breaker timeout in ms */
  circuitBreakerTimeout?: number;
}

export interface ValidationResult {
  allowed: boolean;
  valid?: boolean;
  safe?: boolean;
  reason?: string;
  confidence?: number;
  detectedPatterns?: string[];
  threats?: string[];
}

export interface AuditEvent {
  timestamp: number;
  /** Canonical event type */
  type?: 'tool_call' | 'prompt_validation' | 'rate_limit' | 'circuit_breaker' | 'error';
  /** Alias for `type` (accepted on input, normalized to `type`) */
  eventType?: string;
  toolName?: string;
  /** Whether the action was allowed/permitted */
  allowed?: boolean;
  /** Alias for `allowed` (accepted on input, normalized to `success`) */
  success?: boolean;
  reason?: string;
  metadata?: Record<string, any>;
}

export interface RateLimitConfig {
  maxTokens: number;
  refillRate: number;
  windowMs?: number;
}

export interface CircuitBreakerConfig {
  threshold?: number;
  timeout?: number;
  failureThreshold?: number;
  resetTimeout?: number;
}

export type CircuitState = 'closed' | 'open' | 'half-open';

export interface ValidationHook {
  name: string;
  validate: (context: ValidationContext) => Promise<ValidationResult> | ValidationResult;
}

export interface ValidationContext {
  toolName?: string;
  args?: any[];
  prompt?: string;
  metadata?: Record<string, any>;
}

export interface ToolCallMetrics {
  callCount: number;
  lastCallTime: number;
  errorCount: number;
  lastError?: Error;
}

export interface CircuitBreakerState {
  state: 'closed' | 'open' | 'half-open';
  failureCount: number;
  lastFailureTime?: number;
  nextAttemptTime?: number;
}
