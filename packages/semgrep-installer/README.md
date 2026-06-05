# Semgrep Auto-Installer

Automatic installation and management of Semgrep for MCP-Safeguard.

## Features

- 🔍 Auto-detection of platform (Windows, Linux, macOS, ARM64)
- 📦 Downloads pre-built binaries from GitHub releases
- 💾 Caches binaries in `~/.mcp-safeguard/bin/`
- 📊 Progress bars for download tracking
- 🔄 Fallback to pip installation
- 🎯 Custom path support via `SEMGREP_PATH`

## Installation Priority

1. **Custom Path**: `SEMGREP_PATH` environment variable
2. **System**: Semgrep already in PATH
3. **Cached**: Previously downloaded binary in `~/.mcp-safeguard/bin/`
4. **Binary Download**: GitHub release for your platform
5. **Pip Fallback**: `pip install semgrep`

## Usage

### As a Library

```typescript
import { SemgrepInstaller } from '@mcp-safeguard/semgrep-installer';

const installer = new SemgrepInstaller();

// Check if Semgrep is available
const isAvailable = await installer.isSemgrepAvailable();

// Get the path to Semgrep
const path = await installer.getSemgrepPath();

// Install Semgrep
const result = await installer.install({
  force: false,        // Force reinstall even if already present
  silent: false,       // Suppress progress output
  fallbackToPip: true  // Use pip if binary not available
});

console.log(result);
// {
//   success: true,
//   path: '/home/user/.mcp-safeguard/bin/semgrep',
//   method: 'binary',
//   version: '1.87.0'
// }
```

### Standalone

```bash
# Check if Semgrep is available
node -e "const {SemgrepInstaller} = require('@mcp-safeguard/semgrep-installer'); new SemgrepInstaller().isSemgrepAvailable().then(console.log)"

# Install Semgrep
node -e "const {SemgrepInstaller} = require('@mcp-safeguard/semgrep-installer'); SemgrepInstaller.promptInstall().then(console.log)"
```

## Supported Platforms

### Binary Downloads Available

- Linux x86_64 (Ubuntu generic)
- Linux ARM64 (Ubuntu generic)
- macOS x86_64 (Intel)
- macOS ARM64 (Apple Silicon)

### Pip Fallback

- Windows (all architectures)
- Other Linux distributions
- Any platform with Python 3 + pip

## API Reference

### `SemgrepInstaller`

#### `isSemgrepAvailable(): Promise<boolean>`

Checks if Semgrep is available via custom path, system PATH, or cached binary.

#### `getSemgrepPath(): Promise<string | null>`

Returns the path to the Semgrep executable, or null if not found.

#### `install(options?: InstallOptions): Promise<InstallResult>`

Installs Semgrep with automatic platform detection and fallback.

**Options:**
- `force?: boolean` - Force reinstall (default: false)
- `silent?: boolean` - Suppress output (default: false)
- `fallbackToPip?: boolean` - Use pip if binary unavailable (default: true)

**Returns:**
```typescript
interface InstallResult {
  success: boolean;
  path: string;
  method: 'cached' | 'binary' | 'pip' | 'system';
  version?: string;
  error?: string;
}
```

#### `static promptInstall(): Promise<InstallResult>`

Interactive installation with user prompts and instructions.

## Environment Variables

### `SEMGREP_PATH`

Specify a custom path to the Semgrep executable:

```bash
export SEMGREP_PATH=/usr/local/bin/semgrep
```

This takes precedence over all other detection methods.

## Cache Directory

Binaries are cached in:

- **Linux/macOS**: `~/.mcp-safeguard/bin/`
- **Windows**: `%USERPROFILE%\.mcp-safeguard\bin\`

To clear the cache:

```bash
rm -rf ~/.mcp-safeguard/bin/
```

## Troubleshooting

### Download Fails

1. Check internet connectivity
2. Verify GitHub is accessible
3. Check firewall/proxy settings
4. Use pip fallback: Manual `pip install semgrep`

### Permission Errors

```bash
# Linux/macOS
chmod 755 ~/.mcp-safeguard/bin/semgrep

# Windows
# Run as Administrator
```

### Platform Not Supported

If your platform doesn't have pre-built binaries:

1. The installer automatically falls back to pip
2. Ensure Python 3 and pip are installed
3. Manual install: `pip install semgrep`

### Proxy/Corporate Network

```bash
# Set proxy for downloads and pip
export HTTP_PROXY=http://proxy.company.com:8080
export HTTPS_PROXY=http://proxy.company.com:8080

# Then run installer
```

## Development

```bash
# Install dependencies
pnpm install

# Build
pnpm build

# Test
pnpm test
```

## Version

Current Semgrep version: **1.87.0**

To update the version, modify the `SEMGREP_VERSION` constant in `src/installer.ts`.

## License

MIT
