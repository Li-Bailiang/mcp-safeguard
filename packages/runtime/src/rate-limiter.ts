/**
 * Token bucket rate limiter implementation
 */

import { RateLimitConfig } from './types';

export class RateLimiter {
  private tokens: number;
  private lastRefillTime: number;
  private maxTokens: number;
  private refillRate: number;

  /**
   * @param config Either a token-bucket config, or a number representing the
   *               maximum number of calls allowed per minute.
   */
  constructor(config: RateLimitConfig | number) {
    if (typeof config === 'number') {
      // Treat as "max calls per minute"
      this.maxTokens = config;
      this.refillRate = config / 60; // tokens per second
    } else {
      this.maxTokens = config.maxTokens;
      this.refillRate = config.refillRate;
    }
    this.tokens = this.maxTokens;
    this.lastRefillTime = Date.now();
  }

  /**
   * Attempt to consume tokens. Returns true if successful, false if rate limited.
   */
  tryConsume(tokens: number = 1): boolean {
    this.refill();

    if (this.tokens >= tokens) {
      this.tokens -= tokens;
      return true;
    }

    return false;
  }

  /**
   * Refill tokens based on time elapsed
   */
  private refill(): void {
    const now = Date.now();
    const timePassed = now - this.lastRefillTime;
    const tokensToAdd = (timePassed / 1000) * this.refillRate;

    this.tokens = Math.min(this.maxTokens, this.tokens + tokensToAdd);
    this.lastRefillTime = now;
  }

  /**
   * Get current token count
   */
  getTokens(): number {
    this.refill();
    return this.tokens;
  }

  /**
   * Alias for getTokens() (backwards compatibility)
   */
  getTokenCount(): number {
    return this.getTokens();
  }

  /**
   * Reset the rate limiter to full capacity
   */
  reset(): void {
    this.tokens = this.maxTokens;
    this.lastRefillTime = Date.now();
  }
}
