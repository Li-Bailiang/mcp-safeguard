import { execFile } from 'child_process';
import { promisify } from 'util';
import { createWriteStream, existsSync, mkdirSync, chmodSync } from 'fs';
import { join, dirname } from 'path';
import { homedir, platform, arch } from 'os';
import { pipeline } from 'stream/promises';
import * as cliProgress from 'cli-progress';
import { createGunzip } from 'zlib';
import * as https from 'https';

// Invoke binaries via execFile (no shell) so paths from SEMGREP_PATH or other
// sources can never be interpreted as shell syntax.
const execFileAsync = promisify(execFile);

export interface InstallOptions {
  force?: boolean;
  silent?: boolean;
  fallbackToPip?: boolean;
}

export interface InstallResult {
  success: boolean;
  path: string;
  method: 'cached' | 'binary' | 'pip' | 'system';
  version?: string;
  error?: string;
}

interface PlatformInfo {
  os: string;
  arch: string;
  assetName: string | null;
}

export class SemgrepInstaller {
  private readonly cacheDir: string;
  private readonly binPath: string;
  private readonly SEMGREP_VERSION = '1.87.0'; // Latest stable version

  constructor() {
    this.cacheDir = join(homedir(), '.mcp-safeguard', 'bin');
    this.binPath = join(this.cacheDir, platform() === 'win32' ? 'semgrep.exe' : 'semgrep');
  }

  /**
   * Check if Semgrep is available (system-wide or cached)
   */
  async isSemgrepAvailable(): Promise<boolean> {
    // Check custom path first
    const customPath = process.env.SEMGREP_PATH;
    if (customPath) {
      try {
        await execFileAsync(customPath, ['--version']);
        return true;
      } catch {
        // Fall through to other checks
      }
    }

    // Check system-wide installation
    try {
      await execFileAsync('semgrep', ['--version']);
      return true;
    } catch {
      // Check cached binary
      if (existsSync(this.binPath)) {
        try {
          await execFileAsync(this.binPath, ['--version']);
          return true;
        } catch {
          // Binary exists but is corrupted
        }
      }
    }

    return false;
  }

  /**
   * Get the path to Semgrep executable
   */
  async getSemgrepPath(): Promise<string | null> {
    // Check custom path first
    const customPath = process.env.SEMGREP_PATH;
    if (customPath && existsSync(customPath)) {
      return customPath;
    }

    // Check system-wide installation
    try {
      await execFileAsync('semgrep', ['--version']);
      return 'semgrep';
    } catch {
      // Check cached binary
      if (existsSync(this.binPath)) {
        return this.binPath;
      }
    }

    return null;
  }

  /**
   * Install Semgrep with auto-detection and fallback
   */
  async install(options: InstallOptions = {}): Promise<InstallResult> {
    const { force = false, silent = false, fallbackToPip = true } = options;

    // Check if already installed
    if (!force) {
      const isAvailable = await this.isSemgrepAvailable();
      if (isAvailable) {
        const path = await this.getSemgrepPath();
        const version = await this.getVersion(path || 'semgrep');
        return {
          success: true,
          path: path || 'semgrep',
          method: path === this.binPath ? 'cached' : 'system',
          version
        };
      }
    }

    // Try binary installation
    const platformInfo = this.detectPlatform();
    if (platformInfo.assetName) {
      try {
        const result = await this.installBinary(platformInfo, silent);
        if (result.success) {
          return result;
        }
      } catch (error: any) {
        if (!silent) {
          console.error(`Binary installation failed: ${error.message}`);
        }
      }
    }

    // Fallback to pip installation
    if (fallbackToPip) {
      if (!silent) {
        console.log('Falling back to pip installation...');
      }
      return this.installViaPip(silent);
    }

    return {
      success: false,
      path: '',
      method: 'binary',
      error: 'No pre-built binary available for this platform and pip fallback is disabled'
    };
  }

  /**
   * Detect platform and return appropriate asset name
   */
  private detectPlatform(): PlatformInfo {
    const os = platform();
    const cpuArch = arch();

    let assetName: string | null = null;

    if (os === 'linux') {
      if (cpuArch === 'x64') {
        assetName = 'semgrep-v{version}-ubuntu-generic-x86_64.tar.gz';
      } else if (cpuArch === 'arm64') {
        assetName = 'semgrep-v{version}-ubuntu-generic-aarch64.tar.gz';
      }
    } else if (os === 'darwin') {
      if (cpuArch === 'x64') {
        assetName = 'semgrep-v{version}-macos-x86_64.tar.gz';
      } else if (cpuArch === 'arm64') {
        assetName = 'semgrep-v{version}-macos-arm64.tar.gz';
      }
    } else if (os === 'win32') {
      // Windows binaries are not consistently available, prefer pip
      assetName = null;
    }

    return {
      os,
      arch: cpuArch,
      assetName: assetName ? assetName.replace('{version}', this.SEMGREP_VERSION) : null
    };
  }

  /**
   * Install from pre-built binary
   */
  private async installBinary(platformInfo: PlatformInfo, silent: boolean): Promise<InstallResult> {
    if (!platformInfo.assetName) {
      throw new Error('No binary available for this platform');
    }

    // Create cache directory
    if (!existsSync(this.cacheDir)) {
      mkdirSync(this.cacheDir, { recursive: true });
    }

    const downloadUrl = `https://github.com/semgrep/semgrep/releases/download/v${this.SEMGREP_VERSION}/${platformInfo.assetName}`;

    if (!silent) {
      console.log(`Downloading Semgrep ${this.SEMGREP_VERSION} from GitHub...`);
    }

    // Download with progress bar
    const tarballPath = join(this.cacheDir, platformInfo.assetName);
    await this.downloadFile(downloadUrl, tarballPath, silent);

    if (!silent) {
      console.log('Extracting...');
    }

    // Extract binary
    await this.extractBinary(tarballPath, silent);

    // Make executable (Unix-like systems)
    if (platform() !== 'win32') {
      chmodSync(this.binPath, 0o755);
    }

    // Verify installation
    try {
      const version = await this.getVersion(this.binPath);
      return {
        success: true,
        path: this.binPath,
        method: 'binary',
        version
      };
    } catch (error: any) {
      throw new Error(`Binary installation verification failed: ${error.message}`);
    }
  }

  /**
   * Download file with progress bar
   */
  private async downloadFile(url: string, destPath: string, silent: boolean): Promise<void> {
    return new Promise((resolve, reject) => {
      https.get(url, (response) => {
        if (response.statusCode === 302 || response.statusCode === 301) {
          // Follow redirect
          const redirectUrl = response.headers.location;
          if (redirectUrl) {
            this.downloadFile(redirectUrl, destPath, silent).then(resolve).catch(reject);
            return;
          }
        }

        if (response.statusCode !== 200) {
          reject(new Error(`Download failed with status ${response.statusCode}`));
          return;
        }

        const totalSize = parseInt(response.headers['content-length'] || '0', 10);
        let downloadedSize = 0;

        const progressBar = !silent && totalSize > 0 ? new cliProgress.SingleBar({
          format: 'Downloading |{bar}| {percentage}% | {value}/{total} MB',
          barCompleteChar: '█',
          barIncompleteChar: '░',
          hideCursor: true
        }) : null;

        if (progressBar) {
          progressBar.start(Math.round(totalSize / 1024 / 1024), 0);
        }

        const fileStream = createWriteStream(destPath);

        response.on('data', (chunk) => {
          downloadedSize += chunk.length;
          if (progressBar) {
            progressBar.update(Math.round(downloadedSize / 1024 / 1024));
          }
        });

        response.pipe(fileStream);

        fileStream.on('finish', () => {
          fileStream.close();
          if (progressBar) {
            progressBar.stop();
          }
          resolve();
        });

        fileStream.on('error', (err) => {
          if (progressBar) {
            progressBar.stop();
          }
          reject(err);
        });
      }).on('error', reject);
    });
  }

  /**
   * Extract binary from tarball
   */
  private async extractBinary(tarballPath: string, silent: boolean): Promise<void> {
    const tar = await import('tar');

    await tar.x({
      file: tarballPath,
      cwd: this.cacheDir,
      filter: (path: string) => path.endsWith('semgrep') || path.endsWith('semgrep.exe')
    });
  }

  /**
   * Install via pip
   */
  private async installViaPip(silent: boolean): Promise<InstallResult> {
    try {
      // Check if Python/pip is available
      try {
        await execFileAsync('pip', ['--version']);
      } catch {
        try {
          await execFileAsync('pip3', ['--version']);
        } catch {
          return {
            success: false,
            path: '',
            method: 'pip',
            error: 'pip is not available. Please install Python with pip first.'
          };
        }
      }

      if (!silent) {
        console.log('Installing Semgrep via pip...');
      }

      // Try pip3 first, then pip
      try {
        await execFileAsync('pip3', ['install', 'semgrep'], { maxBuffer: 10 * 1024 * 1024 });
      } catch {
        await execFileAsync('pip', ['install', 'semgrep'], { maxBuffer: 10 * 1024 * 1024 });
      }

      // Verify installation
      const version = await this.getVersion('semgrep');

      return {
        success: true,
        path: 'semgrep',
        method: 'pip',
        version
      };
    } catch (error: any) {
      return {
        success: false,
        path: '',
        method: 'pip',
        error: `pip installation failed: ${error.message}`
      };
    }
  }

  /**
   * Get Semgrep version
   */
  private async getVersion(command: string): Promise<string> {
    try {
      const { stdout } = await execFileAsync(command, ['--version']);
      return stdout.trim();
    } catch {
      return 'unknown';
    }
  }

  /**
   * Prompt user for installation
   */
  static async promptInstall(): Promise<InstallResult> {
    console.log('\n⚠️  Semgrep is not installed or not found in PATH.');
    console.log('\nSemgrep is required to run security scans.');
    console.log('You can install it in several ways:\n');
    console.log('1. Auto-install (recommended): Let MCP-Safeguard download and install it');
    console.log('2. Manual install via pip: pip install semgrep');
    console.log('3. Set custom path: export SEMGREP_PATH=/path/to/semgrep\n');

    // In automated environments, auto-install
    const installer = new SemgrepInstaller();
    console.log('Attempting automatic installation...\n');
    return installer.install({ silent: false, fallbackToPip: true });
  }
}
