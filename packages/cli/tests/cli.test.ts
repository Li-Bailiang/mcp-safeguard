import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { existsSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

/**
 * Black-box tests for the CLI entry point.
 *
 * The entry calls `program.parse()` and `process.exit()` at module load, so it
 * cannot be imported safely. Instead we spawn the *built* `dist/index.js` — this
 * exercises exactly what an end user runs. Every case here is resolved by
 * Commander during argument parsing (before the scan action fires), so none of
 * them invoke Semgrep and the suite stays fast.
 *
 * Prerequisite: `pnpm build` (the canonical workflow is `pnpm build && pnpm test`).
 */
const CLI = resolve(__dirname, '..', 'dist', 'index.js');

interface RunResult {
  code: number;
  stdout: string;
  stderr: string;
}

function run(
  args: string[],
  options: { cwd?: string; env?: NodeJS.ProcessEnv } = {}
): Promise<RunResult> {
  return new Promise((resolvePromise) => {
    execFile(
      process.execPath,
      [CLI, ...args],
      {
        cwd: options.cwd,
        env: { ...process.env, ...options.env },
        maxBuffer: 10 * 1024 * 1024,
        timeout: 20_000,
      },
      (error: any, stdout, stderr) => {
        resolvePromise({
          code: error && typeof error.code === 'number' ? error.code : 0,
          stdout: stdout.toString(),
          stderr: stderr.toString(),
        });
      }
    );
  });
}

describe('mcp-safeguard CLI', () => {
  before(() => {
    assert.ok(
      existsSync(CLI),
      `Built CLI not found at ${CLI}. Run "pnpm build" before "pnpm test".`
    );
  });

  it('prints the version and exits 0', async () => {
    const { code, stdout } = await run(['--version']);
    assert.equal(code, 0);
    assert.match(stdout, /0\.1\.0/);
  });

  it('shows top-level help listing the scan command', async () => {
    const { code, stdout } = await run(['--help']);
    assert.equal(code, 0);
    assert.match(stdout, /scan/);
  });

  it('documents the --format and --severity options in scan help', async () => {
    const { code, stdout } = await run(['scan', '--help']);
    assert.equal(code, 0);
    assert.match(stdout, /--format/);
    assert.match(stdout, /--severity/);
  });

  it('rejects an invalid --format with a helpful message instead of silently falling back', async () => {
    const { code, stderr } = await run(['scan', '.', '--format', 'xml']);
    assert.notEqual(code, 0);
    assert.match(stderr, /Allowed choices are text, json, sarif, html/);
  });

  it('rejects an invalid --severity instead of silently disabling the filter', async () => {
    const { code, stderr } = await run(['scan', '.', '--severity', 'high']);
    assert.notEqual(code, 0);
    assert.match(stderr, /Allowed choices are info, warning, error/);
  });

  it('errors when the required <path> argument is missing', async () => {
    const { code, stderr } = await run(['scan']);
    assert.notEqual(code, 0);
    assert.match(stderr, /missing required argument/i);
  });

  it('shows elapsed seconds while a scan is running without writing status to stdout', async () => {
    const cwd = mkdtempSync(join(tmpdir(), 'mcp-safeguard-cli-'));
    const target = join(cwd, 'target');
    writeFileSync(join(cwd, 'scan'), `
const args = process.argv.slice(2);
if (args.includes('--version')) {
  console.log('fake-semgrep 1.0.0');
  process.exit(0);
}
setTimeout(() => {
  console.log(JSON.stringify({ results: [], errors: [], version: 'fake-semgrep 1.0.0' }));
}, 50);
`);
    writeFileSync(target, 'console.log("ok");\n');

    const { code, stdout, stderr } = await run(['scan', target], {
      cwd,
      env: {
        SEMGREP_PATH: process.execPath,
        MCP_SAFEGUARD_CONFIG_DIR: join(cwd, 'config'),
      },
    });

    assert.equal(code, 0);
    assert.match(stderr, /Running Semgrep analysis\.\.\. 0s/);
    assert.doesNotMatch(stdout, /Running Semgrep analysis/);
  });
});
