import { CircuitBreakerState } from './types.js';

/**
 * Circuit breaker to prevent cascading failures
 */
export class CircuitBreaker {
  private state: CircuitBreakerState;
  private readonly threshold: number;
  private readonly timeout: number;

  constructor(threshold: number = 5, timeout: number = 60000) {
    this.threshold = threshold;
    this.timeout = timeout;
    this.state = {
      state: 'closed',
      failureCount: 0,
    };
  }

  /**
   * Check if circuit breaker allows the call
   */
  allowCall(): boolean {
    const now = Date.now();

    if (this.state.state === 'open') {
      // Check if we should try half-open
      if (this.state.nextAttemptTime && now >= this.state.nextAttemptTime) {
        this.state.state = 'half-open';
        return true;
      }
      return false;
    }

    return true;
  }

  /**
   * Record a successful call
   */
  recordSuccess(): void {
    if (this.state.state === 'half-open') {
      this.reset();
    }
  }

  /**
   * Record a failed call
   */
  recordFailure(): void {
    this.state.failureCount += 1;
    this.state.lastFailureTime = Date.now();

    if (this.state.failureCount >= this.threshold) {
      this.open();
    }
  }

  /**
   * Open the circuit breaker
   */
  private open(): void {
    this.state.state = 'open';
    this.state.nextAttemptTime = Date.now() + this.timeout;
  }

  /**
   * Reset the circuit breaker
   */
  reset(): void {
    this.state = {
      state: 'closed',
      failureCount: 0,
    };
  }

  /**
   * Get current state
   */
  getState(): CircuitBreakerState {
    return { ...this.state };
  }
}
