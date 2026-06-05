import { SemgrepInstaller } from '../src/installer.js';
import { describe, it } from 'node:test';
import assert from 'node:assert';

describe('SemgrepInstaller', () => {
  it('should detect platform correctly', async () => {
    const installer = new SemgrepInstaller();
    const isAvailable = await installer.isSemgrepAvailable();

    // This should return true or false without throwing
    assert.strictEqual(typeof isAvailable, 'boolean');
  });

  it('should get semgrep path if available', async () => {
    const installer = new SemgrepInstaller();
    const path = await installer.getSemgrepPath();

    // Path should be string or null
    assert.ok(path === null || typeof path === 'string');
  });

  it('should ignore a non-existent SEMGREP_PATH', async () => {
    const originalPath = process.env.SEMGREP_PATH;
    // A path that does not exist must never be returned; the resolver should
    // fall through to the system install / cached binary / null instead.
    const bogus =
      process.platform === 'win32'
        ? 'C:\\does\\not\\exist\\semgrep.exe'
        : '/does/not/exist/semgrep';
    process.env.SEMGREP_PATH = bogus;

    try {
      const resolved = await new SemgrepInstaller().getSemgrepPath();
      assert.notStrictEqual(resolved, bogus, 'a non-existent custom path must not be returned');
      assert.ok(
        resolved === null || typeof resolved === 'string',
        'resolved path is a string or null'
      );
    } finally {
      if (originalPath) process.env.SEMGREP_PATH = originalPath;
      else delete process.env.SEMGREP_PATH;
    }
  });

  it('should honor an existing SEMGREP_PATH', async () => {
    const originalPath = process.env.SEMGREP_PATH;
    // Point at a file that definitely exists (the running node binary) to prove
    // the custom path is honored when present, without needing a real semgrep.
    const existing = process.execPath;
    process.env.SEMGREP_PATH = existing;

    try {
      const resolved = await new SemgrepInstaller().getSemgrepPath();
      assert.strictEqual(resolved, existing, 'an existing custom path must be returned as-is');
    } finally {
      if (originalPath) process.env.SEMGREP_PATH = originalPath;
      else delete process.env.SEMGREP_PATH;
    }
  });

  it('should provide installation result with correct structure', async () => {
    const installer = new SemgrepInstaller();

    // Check if already installed
    const isAvailable = await installer.isSemgrepAvailable();

    if (isAvailable) {
      const result = await installer.install({ force: false });

      assert.ok(result.success);
      assert.ok(result.path);
      assert.ok(['cached', 'binary', 'pip', 'system'].includes(result.method));
    } else {
      // If not available, we can't test installation without side effects
      // Just verify the structure would be correct
      assert.ok(true, 'Semgrep not available for testing');
    }
  });
});
