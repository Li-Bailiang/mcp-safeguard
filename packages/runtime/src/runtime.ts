/**
 * MCP Safeguard Runtime - Core runtime protection logic
 */

import {
  RuntimeOptions,
  ValidationResult,
  AuditEvent,
  CircuitBreakerState,
  ToolCallMetrics,
  ValidationHook,
  ValidationContext,
} from './types';
import { PromptValidator } from './validators';
import { RateLimiter } from './rate-limiter';
import { AuditLogger } from './audit-logger';

/**
 * Default set of tool names treated as dangerous when `blockDangerousTools`
 * is enabled. Names are matched case-insensitively.
 */
const DEFAULT_DANGEROUS_TOOLS = [
  'exec',
  'eval',
  'system',
  'shell',
  'bash',
  'sh',
  'spawn',
  'fork',
  'child_process',
  'rm',
  'rmdir',
  'unlink',
  'powershell',
  'cmd',
];

/**
 * Internal, fully-normalized view of the runtime configuration. The public
 * {@link RuntimeOptions} surface accepts several aliases / ergonomic shortcuts;
 * these are all resolved once in the constructor so the rest of the class can
 * work against a single canonical shape.
 */
interface NormalizedOptions {
  allowList?: string[];
  blockList: string[];
  /** Lower-cased set of dangerous tool names to block (empty when disabled). */
  dangerousTools: Set<string>;
  promptInjectionDetection: boolean;
  auditLogging: boolean;
  auditLogPath?: string;
  validationHooks: ValidationHook[];
  rateLimit?: {
    maxTokens: number;
    refillRate: number;
    windowMs?: number;
  };
  circuitBreaker?: {
    threshold: number;
    timeout: number;
  };
}

export class MCPSafeguardRuntime {
  private options: NormalizedOptions;
  private rateLimiters: Map<string, RateLimiter>;
  private auditLogger: AuditLogger;
  private circuitBreakers: Map<string, CircuitBreakerState>;
  private metrics: Map<string, ToolCallMetrics>;
  private initialized: boolean = false;

  constructor(options: RuntimeOptions = {}) {
    this.options = MCPSafeguardRuntime.normalizeOptions(options);

    this.rateLimiters = new Map();
    this.circuitBreakers = new Map();
    this.metrics = new Map();
    this.auditLogger = new AuditLogger(this.options.auditLogPath);
  }

  /**
   * Resolve the public option surface (with all of its aliases and ergonomic
   * shortcuts) into a single canonical configuration object.
   */
  private static normalizeOptions(options: RuntimeOptions): NormalizedOptions {
    // Allow / block lists: support both the canonical names and their aliases.
    const allowList = options.allowList ?? options.allowedTools;
    const blockList = options.blockList ?? options.blockedTools ?? [];

    // Dangerous tools: only active when explicitly requested. When active we
    // start from a sensible default set and merge in any custom names.
    const dangerousTools = new Set<string>();
    if (options.blockDangerousTools) {
      for (const name of DEFAULT_DANGEROUS_TOOLS) {
        dangerousTools.add(name.toLowerCase());
      }
      for (const name of options.dangerousTools ?? []) {
        dangerousTools.add(name.toLowerCase());
      }
    }

    // Audit logging: `logAllInteractions` and `auditLogging` are both honored.
    // An explicit value (true OR false) on either wins, in that order, and we
    // default to enabled when nothing is specified.
    const auditLogging = options.auditLogging ?? options.logAllInteractions ?? true;

    // Rate limiting: an explicit `rateLimit` config takes precedence; otherwise
    // a positive `maxToolCallsPerMinute` is mapped onto the token-bucket
    // limiter (capacity = N tokens, refill = N/60 tokens per second).
    let rateLimit: NormalizedOptions['rateLimit'];
    if (options.rateLimit) {
      const { maxTokens = 10, refillRate = 1, windowMs } = options.rateLimit;
      rateLimit = { maxTokens, refillRate, windowMs };
    } else if (
      typeof options.maxToolCallsPerMinute === 'number' &&
      options.maxToolCallsPerMinute > 0
    ) {
      const perMinute = options.maxToolCallsPerMinute;
      rateLimit = { maxTokens: perMinute, refillRate: perMinute / 60 };
    }

    // Circuit breaker: accept the canonical `threshold`/`timeout`, the
    // `failureThreshold`/`resetTimeout` aliases inside the config object, and
    // the top-level `circuitBreakerThreshold`/`circuitBreakerTimeout` aliases.
    const cb = options.circuitBreaker;
    const threshold =
      cb?.threshold ??
      cb?.failureThreshold ??
      options.circuitBreakerThreshold ??
      5;
    const timeout =
      cb?.timeout ??
      cb?.resetTimeout ??
      options.circuitBreakerTimeout ??
      60000;

    return {
      allowList,
      blockList,
      dangerousTools,
      promptInjectionDetection: options.promptInjectionDetection ?? true,
      auditLogging,
      auditLogPath: options.auditLogPath,
      validationHooks: options.validationHooks ?? [],
      rateLimit,
      circuitBreaker: { threshold, timeout },
    };
  }

  /**
   * Initialize the runtime
   */
  init(): void {
    if (this.initialized) {
      return;
    }

    // Per-tool rate limiters are created lazily on first use (see
    // getRateLimiter), so there is nothing to pre-create here.

    this.initialized = true;

    if (this.options.auditLogging) {
      this.auditLog({
        timestamp: Date.now(),
        type: 'tool_call',
        allowed: true,
        metadata: { action: 'runtime_initialized' },
      });
    }
  }

  /**
   * Wrap a tool function with protection logic
   */
  wrapToolCall(toolName: string, toolFn: Function): Function {
    const self = this;

    return async function wrappedTool(...args: any[]) {
      // Check allow/block lists (and the dangerous-tools deny set).
      const accessCheck = self.checkToolAccess(toolName);
      if (!accessCheck.allowed) {
        self.auditLog({
          timestamp: Date.now(),
          type: 'tool_call',
          toolName,
          allowed: false,
          reason: accessCheck.reason,
        });
        throw new Error(accessCheck.reason);
      }

      // Run custom validation hooks before doing anything expensive.
      const hookCheck = await self.runValidationHooks(toolName, args);
      if (!hookCheck.allowed) {
        self.auditLog({
          timestamp: Date.now(),
          type: 'tool_call',
          toolName,
          allowed: false,
          reason: hookCheck.reason,
        });
        throw new Error(hookCheck.reason);
      }

      // Check circuit breaker.
      const circuitCheck = self.checkCircuitBreaker(toolName);
      if (!circuitCheck.allowed) {
        self.auditLog({
          timestamp: Date.now(),
          type: 'circuit_breaker',
          toolName,
          allowed: false,
          reason: circuitCheck.reason,
        });
        throw new Error(circuitCheck.reason);
      }

      // Check rate limit.
      if (self.options.rateLimit) {
        const rateLimiter = self.getRateLimiter(toolName);
        if (!rateLimiter.tryConsume(1)) {
          self.auditLog({
            timestamp: Date.now(),
            type: 'rate_limit',
            toolName,
            allowed: false,
            reason: 'Rate limit exceeded',
          });
          throw new Error(
            `Rate limit exceeded: rate limit reached for tool "${toolName}"`
          );
        }
      }

      // Execute the tool.
      try {
        const result = await toolFn(...args);

        // Success - update metrics and reset circuit breaker failure count.
        self.recordSuccess(toolName);
        self.recordMetricSuccess(toolName);

        self.auditLog({
          timestamp: Date.now(),
          type: 'tool_call',
          toolName,
          allowed: true,
        });

        return result;
      } catch (error) {
        // Record failure for circuit breaker and metrics.
        self.recordFailure(toolName);
        self.recordMetricFailure(
          toolName,
          error instanceof Error ? error : new Error(String(error))
        );

        self.auditLog({
          timestamp: Date.now(),
          type: 'error',
          toolName,
          allowed: false,
          reason: error instanceof Error ? error.message : 'Unknown error',
        });

        throw error;
      }
    };
  }

  /**
   * Validate a prompt for injection attempts
   */
  validatePrompt(prompt: string): ValidationResult {
    if (!this.options.promptInjectionDetection) {
      return { allowed: true, valid: true };
    }

    const result = PromptValidator.validatePrompt(prompt);

    if (this.options.auditLogging) {
      this.auditLog({
        timestamp: Date.now(),
        type: 'prompt_validation',
        allowed: result.valid ?? false,
        reason: result.reason,
        metadata: { threats: result.threats },
      });
    }

    return { ...result, allowed: result.valid ?? false };
  }

  /**
   * Get metrics for a specific tool, if it has been called.
   */
  getToolMetrics(toolName: string): ToolCallMetrics | undefined {
    return this.metrics.get(toolName);
  }

  /**
   * Log an audit event
   */
  auditLog(event: AuditEvent): void {
    if (!this.options.auditLogging) {
      return;
    }

    this.auditLogger.log(event);
  }

  /**
   * Shutdown the runtime
   */
  async shutdown(): Promise<void> {
    await this.auditLogger.close();
    this.initialized = false;
  }

  /**
   * Run all configured validation hooks for a tool call. Returns the first
   * disallowing result, or `{ allowed: true }` when every hook passes.
   */
  private async runValidationHooks(
    toolName: string,
    args: any[]
  ): Promise<{ allowed: boolean; reason?: string }> {
    if (this.options.validationHooks.length === 0) {
      return { allowed: true };
    }

    const context: ValidationContext = { toolName, args };

    for (const hook of this.options.validationHooks) {
      const result = await hook.validate(context);
      if (result && result.allowed === false) {
        return {
          allowed: false,
          reason:
            result.reason ??
            `Tool call blocked by validation hook "${hook.name}"`,
        };
      }
    }

    return { allowed: true };
  }

  /**
   * Check if a tool is allowed based on the dangerous-tool deny set and the
   * allow/block lists. Returned `reason` strings are crafted so callers can
   * surface them directly as error messages.
   */
  private checkToolAccess(toolName: string): { allowed: boolean; reason?: string } {
    // Dangerous tools (when blockDangerousTools is enabled).
    if (this.options.dangerousTools.has(toolName.toLowerCase())) {
      return {
        allowed: false,
        reason: `Tool call blocked: "${toolName}" is a dangerous tool and is blocked`,
      };
    }

    // Explicit block list.
    if (this.options.blockList.includes(toolName)) {
      return {
        allowed: false,
        reason: `Tool call blocked: "${toolName}" is in the block list`,
      };
    }

    // Allow list (when defined and non-empty, only listed tools are allowed).
    if (this.options.allowList && this.options.allowList.length > 0) {
      if (!this.options.allowList.includes(toolName)) {
        return {
          allowed: false,
          reason: `Tool call blocked: "${toolName}" is not in allowlist`,
        };
      }
    }

    return { allowed: true };
  }

  /**
   * Get or create a per-tool rate limiter sized from the resolved rate-limit
   * config. Each distinct tool name gets its own token bucket so that one
   * tool exhausting its budget cannot rate-limit unrelated tools.
   */
  private getRateLimiter(toolName: string): RateLimiter {
    let limiter = this.rateLimiters.get(toolName);

    if (!limiter) {
      if (!this.options.rateLimit) {
        throw new Error('Rate limiter not configured');
      }
      const { maxTokens, refillRate } = this.options.rateLimit;
      limiter = new RateLimiter({ maxTokens, refillRate });
      this.rateLimiters.set(toolName, limiter);
    }

    return limiter;
  }

  /**
   * Check circuit breaker state
   */
  private checkCircuitBreaker(toolName: string): { allowed: boolean; reason?: string } {
    if (!this.options.circuitBreaker) {
      return { allowed: true };
    }

    const state = this.getCircuitBreakerState(toolName);

    if (state.state === 'open') {
      const now = Date.now();
      if (state.nextAttemptTime && now >= state.nextAttemptTime) {
        // Transition to half-open.
        state.state = 'half-open';
        return { allowed: true };
      }
      return {
        allowed: false,
        reason: `Circuit breaker open: circuit breaker is open for tool "${toolName}" due to repeated failures`,
      };
    }

    return { allowed: true };
  }

  /**
   * Get or create circuit breaker state
   */
  private getCircuitBreakerState(toolName: string): CircuitBreakerState {
    let state = this.circuitBreakers.get(toolName);

    if (!state) {
      state = {
        state: 'closed',
        failureCount: 0,
      };
      this.circuitBreakers.set(toolName, state);
    }

    return state;
  }

  /**
   * Record a successful tool call
   */
  private recordSuccess(toolName: string): void {
    if (!this.options.circuitBreaker) {
      return;
    }

    const state = this.getCircuitBreakerState(toolName);

    if (state.state === 'half-open') {
      // Success in half-open state - close the circuit.
      state.state = 'closed';
      state.failureCount = 0;
    } else {
      // Reset failure count on success.
      state.failureCount = 0;
    }
  }

  /**
   * Record a failed tool call
   */
  private recordFailure(toolName: string): void {
    if (!this.options.circuitBreaker) {
      return;
    }

    const state = this.getCircuitBreakerState(toolName);
    state.failureCount++;
    state.lastFailureTime = Date.now();

    if (state.failureCount >= this.options.circuitBreaker.threshold) {
      // Open the circuit.
      state.state = 'open';
      state.nextAttemptTime = Date.now() + this.options.circuitBreaker.timeout;
    }
  }

  /**
   * Get or create the metrics record for a tool.
   */
  private getMetrics(toolName: string): ToolCallMetrics {
    let metrics = this.metrics.get(toolName);
    if (!metrics) {
      metrics = { callCount: 0, lastCallTime: 0, errorCount: 0 };
      this.metrics.set(toolName, metrics);
    }
    return metrics;
  }

  /**
   * Record a successful invocation in the per-tool metrics.
   */
  private recordMetricSuccess(toolName: string): void {
    const metrics = this.getMetrics(toolName);
    metrics.callCount++;
    metrics.lastCallTime = Date.now();
  }

  /**
   * Record a failed invocation in the per-tool metrics.
   */
  private recordMetricFailure(toolName: string, error: Error): void {
    const metrics = this.getMetrics(toolName);
    metrics.callCount++;
    metrics.lastCallTime = Date.now();
    metrics.errorCount++;
    metrics.lastError = error;
  }
}
