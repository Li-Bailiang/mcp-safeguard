# Rule Updater API Documentation

## Overview

The `RuleUpdater` class provides a comprehensive mechanism for managing security rule updates in MCP Safeguard, including checking for updates, downloading, verifying, applying, and rolling back changes.

## Installation

```typescript
import { RuleUpdater, createUpdater } from '@mcp-safeguard/core';
```

## Quick Start

```typescript
// Create updater with default options
const updater = createUpdater();

// Check for updates
const updateCheck = await updater.checkUpdates();
if (updateCheck.hasUpdates) {
  console.log(`${updateCheck.updates.length} updates available`);
  
  // Apply updates
  const result = await updater.applyUpdates();
  console.log(`Updated ${result.updated.length} rules`);
}
```

## API Reference

### Class: RuleUpdater

#### Constructor

```typescript
new RuleUpdater(options?: UpdaterOptions)
```

**Options:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `rulesDir` | `string` | `./packages/core/rules` | Directory containing rule files |
| `backupDir` | `string` | `<rulesDir>/.backups` | Directory for storing backups |
| `maxBackups` | `number` | `3` | Maximum number of backups to retain |
| `registryUrl` | `string` | GitHub releases URL | URL of the rule registry |
| `timeout` | `number` | `30000` | HTTP request timeout in milliseconds |

**Example:**

```typescript
const updater = new RuleUpdater({
  rulesDir: '/custom/rules',
  maxBackups: 5,
  timeout: 60000
});
```

---

### Methods

#### checkUpdates()

Check for available rule updates from the remote registry.

```typescript
async checkUpdates(): Promise<UpdateCheckResult>
```

**Returns:** `UpdateCheckResult`

```typescript
interface UpdateCheckResult {
  hasUpdates: boolean;           // Whether updates are available
  currentVersion: string;         // Current local rules version
  latestVersion: string;          // Latest available version
  updates: RuleUpdate[];          // List of available updates
}

interface RuleUpdate {
  ruleId: string;                 // Rule identifier (e.g., "category/rule-name")
  currentVersion: string | null;  // Current version (null if new)
  latestVersion: string;          // Latest available version
  action: 'add' | 'update' | 'none';  // Update action
}
```

**Example:**

```typescript
const result = await updater.checkUpdates();

console.log(`Current: ${result.currentVersion}`);
console.log(`Latest: ${result.latestVersion}`);

for (const update of result.updates) {
  if (update.action === 'add') {
    console.log(`New rule: ${update.ruleId}`);
  } else if (update.action === 'update') {
    console.log(`Update: ${update.ruleId} (${update.currentVersion} → ${update.latestVersion})`);
  }
}
```

---

#### applyUpdates()

Download and apply available rule updates.

```typescript
async applyUpdates(options?: {
  force?: boolean;
  rules?: string[];
}): Promise<UpdateResult>
```

**Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `force` | `boolean` | `false` | Force update even if no updates detected |
| `rules` | `string[]` | `undefined` | Specific rules to update (updates all if omitted) |

**Returns:** `UpdateResult`

```typescript
interface UpdateResult {
  success: boolean;       // Overall success status
  updated: string[];      // List of successfully updated rules
  failed: string[];       // List of failed rule updates
  backupPath?: string;    // Path to backup created
  error?: string;         // Error message if failed
}
```

**Example:**

```typescript
// Update all rules
const result = await updater.applyUpdates();

if (result.success) {
  console.log(`Successfully updated ${result.updated.length} rules`);
  console.log(`Backup saved at: ${result.backupPath}`);
} else {
  console.error(`Failed to update ${result.failed.length} rules`);
}

// Update specific rules only
const partialResult = await updater.applyUpdates({
  rules: ['indirect-injection/external-content', 'dos/resource-exhaustion']
});
```

**Behavior:**

1. Creates a backup of current rules
2. Downloads rules from registry
3. Verifies checksums
4. Writes rule files
5. Updates local manifest
6. Cleans up old backups

**Error Handling:**

- Checksum mismatch: Skips rule and adds to `failed` list
- Network errors: Throws error, no changes applied
- Write errors: Partial update possible, backup available for rollback

---

#### rollback()

Restore rules from a previous backup.

```typescript
async rollback(backupId?: string): Promise<UpdateResult>
```

**Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `backupId` | `string` | Latest backup | ID of backup to restore (optional) |

**Returns:** `UpdateResult`

**Example:**

```typescript
// Rollback to latest backup
const result = await updater.rollback();

// Rollback to specific backup
const result = await updater.rollback('backup-2026-06-03T10-30-00-000Z');

if (result.success) {
  console.log(`Rolled back ${result.updated.length} rules`);
} else {
  console.error('Rollback failed:', result.error);
}
```

---

#### listBackups()

List available backups.

```typescript
async listBackups(): Promise<Array<{
  id: string;
  timestamp: string;
  version: string;
}>>
```

**Returns:** Array of backup information, sorted by timestamp (newest first)

**Example:**

```typescript
const backups = await updater.listBackups();

for (const backup of backups) {
  console.log(`${backup.id} - v${backup.version} (${backup.timestamp})`);
}

// Rollback to a specific backup
if (backups.length > 0) {
  await updater.rollback(backups[0].id);
}
```

---

### Utility Function: createUpdater()

Factory function to create a `RuleUpdater` instance.

```typescript
function createUpdater(options?: UpdaterOptions): RuleUpdater
```

**Example:**

```typescript
const updater = createUpdater({
  maxBackups: 5,
  timeout: 60000
});
```

---

## Type Definitions

### RegistryManifest

Remote registry manifest format.

```typescript
interface RegistryManifest {
  version: string;                    // Registry version
  timestamp: string;                  // Last update timestamp
  rules: Record<string, RuleMetadata>; // Rule metadata by ID
}

interface RuleMetadata {
  version: string;    // Rule version
  checksum: string;   // SHA256 checksum
  url: string;        // Download URL
  size?: number;      // File size in bytes
  updated?: string;   // Last updated timestamp
}
```

### LocalManifest

Local manifest format (stored in `.manifest.json`).

```typescript
interface LocalManifest {
  version: string;                    // Local rules version
  timestamp: string;                  // Last sync timestamp
  rules: Record<string, {
    version: string;   // Rule version
    checksum: string;  // SHA256 checksum
    custom?: boolean;  // Whether rule is custom/local
  }>;
}
```

---

## Registry Types

The updater supports multiple registry types:

### 1. GitHub Releases

```typescript
const updater = createUpdater({
  registryUrl: 'https://api.github.com/repos/org/mcp-safeguard/releases/latest'
});
```

**Expected format:**
- Looks for `registry.json` asset in latest release
- Downloads manifest from asset URL

### 2. npm Registry

```typescript
const updater = createUpdater({
  registryUrl: 'https://registry.npmjs.org/@mcp-safeguard/rules'
});
```

**Expected format:**
- Reads `mcp_safeguard_registry` field from package metadata
- Uses latest dist-tag

### 3. Direct JSON Endpoint

```typescript
const updater = createUpdater({
  registryUrl: 'https://example.com/registry.json'
});
```

**Expected format:**
- Direct JSON response matching `RegistryManifest` interface

---

## Advanced Usage

### Custom Rule Management

Preserve custom rules during updates:

```typescript
// Mark rules as custom in local manifest
const manifest = {
  version: '0.1.0',
  timestamp: new Date().toISOString(),
  rules: {
    'custom-category/my-rule': {
      version: '1.0.0',
      checksum: '...',
      custom: true  // Custom rules are preserved
    }
  }
};
```

Custom rules are:
- Not updated by `applyUpdates()`
- Preserved in backups
- Maintained across updates

### Incremental Updates

Update only changed rules:

```typescript
const updateCheck = await updater.checkUpdates();

// Filter for specific categories
const injectionUpdates = updateCheck.updates.filter(u => 
  u.ruleId.startsWith('indirect-injection/')
);

// Apply filtered updates
await updater.applyUpdates({
  rules: injectionUpdates.map(u => u.ruleId)
});
```

### Version Comparison

The updater uses semantic versioning for comparison:

```typescript
// These return true:
isNewerVersion('1.1.0', '1.0.0')  // Patch update
isNewerVersion('2.0.0', '1.9.9')  // Major update
isNewerVersion('1.0.1', '1.0.0')  // Minor update

// These return false:
isNewerVersion('1.0.0', '1.0.0')  // Same version
isNewerVersion('0.9.0', '1.0.0')  // Older version
```

### Checksum Verification

All downloaded rules are verified using SHA256:

```typescript
// Checksums are automatically verified
const result = await updater.applyUpdates();

// Failed checksums are reported
if (result.failed.length > 0) {
  console.error('Checksum mismatches:', result.failed);
}
```

### Backup Management

Backups are automatically managed:

```typescript
// Backups are created before updates
const result = await updater.applyUpdates();
console.log('Backup:', result.backupPath);

// Old backups are automatically cleaned up (keeps maxBackups)
// Default: keeps last 3 backups

// Manual backup management
const backups = await updater.listBackups();
console.log(`${backups.length} backups available`);
```

---

## Error Handling

### Network Errors

```typescript
try {
  const result = await updater.checkUpdates();
} catch (error) {
  if (error.message.includes('timeout')) {
    console.error('Registry request timed out');
  } else if (error.message.includes('404')) {
    console.error('Registry not found');
  }
}
```

### Partial Updates

```typescript
const result = await updater.applyUpdates();

if (!result.success) {
  console.log('Partial update completed:');
  console.log('  Succeeded:', result.updated);
  console.log('  Failed:', result.failed);
  console.log('  Backup:', result.backupPath);
  
  // Rollback if needed
  await updater.rollback();
}
```

### Manifest Errors

```typescript
// If no manifest exists, one is generated from existing rules
const manifest = await updater['generateManifestFromRules']();

// All existing rules are cataloged with checksums
console.log(`Generated manifest with ${Object.keys(manifest.rules).length} rules`);
```

---

## Best Practices

### 1. Regular Update Checks

```typescript
// Check for updates weekly
setInterval(async () => {
  const result = await updater.checkUpdates();
  if (result.hasUpdates) {
    console.log(`${result.updates.length} updates available`);
  }
}, 7 * 24 * 60 * 60 * 1000);
```

### 2. Verify Before Applying

```typescript
// Always check before applying
const check = await updater.checkUpdates();

if (check.hasUpdates) {
  console.log('Updates available:');
  check.updates.forEach(u => console.log(`  - ${u.ruleId}`));
  
  // User confirmation here
  const result = await updater.applyUpdates();
}
```

### 3. Keep Backups

```typescript
// Increase maxBackups for safety
const updater = createUpdater({
  maxBackups: 5  // Keep more backup history
});
```

### 4. Monitor Update Results

```typescript
const result = await updater.applyUpdates();

// Log metrics
console.log({
  success: result.success,
  updatedCount: result.updated.length,
  failedCount: result.failed.length,
  backupPath: result.backupPath
});

// Alert on failures
if (result.failed.length > 0) {
  notifyAdmins(`Rule update failed: ${result.failed.join(', ')}`);
}
```

---

## Testing

See `updater.test.ts` for comprehensive test examples using mock HTTP servers.

### Mock Registry Server

```typescript
import { createServer } from 'http';

const server = createServer((req, res) => {
  if (req.url === '/registry.json') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      version: '0.2.0',
      timestamp: new Date().toISOString(),
      rules: { /* ... */ }
    }));
  }
});

server.listen(3000);
```

---

## Security Considerations

1. **Checksum Verification**: All downloads are verified with SHA256
2. **HTTPS Required**: Use HTTPS URLs for production registries
3. **Backup Before Update**: Always creates backup before applying changes
4. **Rollback Capability**: Can restore previous state if issues occur
5. **Custom Rule Preservation**: Custom rules are never overwritten

---

## Performance

- **Incremental Updates**: Only downloads changed rules
- **Parallel Downloads**: Can be extended for concurrent downloads
- **Efficient Storage**: Old backups automatically cleaned up
- **Fast Checksums**: SHA256 verification is fast for small rule files

---

## Troubleshooting

### Updates Not Detected

```typescript
// Force regenerate local manifest
const manifest = await updater['generateManifestFromRules']();
```

### Checksum Mismatches

- Verify registry checksums are correct
- Check for file corruption during download
- Ensure consistent line endings (LF vs CRLF)

### Rollback Fails

```typescript
// List available backups
const backups = await updater.listBackups();

// Try each backup
for (const backup of backups) {
  const result = await updater.rollback(backup.id);
  if (result.success) break;
}
```

---

## Future Enhancements

Potential improvements for future versions:

- Parallel rule downloads
- Differential updates (binary patches)
- Rule signature verification (GPG)
- Automatic update scheduling
- Update notifications
- Rule dependency resolution
- Registry mirroring
- Compression support
