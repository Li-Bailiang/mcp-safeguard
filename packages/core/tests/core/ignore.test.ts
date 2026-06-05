import { describe, it, expect } from '../helpers/expect.js';
import { IgnoreManager } from '../../src/ignore.js';
import { mkdtempSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('IgnoreManager default patterns', () => {
  const ig = new IgnoreManager();

  it('ignores node_modules, dist, build, *.log, .env*', () => {
    expect(ig.shouldIgnore('node_modules/pkg/index.js')).toBe(true);
    expect(ig.shouldIgnore('dist/index.js')).toBe(true);
    expect(ig.shouldIgnore('build/output.js')).toBe(true);
    expect(ig.shouldIgnore('app.log')).toBe(true);
    expect(ig.shouldIgnore('.env')).toBe(true);
    expect(ig.shouldIgnore('.env.local')).toBe(true);
  });

  it('does not ignore ordinary source files', () => {
    expect(ig.shouldIgnore('src/index.ts')).toBe(false);
    expect(ig.shouldIgnore('packages/core/src/scanner.ts')).toBe(false);
  });
});

describe('IgnoreManager .mcpignore loading', () => {
  it('applies custom patterns from .mcpignore', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'mcp-ignore-'));
    writeFileSync(join(dir, '.mcpignore'), 'custom-dir/\n*.generated.ts\n');
    const ig = new IgnoreManager();
    await ig.loadIgnoreFile(dir);

    expect(ig.shouldIgnore('custom-dir/file.js')).toBe(true);
    expect(ig.shouldIgnore('x.generated.ts')).toBe(true);
    expect(ig.shouldIgnore('src/real.ts')).toBe(false);
    rmSync(dir, { recursive: true, force: true });
  });

  it('does not throw when .mcpignore is absent', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'mcp-ignore-none-'));
    const ig = new IgnoreManager();
    await ig.loadIgnoreFile(dir); // should silently use defaults
    expect(ig.shouldIgnore('node_modules/x.js')).toBe(true);
    rmSync(dir, { recursive: true, force: true });
  });
});

describe('IgnoreManager absolute-path handling', () => {
  it('relativizes absolute paths under the base and never throws on outside paths', () => {
    const base = process.platform === 'win32' ? 'C:\\proj' : '/proj';
    const inside = process.platform === 'win32' ? 'C:\\proj\\node_modules\\a.js' : '/proj/node_modules/a.js';
    const outside = process.platform === 'win32' ? 'C:\\other\\a.js' : '/other/a.js';
    const ig = new IgnoreManager(base);

    expect(ig.shouldIgnore(inside)).toBe(true);
    // Outside the base dir: must not throw and must not be ignored.
    expect(ig.shouldIgnore(outside)).toBe(false);
  });
});
