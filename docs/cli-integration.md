# Rule Updater - CLI Integration Guide

## Overview
The Rule Updater provides automatic update capabilities for MCP Safeguard security rules, including checking, downloading, applying updates, and rollback functionality.

## CLI Commands

### Check for Updates
```bash
mcp-safeguard update-rules --check
```

**Output:**
```
Checking for updates...
✓ Updates available!

Current version: 0.1.0
Latest version: 0.2.0

Available updates:
  + indirect-injection/external-content (new)
  ↑ context-overshare/sensitive-data (1.0.0 → 1.0.1)
  + excessive-agency/unrestricted-permissions (new)

3 rules can be updated.
```

### Apply Updates
```bash
mcp-safeguard update-rules --apply
```

**Options:**
- `--rules <rule-id>` - Update specific rules only
- `--force` - Force update even if no updates detected

**Output:**
```
Applying updates...
✓ Created backup: backup-2026-06-03T10-30-00-000Z
↓ Downloading indirect-injection/external-content v1.1.0
↓ Downloading context-overshare/sensitive-data v1.0.1
✓ Verifying checksums...
✓ Installing rules...

Successfully updated 2 rules.
Failed: 0

Updated to version 0.2.0.
```

### Rollback
```bash
mcp-safeguard update-rules --rollback [backup-id]
```

**Options:**
- `[backup-id]` - Specific backup to restore (optional, defaults to latest)

**Output:**
```
Rolling back to backup-2026-06-02T15-20-00-000Z...
✓ Restoring 8 rules
✓ Restoring manifest

Successfully rolled back to version 0.1.0.
```

### List Backups
```bash
mcp-safeguard update-rules --list-backups
```

**Output:**
```
Available backups:
1. backup-2026-06-03T10-30-00-000Z (v0.2.0) - 2 hours ago
2. backup-2026-06-02T15-20-00-000Z (v0.1.0) - 1 day ago
3. backup-2026-06-01T09-15-00-000Z (v0.1.0) - 2 days ago

Use: mcp-safeguard update-rules --rollback <backup-id>
```

## CLI Implementation Example

```typescript
// packages/cli/src/commands/update-rules.ts
import { Command } from 'commander';
import { createUpdater } from '@mcp-safeguard/core';
import chalk from 'chalk';

export function createUpdateRulesCommand(): Command {
  const command = new Command('update-rules')
    .description('Manage security rule updates');

  command
    .option('--check', 'Check for available updates')
    .option('--apply', 'Apply available updates')
    .option('--rollback [backup-id]', 'Rollback to previous version')
    .option('--list-backups', 'List available backups')
    .option('--rules <rules...>', 'Specific rules to update')
    .option('--force', 'Force update')
    .option('--registry <url>', 'Custom registry URL')
    .action(async (options) => {
      const updater = createUpdater({
        registryUrl: options.registry
      });

      try {
        if (options.check) {
          await handleCheck(updater);
        } else if (options.apply) {
          await handleApply(updater, options);
        } else if (options.rollback !== undefined) {
          await handleRollback(updater, options.rollback);
        } else if (options.listBackups) {
          await handleListBackups(updater);
        } else {
          console.log('Please specify an action: --check, --apply, --rollback, or --list-backups');
        }
      } catch (error) {
        console.error(chalk.red('Error:'), error.message);
        process.exit(1);
      }
    });

  return command;
}

async function handleCheck(updater: RuleUpdater) {
  console.log('Checking for updates...');
  
  const result = await updater.checkUpdates();
  
  if (!result.hasUpdates) {
    console.log(chalk.green('✓ All rules are up to date!'));
    console.log(`Current version: ${result.currentVersion}`);
    return;
  }

  console.log(chalk.green('✓ Updates available!\n'));
  console.log(`Current version: ${result.currentVersion}`);
  console.log(`Latest version: ${result.latestVersion}\n`);
  console.log('Available updates:');

  for (const update of result.updates) {
    if (update.action === 'add') {
      console.log(chalk.cyan(`  + ${update.ruleId} (new)`));
    } else {
      console.log(chalk.yellow(`  ↑ ${update.ruleId} (${update.currentVersion} → ${update.latestVersion})`));
    }
  }

  console.log(`\n${result.updates.length} rules can be updated.`);
  console.log('\nRun with --apply to install updates.');
}

async function handleApply(updater: RuleUpdater, options: any) {
  console.log('Applying updates...');

  const result = await updater.applyUpdates({
    force: options.force,
    rules: options.rules
  });

  if (result.backupPath) {
    console.log(chalk.green(`✓ Created backup: ${require('path').basename(result.backupPath)}`));
  }

  if (result.updated.length > 0) {
    console.log(chalk.green(`✓ Successfully updated ${result.updated.length} rules:`));
    result.updated.forEach(rule => console.log(`  - ${rule}`));
  }

  if (result.failed.length > 0) {
    console.log(chalk.red(`✗ Failed to update ${result.failed.length} rules:`));
    result.failed.forEach(rule => console.log(`  - ${rule}`));
  }

  if (result.success) {
    console.log(chalk.green('\n✓ Update completed successfully!'));
  } else {
    console.log(chalk.yellow('\n⚠ Update completed with errors.'));
    if (result.backupPath) {
      console.log(`Use --rollback to restore from backup.`);
    }
  }
}

async function handleRollback(updater: RuleUpdater, backupId?: string) {
  if (backupId) {
    console.log(`Rolling back to ${backupId}...`);
  } else {
    console.log('Rolling back to latest backup...');
  }

  const result = await updater.rollback(backupId);

  if (result.success) {
    console.log(chalk.green(`✓ Successfully rolled back ${result.updated.length} rules`));
    console.log(chalk.green('✓ Rollback completed!'));
  } else {
    console.log(chalk.red('✗ Rollback failed:'), result.error);
    if (result.failed.length > 0) {
      console.log('Failed rules:', result.failed.join(', '));
    }
  }
}

async function handleListBackups(updater: RuleUpdater) {
  const backups = await updater.listBackups();

  if (backups.length === 0) {
    console.log('No backups available.');
    return;
  }

  console.log('Available backups:\n');
  backups.forEach((backup, index) => {
    const timestamp = new Date(backup.timestamp);
    const timeAgo = getTimeAgo(timestamp);
    console.log(`${index + 1}. ${chalk.cyan(backup.id)} (v${backup.version}) - ${timeAgo}`);
  });

  console.log(`\nUse: mcp-safeguard update-rules --rollback <backup-id>`);
}

function getTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  return `${Math.floor(seconds / 86400)} days ago`;
}
```

## Integration with Main CLI

```typescript
// packages/cli/src/index.ts
import { Command } from 'commander';
import { createUpdateRulesCommand } from './commands/update-rules.js';

const program = new Command();

program
  .name('mcp-safeguard')
  .description('Security scanner for Model Context Protocol servers')
  .version('0.1.0');

// ... other commands ...

program.addCommand(createUpdateRulesCommand());

program.parse();
```

## Testing the CLI

```bash
# Check for updates
npm run cli update-rules -- --check

# Apply all updates
npm run cli update-rules -- --apply

# Apply specific rules only
npm run cli update-rules -- --apply --rules indirect-injection/external-content

# List backups
npm run cli update-rules -- --list-backups

# Rollback to latest
npm run cli update-rules -- --rollback

# Rollback to specific backup
npm run cli update-rules -- --rollback backup-2026-06-03T10-30-00-000Z

# Use custom registry
npm run cli update-rules -- --check --registry https://custom-registry.example.com/manifest.json
```

## Environment Variables

```bash
# Custom registry URL
export MCP_SAFEGUARD_REGISTRY_URL="https://api.github.com/repos/org/mcp-safeguard/releases/latest"

# Custom rules directory
export MCP_SAFEGUARD_RULES_DIR="/path/to/custom/rules"

# Maximum backups to keep
export MCP_SAFEGUARD_MAX_BACKUPS="5"

# Request timeout (ms)
export MCP_SAFEGUARD_TIMEOUT="30000"
```

## Configuration File Support

```json
// .mcp-safeguard.json
{
  "updater": {
    "registryUrl": "https://api.github.com/repos/org/mcp-safeguard/releases/latest",
    "maxBackups": 3,
    "timeout": 30000,
    "autoUpdate": false
  }
}
```
