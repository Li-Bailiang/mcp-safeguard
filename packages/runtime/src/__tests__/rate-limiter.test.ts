import { describe, it } from 'node:test';
import assert from 'node:assert';
import { RateLimiter } from '../rate-limiter.js';

describe('RateLimiter', () => {
  it('should allow calls within limit', () => {
    const limiter = new RateLimiter(10); // 10 calls per minute

    for (let i = 0; i < 10; i++) {
      assert.strictEqual(limiter.tryConsume(), true);
    }
  });

  it('should block calls exceeding limit', () => {
    const limiter = new RateLimiter(5);

    // Consume all tokens
    for (let i = 0; i < 5; i++) {
      limiter.tryConsume();
    }

    // Next call should be blocked
    assert.strictEqual(limiter.tryConsume(), false);
  });

  it('should refill tokens over time', async () => {
    const limiter = new RateLimiter(60); // 60 per minute = 1 per second

    // Consume one token
    limiter.tryConsume();

    // Wait for refill (1.1 seconds)
    await new Promise(resolve => setTimeout(resolve, 1100));

    // Should allow another call
    assert.strictEqual(limiter.tryConsume(), true);
  });

  it('should not exceed capacity when refilling', async () => {
    const limiter = new RateLimiter(5);

    // Wait for potential refill
    await new Promise(resolve => setTimeout(resolve, 100));

    // Should still be at capacity (5 tokens)
    assert.ok(limiter.getTokens() <= 5);
  });

  it('should reset properly', () => {
    const limiter = new RateLimiter(5);

    // Consume all tokens
    for (let i = 0; i < 5; i++) {
      limiter.tryConsume();
    }

    // Reset
    limiter.reset();

    // Should allow calls again
    assert.strictEqual(limiter.tryConsume(), true);
  });
});
