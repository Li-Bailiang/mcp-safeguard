import { describe, it } from 'node:test';
import assert from 'node:assert';
import { CircuitBreaker } from '../circuit-breaker.js';

describe('CircuitBreaker', () => {
  it('should allow calls when closed', () => {
    const breaker = new CircuitBreaker(3, 1000);
    assert.strictEqual(breaker.allowCall(), true);
  });

  it('should open after threshold failures', () => {
    const breaker = new CircuitBreaker(3, 1000);

    // Record failures
    breaker.recordFailure();
    breaker.recordFailure();
    breaker.recordFailure();

    // Should be open now
    assert.strictEqual(breaker.getState().state, 'open');
    assert.strictEqual(breaker.allowCall(), false);
  });

  it('should transition to half-open after timeout', async () => {
    const breaker = new CircuitBreaker(2, 100); // 100ms timeout

    // Open the breaker
    breaker.recordFailure();
    breaker.recordFailure();

    assert.strictEqual(breaker.getState().state, 'open');

    // Wait for timeout
    await new Promise(resolve => setTimeout(resolve, 150));

    // Should allow one call (half-open)
    assert.strictEqual(breaker.allowCall(), true);
    assert.strictEqual(breaker.getState().state, 'half-open');
  });

  it('should close on success in half-open state', async () => {
    const breaker = new CircuitBreaker(2, 100);

    // Open the breaker
    breaker.recordFailure();
    breaker.recordFailure();

    // Wait for half-open
    await new Promise(resolve => setTimeout(resolve, 150));
    breaker.allowCall(); // Transition to half-open

    // Record success
    breaker.recordSuccess();

    // Should be closed now
    assert.strictEqual(breaker.getState().state, 'closed');
    assert.strictEqual(breaker.getState().failureCount, 0);
  });

  it('should track failure count', () => {
    const breaker = new CircuitBreaker(5, 1000);

    breaker.recordFailure();
    breaker.recordFailure();

    const state = breaker.getState();
    assert.strictEqual(state.failureCount, 2);
  });

  it('should reset properly', () => {
    const breaker = new CircuitBreaker(2, 1000);

    breaker.recordFailure();
    breaker.recordFailure();

    breaker.reset();

    const state = breaker.getState();
    assert.strictEqual(state.state, 'closed');
    assert.strictEqual(state.failureCount, 0);
  });
});
