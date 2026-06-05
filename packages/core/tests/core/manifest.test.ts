import { describe, it, expect } from '../helpers/expect.js';
import { ManifestParser } from '../../src/manifest.js';
import { mkdtempSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('ManifestParser', () => {
  const parser = new ManifestParser();

  it('parses package.json (name, version, deps, mcpConfig)', async () => {
    const d = mkdtempSync(join(tmpdir(), 'mcp-manifest-js-'));
    writeFileSync(join(d, 'package.json'), JSON.stringify({
      name: 'my-server',
      version: '1.2.3',
      dependencies: { '@modelcontextprotocol/sdk': '^1.0.0' },
      devDependencies: { typescript: '^5.0.0' },
      mcp: { transport: 'stdio' },
    }));
    const m = await parser.parse(d);
    expect(m).not.toBeNull();
    expect(m!.name).toBe('my-server');
    expect(m!.version).toBe('1.2.3');
    expect(m!.dependencies['@modelcontextprotocol/sdk']).toBe('^1.0.0');
    expect(m!.devDependencies!.typescript).toBe('^5.0.0');
    expect(m!.mcpConfig.transport).toBe('stdio');
    rmSync(d, { recursive: true, force: true });
  });

  it('falls back to requirements.txt when no package.json', async () => {
    const d = mkdtempSync(join(tmpdir(), 'mcp-manifest-py-'));
    writeFileSync(join(d, 'requirements.txt'), '# comment\nmcp==1.0.0\nrequests>=2.0\n\nflask\n');
    const m = await parser.parse(d);
    expect(m).not.toBeNull();
    expect(m!.name).toBe('python-project');
    expect(m!.dependencies['mcp']).toBe('1.0.0');
    expect(m!.dependencies['requests']).toBe('2.0');
    expect(m!.dependencies['flask']).toBe('*');
    rmSync(d, { recursive: true, force: true });
  });

  it('returns null when neither manifest exists', async () => {
    const d = mkdtempSync(join(tmpdir(), 'mcp-manifest-empty-'));
    const m = await parser.parse(d);
    expect(m).toBeNull();
    rmSync(d, { recursive: true, force: true });
  });

  it('falls back to requirements.txt when package.json is malformed', async () => {
    const d = mkdtempSync(join(tmpdir(), 'mcp-manifest-bad-'));
    writeFileSync(join(d, 'package.json'), '{ not valid json');
    writeFileSync(join(d, 'requirements.txt'), 'mcp==2.0.0\n');
    const m = await parser.parse(d);
    expect(m).not.toBeNull();
    expect(m!.dependencies['mcp']).toBe('2.0.0');
    rmSync(d, { recursive: true, force: true });
  });
});
