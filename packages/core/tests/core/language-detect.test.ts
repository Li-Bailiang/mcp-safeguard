import { describe, it, expect } from '../helpers/expect.js';
import { detectLanguages } from '../../src/language-detect.js';
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

function tmp(): string {
  return mkdtempSync(join(tmpdir(), 'mcp-lang-'));
}

describe('detectLanguages', () => {
  it('detects JS/TS/Python/Go/Java/Rust by extension', async () => {
    const d = tmp();
    writeFileSync(join(d, 'a.ts'), 'export const x = 1;');
    writeFileSync(join(d, 'b.py'), 'x = 1');
    writeFileSync(join(d, 'c.go'), 'package main');
    writeFileSync(join(d, 'd.java'), 'class D {}');
    writeFileSync(join(d, 'e.rs'), 'fn main() {}');
    const langs = await detectLanguages(d);
    expect(langs.has('typescript')).toBe(true);
    expect(langs.has('python')).toBe(true);
    expect(langs.has('go')).toBe(true);
    expect(langs.has('java')).toBe(true);
    expect(langs.has('rust')).toBe(true);
    rmSync(d, { recursive: true, force: true });
  });

  it('detects infrastructure files (Dockerfile)', async () => {
    const d = tmp();
    writeFileSync(join(d, 'Dockerfile'), 'FROM node:20');
    const langs = await detectLanguages(d);
    expect(langs.has('infra')).toBe(true);
    rmSync(d, { recursive: true, force: true });
  });

  it('skips dependency/build directories like node_modules', async () => {
    const d = tmp();
    writeFileSync(join(d, 'index.ts'), 'const x = 1;');
    mkdirSync(join(d, 'node_modules', 'dep'), { recursive: true });
    writeFileSync(join(d, 'node_modules', 'dep', 'lib.go'), 'package dep');
    const langs = await detectLanguages(d);
    expect(langs.has('typescript')).toBe(true);
    // The .go file lives only inside node_modules, so go must NOT be detected.
    expect(langs.has('go')).toBe(false);
    rmSync(d, { recursive: true, force: true });
  });

  it('handles a single file path', async () => {
    const d = tmp();
    const file = join(d, 'only.rs');
    writeFileSync(file, 'fn main() {}');
    const langs = await detectLanguages(file);
    expect(langs.has('rust')).toBe(true);
    rmSync(d, { recursive: true, force: true });
  });

  it('returns an empty set for a non-existent path', async () => {
    const langs = await detectLanguages(join(tmpdir(), 'definitely-does-not-exist-12345'));
    expect(langs.size).toBe(0);
  });
});
