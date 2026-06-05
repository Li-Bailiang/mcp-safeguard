import { createHash } from 'crypto';
import { mkdir, readFile, writeFile, rename, rm, readdir, stat } from 'fs/promises';
import { join, dirname } from 'path';
import { existsSync } from 'fs';

// Types for update system
export interface RuleMetadata {
  version: string;
  checksum: string;
  url: string;
  size?: number;
  updated?: string;
}

export interface RegistryManifest {
  version: string;
  timestamp: string;
  rules: Record<string, RuleMetadata>;
}

export interface UpdateCheckResult {
  hasUpdates: boolean;
  currentVersion: string;
  latestVersion: string;
  updates: RuleUpdate[];
}

export interface RuleUpdate {
  ruleId: string;
  currentVersion: string | null;
  latestVersion: string;
  action: 'add' | 'update' | 'none';
}

export interface UpdateResult {
  success: boolean;
  updated: string[];
  failed: string[];
  backupPath?: string;
  error?: string;
}

export interface LocalManifest {
  version: string;
  timestamp: string;
  rules: Record<string, {
    version: string;
    checksum: string;
    custom?: boolean;
  }>;
}

export interface UpdaterOptions {
  rulesDir?: string;
  backupDir?: string;
  maxBackups?: number;
  registryUrl?: string;
  timeout?: number;
}

/**
 * RuleUpdater manages the lifecycle of security rule updates
 * including checking, downloading, verifying, and applying updates
 */
export class RuleUpdater {
  private rulesDir: string;
  private backupDir: string;
  private maxBackups: number;
  private registryUrl: string;
  private timeout: number;
  private manifestPath: string;

  constructor(options: UpdaterOptions = {}) {
    this.rulesDir = options.rulesDir || join(process.cwd(), 'packages', 'core', 'rules');
    this.backupDir = options.backupDir || join(this.rulesDir, '.backups');
    this.maxBackups = options.maxBackups || 3;
    this.registryUrl = options.registryUrl || 'https://api.github.com/repos/Li-Bailiang/mcp-safeguard/releases/latest';
    this.timeout = options.timeout || 30000;
    this.manifestPath = join(this.rulesDir, '.manifest.json');
  }

  /**
   * Check for available rule updates
   */
  async checkUpdates(): Promise<UpdateCheckResult> {
    try {
      const localManifest = await this.getLocalManifest();
      const remoteManifest = await this.fetchRemoteManifest();

      const updates: RuleUpdate[] = [];

      // Check each remote rule
      for (const [ruleId, remoteMeta] of Object.entries(remoteManifest.rules)) {
        const localMeta = localManifest.rules[ruleId];

        if (!localMeta) {
          // New rule
          updates.push({
            ruleId,
            currentVersion: null,
            latestVersion: remoteMeta.version,
            action: 'add'
          });
        } else if (this.isNewerVersion(remoteMeta.version, localMeta.version)) {
          // Update available
          updates.push({
            ruleId,
            currentVersion: localMeta.version,
            latestVersion: remoteMeta.version,
            action: 'update'
          });
        }
      }

      return {
        hasUpdates: updates.length > 0,
        currentVersion: localManifest.version,
        latestVersion: remoteManifest.version,
        updates
      };
    } catch (error) {
      throw new Error(`Failed to check updates: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Apply available updates
   */
  async applyUpdates(options: { force?: boolean; rules?: string[] } = {}): Promise<UpdateResult> {
    const result: UpdateResult = {
      success: false,
      updated: [],
      failed: []
    };

    try {
      // Check for updates
      const updateCheck = await this.checkUpdates();

      if (!updateCheck.hasUpdates && !options.force) {
        result.success = true;
        return result;
      }

      // Create backup
      const backupPath = await this.createBackup();
      result.backupPath = backupPath;

      // Fetch remote manifest
      const remoteManifest = await this.fetchRemoteManifest();

      // Filter rules to update
      const rulesToUpdate = options.rules
        ? updateCheck.updates.filter(u => options.rules!.includes(u.ruleId))
        : updateCheck.updates;

      // Download and apply each update
      for (const update of rulesToUpdate) {
        try {
          const remoteMeta = remoteManifest.rules[update.ruleId];
          const ruleContent = await this.downloadRule(remoteMeta.url);

          // Verify checksum
          const actualChecksum = this.calculateChecksum(ruleContent);
          if (actualChecksum !== remoteMeta.checksum) {
            throw new Error(`Checksum mismatch for ${update.ruleId}`);
          }

          // Write rule file
          await this.writeRuleFile(update.ruleId, ruleContent);

          result.updated.push(update.ruleId);
        } catch (error) {
          result.failed.push(update.ruleId);
          console.error(`Failed to update ${update.ruleId}:`, error);
        }
      }

      // Update local manifest
      if (result.updated.length > 0) {
        await this.updateLocalManifest(remoteManifest, result.updated);
      }

      // Cleanup old backups
      await this.cleanupOldBackups();

      result.success = result.failed.length === 0;
      return result;
    } catch (error) {
      result.error = error instanceof Error ? error.message : String(error);
      return result;
    }
  }

  /**
   * Rollback to previous version
   */
  async rollback(backupId?: string): Promise<UpdateResult> {
    const result: UpdateResult = {
      success: false,
      updated: [],
      failed: []
    };

    try {
      // Find backup to restore
      const backupPath = backupId
        ? join(this.backupDir, backupId)
        : await this.getLatestBackup();

      if (!backupPath || !existsSync(backupPath)) {
        throw new Error('No backup found to rollback');
      }

      // Read backup manifest
      const backupManifestPath = join(backupPath, '.manifest.json');
      const backupManifest: LocalManifest = JSON.parse(
        await readFile(backupManifestPath, 'utf-8')
      );

      // Restore each rule
      const ruleIds = Object.keys(backupManifest.rules);
      for (const ruleId of ruleIds) {
        try {
          const [category, name] = ruleId.split('/');
          const backupRulePath = join(backupPath, category, `${name}.yaml`);
          const targetRulePath = join(this.rulesDir, category, `${name}.yaml`);

          if (existsSync(backupRulePath)) {
            const ruleContent = await readFile(backupRulePath);
            await mkdir(dirname(targetRulePath), { recursive: true });
            await writeFile(targetRulePath, ruleContent);
            result.updated.push(ruleId);
          }
        } catch (error) {
          result.failed.push(ruleId);
          console.error(`Failed to rollback ${ruleId}:`, error);
        }
      }

      // Restore manifest
      await writeFile(this.manifestPath, JSON.stringify(backupManifest, null, 2));

      result.success = result.failed.length === 0;
      return result;
    } catch (error) {
      result.error = error instanceof Error ? error.message : String(error);
      return result;
    }
  }

  /**
   * List available backups
   */
  async listBackups(): Promise<Array<{ id: string; timestamp: string; version: string }>> {
    try {
      if (!existsSync(this.backupDir)) {
        return [];
      }

      const entries = await readdir(this.backupDir);
      const backups = [];

      for (const entry of entries) {
        const backupPath = join(this.backupDir, entry);
        const manifestPath = join(backupPath, '.manifest.json');

        if (existsSync(manifestPath)) {
          const manifest: LocalManifest = JSON.parse(
            await readFile(manifestPath, 'utf-8')
          );
          backups.push({
            id: entry,
            timestamp: manifest.timestamp,
            version: manifest.version
          });
        }
      }

      return backups.sort((a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
    } catch (error) {
      console.error('Failed to list backups:', error);
      return [];
    }
  }

  // Private helper methods

  private async getLocalManifest(): Promise<LocalManifest> {
    try {
      if (!existsSync(this.manifestPath)) {
        // Generate manifest from existing rules
        return await this.generateManifestFromRules();
      }

      const content = await readFile(this.manifestPath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      // Return default manifest if parsing fails
      return {
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        rules: {}
      };
    }
  }

  private async generateManifestFromRules(): Promise<LocalManifest> {
    const manifest: LocalManifest = {
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      rules: {}
    };

    try {
      const categories = await readdir(this.rulesDir);

      for (const category of categories) {
        if (category.startsWith('.')) continue;

        const categoryPath = join(this.rulesDir, category);
        const categoryStat = await stat(categoryPath);

        if (categoryStat.isDirectory()) {
          const files = await readdir(categoryPath);

          for (const file of files) {
            if (file.endsWith('.yaml') || file.endsWith('.yml')) {
              const rulePath = join(categoryPath, file);
              const content = await readFile(rulePath);
              const checksum = this.calculateChecksum(content);
              const ruleId = `${category}/${file.replace(/\.(yaml|yml)$/, '')}`;

              manifest.rules[ruleId] = {
                version: '1.0.0',
                checksum,
                custom: false
              };
            }
          }
        }
      }

      // Save generated manifest
      await writeFile(this.manifestPath, JSON.stringify(manifest, null, 2));
    } catch (error) {
      console.error('Failed to generate manifest:', error);
    }

    return manifest;
  }

  private async fetchRemoteManifest(): Promise<RegistryManifest> {
    try {
      // Support different registry types
      if (this.registryUrl.includes('github.com/repos')) {
        return await this.fetchFromGitHub();
      } else if (this.registryUrl.includes('registry.npmjs.org')) {
        return await this.fetchFromNpm();
      } else {
        // Direct JSON endpoint
        return await this.fetchJsonManifest();
      }
    } catch (error) {
      throw new Error(`Failed to fetch remote manifest: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async fetchFromGitHub(): Promise<RegistryManifest> {
    const response = await this.fetchWithTimeout(this.registryUrl);

    if (!response.ok) {
      throw new Error(`GitHub API returned ${response.status}`);
    }

    const release = await response.json() as any;

    // Look for registry.json asset
    const registryAsset = release.assets?.find((a: any) => a.name === 'registry.json');

    if (!registryAsset) {
      throw new Error('No registry.json found in latest release');
    }

    const registryResponse = await this.fetchWithTimeout(registryAsset.browser_download_url);
    return await registryResponse.json() as RegistryManifest;
  }

  private async fetchFromNpm(): Promise<RegistryManifest> {
    const response = await this.fetchWithTimeout(this.registryUrl);

    if (!response.ok) {
      throw new Error(`npm registry returned ${response.status}`);
    }

    const packageData = await response.json() as any;
    const latestVersion = packageData['dist-tags']?.latest;

    if (!latestVersion) {
      throw new Error('No latest version found in npm package');
    }

    const versionData = packageData.versions[latestVersion];

    // Assume registry manifest is in package metadata
    if (!versionData.mcp_safeguard_registry) {
      throw new Error('No mcp_safeguard_registry found in package metadata');
    }

    return versionData.mcp_safeguard_registry as RegistryManifest;
  }

  private async fetchJsonManifest(): Promise<RegistryManifest> {
    const response = await this.fetchWithTimeout(this.registryUrl);

    if (!response.ok) {
      throw new Error(`Registry returned ${response.status}`);
    }

    return await response.json() as RegistryManifest;
  }

  private async downloadRule(url: string): Promise<Buffer> {
    const response = await this.fetchWithTimeout(url);

    if (!response.ok) {
      throw new Error(`Failed to download rule: ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  private async writeRuleFile(ruleId: string, content: Buffer): Promise<void> {
    const [category, name] = ruleId.split('/');
    const targetDir = join(this.rulesDir, category);
    const targetPath = join(targetDir, `${name}.yaml`);

    await mkdir(targetDir, { recursive: true });
    await writeFile(targetPath, content);
  }

  private async createBackup(): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = join(this.backupDir, `backup-${timestamp}`);

    await mkdir(backupPath, { recursive: true });

    // Copy current rules
    const categories = await readdir(this.rulesDir);

    for (const category of categories) {
      if (category.startsWith('.')) continue;

      const categoryPath = join(this.rulesDir, category);
      const categoryStat = await stat(categoryPath);

      if (categoryStat.isDirectory()) {
        const backupCategoryPath = join(backupPath, category);
        await mkdir(backupCategoryPath, { recursive: true });

        const files = await readdir(categoryPath);
        for (const file of files) {
          if (file.endsWith('.yaml') || file.endsWith('.yml')) {
            const sourcePath = join(categoryPath, file);
            const targetPath = join(backupCategoryPath, file);
            const content = await readFile(sourcePath);
            await writeFile(targetPath, content);
          }
        }
      }
    }

    // Copy manifest
    if (existsSync(this.manifestPath)) {
      const manifestContent = await readFile(this.manifestPath);
      await writeFile(join(backupPath, '.manifest.json'), manifestContent);
    }

    return backupPath;
  }

  private async getLatestBackup(): Promise<string | null> {
    const backups = await this.listBackups();
    return backups.length > 0 ? join(this.backupDir, backups[0].id) : null;
  }

  private async cleanupOldBackups(): Promise<void> {
    const backups = await this.listBackups();

    if (backups.length > this.maxBackups) {
      const toDelete = backups.slice(this.maxBackups);

      for (const backup of toDelete) {
        const backupPath = join(this.backupDir, backup.id);
        await rm(backupPath, { recursive: true, force: true });
      }
    }
  }

  private async updateLocalManifest(remoteManifest: RegistryManifest, updatedRules: string[]): Promise<void> {
    const localManifest = await this.getLocalManifest();

    // Update version and timestamp
    localManifest.version = remoteManifest.version;
    localManifest.timestamp = new Date().toISOString();

    // Update rule metadata
    for (const ruleId of updatedRules) {
      const remoteMeta = remoteManifest.rules[ruleId];
      if (remoteMeta) {
        localManifest.rules[ruleId] = {
          version: remoteMeta.version,
          checksum: remoteMeta.checksum,
          custom: false
        };
      }
    }

    await writeFile(this.manifestPath, JSON.stringify(localManifest, null, 2));
  }

  private calculateChecksum(content: Buffer | string): string {
    const hash = createHash('sha256');
    hash.update(content);
    return hash.digest('hex');
  }

  private isNewerVersion(remote: string, local: string): boolean {
    const remoteParts = remote.split('.').map(Number);
    const localParts = local.split('.').map(Number);

    for (let i = 0; i < Math.max(remoteParts.length, localParts.length); i++) {
      const r = remoteParts[i] || 0;
      const l = localParts[i] || 0;

      if (r > l) return true;
      if (r < l) return false;
    }

    return false;
  }

  private async fetchWithTimeout(url: string): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }
}

/**
 * Utility function to create a default updater instance
 */
export function createUpdater(options?: UpdaterOptions): RuleUpdater {
  return new RuleUpdater(options);
}
