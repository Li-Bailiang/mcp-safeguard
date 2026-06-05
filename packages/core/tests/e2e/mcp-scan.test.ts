/**
 * End-to-end scanner tests against the committed fixtures.
 *
 * These run the real Scanner (and real Semgrep) and assert the contract that
 * matters for a security tool's credibility:
 *   - vulnerable-* fixtures MUST report (true positives)
 *   - safe-* fixtures MUST stay clean (no false positives)
 *   - the MCP-specific threat rules fire on MCP-shaped attacks and nothing else
 */
import { describe, it, expect, before, after } from '../helpers/expect.js';
import { Scanner } from '../../src/scanner.js';
import { join } from 'path';
import { cp, mkdtemp, rm } from 'fs/promises';
import { tmpdir } from 'os';

const REPO_ROOT = join(__dirname, '..', '..', '..', '..');
const SOURCE_FIXTURES = join(REPO_ROOT, 'tests', 'fixtures');
const MCP_THREATS = join(__dirname, '..', '..', 'rules', 'test', 'mcp-threats');

const scanner = new Scanner();
const checkIds = (r: { findings: { check_id: string }[] }) => r.findings.map((f) => f.check_id);
let tempRoot = '';
let fixtures = SOURCE_FIXTURES;

before(async () => {
  tempRoot = await mkdtemp(join(tmpdir(), 'mcp-safeguard-e2e-'));
  fixtures = join(tempRoot, 'fixtures');
  await cp(SOURCE_FIXTURES, fixtures, { recursive: true });
});

after(async () => {
  if (tempRoot) {
    await rm(tempRoot, { recursive: true, force: true });
  }
});

describe('e2e: vulnerable fixtures must report', () => {
  it('flags the vulnerable MCP server (command injection, eval, etc.)', async () => {
    const result = await scanner.scan(join(fixtures, 'vulnerable-extended'));
    expect(result.summary.total).toBeGreaterThan(0);
    expect(result.summary.bySeverity.ERROR).toBeGreaterThanOrEqual(5);
    const ids = checkIds(result);
    expect(ids).toContain('mcp-suspicious-exec-package'); // command injection
    expect(ids).toContain('mcp-suspicious-eval'); // eval()
  });
});

describe('e2e: safe fixtures must stay clean', () => {
  it('produces no findings on the hardened safe MCP server', async () => {
    const result = await scanner.scan(join(fixtures, 'safe-extended'));
    expect(result.summary.bySeverity.ERROR).toBe(0);
    expect(result.summary.total).toBe(0);
  });
});

describe('e2e: MCP-specific threat rules', () => {
  it('detects tool poisoning / rug-pull / shadowing / credential passthrough (TS)', async () => {
    const result = await scanner.scan(join(MCP_THREATS, 'positive.ts'));
    const ids = checkIds(result);
    expect(ids).toContain('mcp-tool-poisoning');
    expect(ids).toContain('mcp-tool-description-dynamic');
    expect(ids).toContain('mcp-cross-server-shadowing');
    expect(ids).toContain('mcp-credential-passthrough');
  });

  it('does not flag a clean MCP server (TS)', async () => {
    const result = await scanner.scan(join(MCP_THREATS, 'negative.ts'));
    expect(result.summary.total).toBe(0);
  });

  it('detects tool poisoning / shadowing (Python)', async () => {
    const result = await scanner.scan(join(MCP_THREATS, 'positive.py'));
    const ids = checkIds(result);
    expect(ids).toContain('mcp-python-tool-poisoning');
    expect(ids).toContain('mcp-python-cross-server-shadowing');
  });

  it('does not flag a clean MCP server (Python)', async () => {
    const result = await scanner.scan(join(MCP_THREATS, 'negative.py'));
    expect(result.summary.total).toBe(0);
  });
});
