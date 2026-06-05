/**
 * Minimal Jest/Vitest-style `expect` shim backed by node:assert.
 *
 * The project standardizes on the built-in `node:test` runner. A couple of
 * test files were originally authored against Vitest's `expect` API; rather
 * than pull in Vitest as a dependency just for those, this shim provides the
 * small subset of matchers they use so the test bodies stay unchanged.
 *
 * Re-exports `describe`/`it`/`before`/`after` from node:test (with `beforeAll`/
 * `afterAll` aliases) so a single import line is all that needs to change.
 */
import { strict as assert } from 'node:assert';

export { describe, it, before, after, beforeEach, afterEach } from 'node:test';
export { before as beforeAll, after as afterAll } from 'node:test';

class Expectation {
  constructor(private readonly actual: any, private readonly negated = false) {}

  get not(): Expectation {
    return new Expectation(this.actual, !this.negated);
  }

  private check(pass: boolean, message: string): void {
    if (this.negated) {
      assert.ok(!pass, `Expected NOT: ${message}`);
    } else {
      assert.ok(pass, message);
    }
  }

  toBe(expected: any): void {
    this.check(
      Object.is(this.actual, expected),
      `expected ${format(this.actual)} to be ${format(expected)}`
    );
  }

  toEqual(expected: any): void {
    let equal = true;
    try {
      assert.deepStrictEqual(this.actual, expected);
    } catch {
      equal = false;
    }
    this.check(equal, `expected ${format(this.actual)} to deep-equal ${format(expected)}`);
  }

  toBeDefined(): void {
    this.check(this.actual !== undefined, `expected value to be defined`);
  }

  toBeUndefined(): void {
    this.check(this.actual === undefined, `expected value to be undefined`);
  }

  toBeTruthy(): void {
    this.check(Boolean(this.actual), `expected ${format(this.actual)} to be truthy`);
  }

  toBeFalsy(): void {
    this.check(!this.actual, `expected ${format(this.actual)} to be falsy`);
  }

  toBeNull(): void {
    this.check(this.actual === null, `expected ${format(this.actual)} to be null`);
  }

  toBeGreaterThan(expected: number): void {
    this.check(this.actual > expected, `expected ${format(this.actual)} > ${format(expected)}`);
  }

  toBeGreaterThanOrEqual(expected: number): void {
    this.check(this.actual >= expected, `expected ${format(this.actual)} >= ${format(expected)}`);
  }

  toBeLessThan(expected: number): void {
    this.check(this.actual < expected, `expected ${format(this.actual)} < ${format(expected)}`);
  }

  toContain(expected: any): void {
    const ok =
      typeof this.actual === 'string'
        ? this.actual.includes(expected)
        : Array.isArray(this.actual) && this.actual.includes(expected);
    this.check(ok, `expected ${format(this.actual)} to contain ${format(expected)}`);
  }
}

function format(value: any): string {
  if (typeof value === 'string') return JSON.stringify(value);
  if (value === undefined) return 'undefined';
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

export function expect(actual: any): Expectation {
  return new Expectation(actual);
}
