import { describe, it, mock, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { RuleUpdater, createUpdater } from './updater.js';
import { mkdir, writeFile, readFile, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { createServer, Server, IncomingMessage, ServerResponse } from 'http';

// Mock HTTP server for testing
class MockRegistryServer {
  private server: Server;
  private port: number = 0;
  private handlers: Map<string, (req: IncomingMessage, res: ServerResponse) => void> = new Map();

  constructor() {
    this.server = createServer((req, res) => {
      const handler = this.handlers.get(req.url || '');
      if (handler) {
        handler(req, res);
      } else {
        res.writeHead(404);
        res.end('Not found');
      }
    });
  }

  async start(): Promise<string> {
    return new Promise((resolve) => {
      this.server.listen(0, 'localhost', () => {
        const addr = this.server.address();
        if (addr && typeof addr === 'object') {
          this.port = addr.port;
          resolve(`http://localhost:${this.port}`);
        }
      });
    });
  }

  async stop(): Promise<void> {
    return new Promise((resolve) => {
      this.server.close(() => resolve());
    });
  }

  on(path: string, handler: (req: IncomingMessage, res: ServerResponse) => void): void {
    this.handlers.set(path, handler);
  }

  getUrl(path: string = ''): string {
    return `http://localhost:${this.port}${path}`;
  }
}

describe('RuleUpdater', () => {
  let testDir: string;
  let rulesDir: string;
  let backupDir: string;
  let mockServer: MockRegistryServer;
  let updater: RuleUpdater;

  beforeEach(async () => {
    // Create temporary test directory
    testDir = join(tmpdir(), `mcp-safeguard-test-${Date.now()}`);
    rulesDir = join(testDir, 'rules');
    backupDir = join(testDir, 'backups');

    await mkdir(rulesDir, { recursive: true });
    await mkdir(backupDir, { recursive: true });

    // Create mock registry server
    mockServer = new MockRegistryServer();
    const serverUrl = await mockServer.start();

    // Setup mock registry endpoint
    mockServer.on('/registry.json', (req, res) => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        version: '0.2.0',
        timestamp: new Date().toISOString(),
        rules: {
          'test-category/test-rule': {
            version: '1.1.0',
            checksum: 'abc123',
            url: mockServer.getUrl('/rules/test-rule.yaml')
          },
          'test-category/new-rule': {
            version: '1.0.0',
            checksum: 'def456',
            url: mockServer.getUrl('/rules/new-rule.yaml')
          }
        }
      }));
    });

    // Setup rule download endpoints
    mockServer.on('/rules/test-rule.yaml', (req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/yaml' });
      res.end('rules:\n  - id: test-rule\n    pattern: test\n');
    });

    mockServer.on('/rules/new-rule.yaml', (req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/yaml' });
      res.end('rules:\n  - id: new-rule\n    pattern: new\n');
    });

    // Create updater instance
    updater = new RuleUpdater({
      rulesDir,
      backupDir,
      maxBackups: 3,
      registryUrl: mockServer.getUrl('/registry.json'),
      timeout: 5000
    });
  });

  afterEach(async () => {
    await mockServer.stop();
    await rm(testDir, { recursive: true, force: true });
  });

  describe('checkUpdates', () => {
    it('should detect new rules', async () => {
      // Create existing manifest
      const manifestPath = join(rulesDir, '.manifest.json');
      await writeFile(manifestPath, JSON.stringify({
        version: '0.1.0',
        timestamp: new Date().toISOString(),
        rules: {}
      }));

      const result = await updater.checkUpdates();

      assert.strictEqual(result.hasUpdates, true);
      assert.strictEqual(result.latestVersion, '0.2.0');
      assert.strictEqual(result.updates.length, 2);
      assert.strictEqual(result.updates[0].action, 'add');
    });

    it('should detect rule updates', async () => {
      // Create existing manifest with old version
      const manifestPath = join(rulesDir, '.manifest.json');
      await writeFile(manifestPath, JSON.stringify({
        version: '0.1.0',
        timestamp: new Date().toISOString(),
        rules: {
          'test-category/test-rule': {
            version: '1.0.0',
            checksum: 'oldchecksum'
          }
        }
      }));

      const result = await updater.checkUpdates();

      assert.strictEqual(result.hasUpdates, true);
      const testRuleUpdate = result.updates.find(u => u.ruleId === 'test-category/test-rule');
      assert.strictEqual(testRuleUpdate?.action, 'update');
      assert.strictEqual(testRuleUpdate?.currentVersion, '1.0.0');
      assert.strictEqual(testRuleUpdate?.latestVersion, '1.1.0');
    });

    it('should return no updates when up to date', async () => {
      // Create manifest with latest versions
      const manifestPath = join(rulesDir, '.manifest.json');
      await writeFile(manifestPath, JSON.stringify({
        version: '0.2.0',
        timestamp: new Date().toISOString(),
        rules: {
          'test-category/test-rule': {
            version: '1.1.0',
            checksum: 'abc123'
          },
          'test-category/new-rule': {
            version: '1.0.0',
            checksum: 'def456'
          }
        }
      }));

      const result = await updater.checkUpdates();

      assert.strictEqual(result.hasUpdates, false);
      assert.strictEqual(result.updates.length, 0);
    });
  });

  describe('applyUpdates', () => {
    it('should download and apply new rules', async () => {
      // Create initial manifest
      const manifestPath = join(rulesDir, '.manifest.json');
      await writeFile(manifestPath, JSON.stringify({
        version: '0.1.0',
        timestamp: new Date().toISOString(),
        rules: {}
      }));

      // Mock checksum calculation to match expected
      const originalChecksum = updater['calculateChecksum'].bind(updater);
      updater['calculateChecksum'] = (content: Buffer | string) => {
        const str = content.toString();
        if (str.includes('test-rule')) return 'abc123';
        if (str.includes('new-rule')) return 'def456';
        return originalChecksum(content);
      };

      const result = await updater.applyUpdates();

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.updated.length, 2);
      assert.strictEqual(result.failed.length, 0);
      assert.ok(result.backupPath);

      // Verify rule files were created
      const testRulePath = join(rulesDir, 'test-category', 'test-rule.yaml');
      const testRuleContent = await readFile(testRulePath, 'utf-8');
      assert.ok(testRuleContent.includes('test-rule'));
    });

    it('should create backup before updating', async () => {
      // Create existing rule
      const categoryDir = join(rulesDir, 'test-category');
      await mkdir(categoryDir, { recursive: true });
      await writeFile(join(categoryDir, 'old-rule.yaml'), 'old content');

      const manifestPath = join(rulesDir, '.manifest.json');
      await writeFile(manifestPath, JSON.stringify({
        version: '0.1.0',
        timestamp: new Date().toISOString(),
        rules: {
          'test-category/old-rule': {
            version: '1.0.0',
            checksum: 'old123'
          }
        }
      }));

      // Mock checksum
      updater['calculateChecksum'] = (content: Buffer | string) => {
        const str = content.toString();
        if (str.includes('test-rule')) return 'abc123';
        if (str.includes('new-rule')) return 'def456';
        if (str.includes('old content')) return 'old123';
        return 'unknown';
      };

      const result = await updater.applyUpdates();

      assert.ok(result.backupPath);

      // Verify backup contains old rule
      const backupRulePath = join(result.backupPath, 'test-category', 'old-rule.yaml');
      const backupContent = await readFile(backupRulePath, 'utf-8');
      assert.strictEqual(backupContent, 'old content');
    });

    it('should fail on checksum mismatch', async () => {
      const manifestPath = join(rulesDir, '.manifest.json');
      await writeFile(manifestPath, JSON.stringify({
        version: '0.1.0',
        timestamp: new Date().toISOString(),
        rules: {}
      }));

      // Don't mock checksum - it will mismatch

      const result = await updater.applyUpdates();

      assert.strictEqual(result.success, false);
      assert.strictEqual(result.failed.length, 2);
    });

    it('should update only specified rules', async () => {
      const manifestPath = join(rulesDir, '.manifest.json');
      await writeFile(manifestPath, JSON.stringify({
        version: '0.1.0',
        timestamp: new Date().toISOString(),
        rules: {}
      }));

      updater['calculateChecksum'] = (content: Buffer | string) => {
        const str = content.toString();
        if (str.includes('test-rule')) return 'abc123';
        return 'unknown';
      };

      const result = await updater.applyUpdates({
        rules: ['test-category/test-rule']
      });

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.updated.length, 1);
      assert.strictEqual(result.updated[0], 'test-category/test-rule');
    });
  });

  describe('rollback', () => {
    it('should restore rules from backup', async () => {
      // Create a rule and manifest
      const categoryDir = join(rulesDir, 'test-category');
      await mkdir(categoryDir, { recursive: true });
      await writeFile(join(categoryDir, 'test-rule.yaml'), 'new content');

      const manifestPath = join(rulesDir, '.manifest.json');
      await writeFile(manifestPath, JSON.stringify({
        version: '0.2.0',
        timestamp: new Date().toISOString(),
        rules: {
          'test-category/test-rule': {
            version: '1.1.0',
            checksum: 'new123'
          }
        }
      }));

      // Create a backup manually
      const backupPath = join(backupDir, 'backup-2026-06-01');
      const backupCategoryDir = join(backupPath, 'test-category');
      await mkdir(backupCategoryDir, { recursive: true });
      await writeFile(join(backupCategoryDir, 'test-rule.yaml'), 'old content');
      await writeFile(join(backupPath, '.manifest.json'), JSON.stringify({
        version: '0.1.0',
        timestamp: '2026-06-01T00:00:00Z',
        rules: {
          'test-category/test-rule': {
            version: '1.0.0',
            checksum: 'old123'
          }
        }
      }));

      const result = await updater.rollback('backup-2026-06-01');

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.updated.length, 1);

      // Verify content was restored
      const restoredContent = await readFile(join(categoryDir, 'test-rule.yaml'), 'utf-8');
      assert.strictEqual(restoredContent, 'old content');

      // Verify manifest was restored
      const restoredManifest = JSON.parse(await readFile(manifestPath, 'utf-8'));
      assert.strictEqual(restoredManifest.version, '0.1.0');
    });

    it('should fail when no backup exists', async () => {
      const result = await updater.rollback();

      assert.strictEqual(result.success, false);
      assert.ok(result.error?.includes('No backup found'));
    });
  });

  describe('listBackups', () => {
    it('should list available backups', async () => {
      // Create multiple backups
      const backup1Path = join(backupDir, 'backup-2026-06-01');
      const backup2Path = join(backupDir, 'backup-2026-06-02');

      for (const [path, timestamp] of [
        [backup1Path, '2026-06-01T00:00:00Z'],
        [backup2Path, '2026-06-02T00:00:00Z']
      ]) {
        await mkdir(path, { recursive: true });
        await writeFile(join(path, '.manifest.json'), JSON.stringify({
          version: '0.1.0',
          timestamp,
          rules: {}
        }));
      }

      const backups = await updater.listBackups();

      assert.strictEqual(backups.length, 2);
      assert.strictEqual(backups[0].id, 'backup-2026-06-02'); // Sorted by timestamp desc
      assert.strictEqual(backups[1].id, 'backup-2026-06-01');
    });

    it('should return empty array when no backups exist', async () => {
      const backups = await updater.listBackups();
      assert.strictEqual(backups.length, 0);
    });
  });

  describe('generateManifestFromRules', () => {
    it('should generate manifest from existing rules', async () => {
      // Create some rules
      const categoryDir = join(rulesDir, 'test-category');
      await mkdir(categoryDir, { recursive: true });
      await writeFile(join(categoryDir, 'rule1.yaml'), 'rule 1 content');
      await writeFile(join(categoryDir, 'rule2.yaml'), 'rule 2 content');

      const manifest = await updater['generateManifestFromRules']();

      assert.strictEqual(manifest.version, '1.0.0');
      assert.ok(manifest.rules['test-category/rule1']);
      assert.ok(manifest.rules['test-category/rule2']);
      assert.strictEqual(manifest.rules['test-category/rule1'].version, '1.0.0');
      assert.strictEqual(manifest.rules['test-category/rule1'].custom, false);
    });
  });

  describe('version comparison', () => {
    it('should correctly compare versions', () => {
      assert.strictEqual(updater['isNewerVersion']('1.1.0', '1.0.0'), true);
      assert.strictEqual(updater['isNewerVersion']('2.0.0', '1.9.9'), true);
      assert.strictEqual(updater['isNewerVersion']('1.0.1', '1.0.0'), true);
      assert.strictEqual(updater['isNewerVersion']('1.0.0', '1.0.0'), false);
      assert.strictEqual(updater['isNewerVersion']('1.0.0', '1.1.0'), false);
      assert.strictEqual(updater['isNewerVersion']('0.9.0', '1.0.0'), false);
    });
  });

  describe('createUpdater', () => {
    it('should create updater with default options', () => {
      const updater = createUpdater();
      assert.ok(updater instanceof RuleUpdater);
    });

    it('should create updater with custom options', () => {
      const updater = createUpdater({
        rulesDir: '/custom/path',
        maxBackups: 5
      });
      assert.ok(updater instanceof RuleUpdater);
    });
  });
});
