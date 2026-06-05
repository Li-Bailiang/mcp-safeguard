import { execFile } from 'child_process';
import { promisify } from 'util';
import { join } from 'path';
import { existsSync } from 'fs';
import { SemgrepOutput } from './types.js';
import { DetectedLanguage } from './language-detect.js';

const execFileAsync = promisify(execFile);

const DEFAULT_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes overall subprocess cap
const DEFAULT_MAX_MEMORY_MB = 2000; // per-process memory cap passed to semgrep
const MAX_BUFFER_BYTES = 200 * 1024 * 1024; // 200 MB of JSON before we bail

/**
 * Rule packs that are always relevant to an MCP server (JS/TS/Python/config).
 * These are small and safe to always load.
 */
const ALWAYS_ON_RULE_DIRS = [
  'indirect-injection',
  'context-overshare',
  'excessive-agency',
  'shadow-server',
  'supply-chain',
  'typosquatting',
  'dos',
  'infrastructure',
  'mcp-threats',
];

/**
 * Generic per-language rule packs. These are only loaded when the language is
 * actually present in the scan target. Loading all of them unconditionally is
 * what previously overwhelmed the Semgrep engine (hundreds of rules) and made
 * every default scan crash on memory-constrained machines.
 */
const LANGUAGE_RULE_DIRS: Partial<Record<DetectedLanguage, string>> = {
  go: 'go-security',
  java: 'java-security',
  rust: 'rust-security',
};

export interface SemgrepRunOptions {
  /** Explicit list of rule config files/dirs. Overrides language gating. */
  configs?: string[];
  /** Overall subprocess timeout in milliseconds. */
  timeoutMs?: number;
  /** Memory cap (MB) handed to Semgrep. */
  maxMemoryMb?: number;
}

export class SemgrepRunner {
  private rulesPath: string;
  private semgrepPath: string | null = null;

  constructor(rulesPath?: string) {
    this.rulesPath = rulesPath || join(__dirname, '../rules');
  }

  /**
   * Resolve which rule directories to load for a given set of detected
   * languages. Always-on MCP packs are included; generic language packs are
   * only added when that language is present. Non-existent directories are
   * filtered out so Semgrep never errors on a missing config path.
   */
  resolveConfigs(languages: Set<DetectedLanguage>): string[] {
    const dirs = [...ALWAYS_ON_RULE_DIRS];
    for (const [lang, dir] of Object.entries(LANGUAGE_RULE_DIRS)) {
      if (dir && languages.has(lang as DetectedLanguage)) {
        dirs.push(dir);
      }
    }

    const resolved = dirs
      .map((d) => join(this.rulesPath, d))
      .filter((p) => existsSync(p));

    // Fallback: if nothing resolved (unexpected layout), scan the whole tree.
    return resolved.length > 0 ? resolved : [this.rulesPath];
  }

  /**
   * Get the Semgrep command to use (respects SEMGREP_PATH).
   */
  private async getSemgrepCommand(): Promise<string> {
    if (this.semgrepPath) {
      return this.semgrepPath;
    }

    const customPath = process.env.SEMGREP_PATH;
    if (customPath) {
      this.semgrepPath = customPath;
      return customPath;
    }

    this.semgrepPath = 'semgrep';
    return 'semgrep';
  }

  async run(targetPath: string, options: SemgrepRunOptions = {}): Promise<SemgrepOutput> {
    const semgrepCmd = await this.getSemgrepCommand();

    const configs =
      options.configs && options.configs.length > 0 ? options.configs : [this.rulesPath];
    const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const maxMemoryMb = options.maxMemoryMb ?? DEFAULT_MAX_MEMORY_MB;

    // Build args as an array and invoke via execFile (no shell). This removes
    // the shell-injection surface that existed when the command was assembled
    // by string interpolation of user-controlled paths.
    const args: string[] = ['scan'];
    for (const cfg of configs) {
      args.push('--config', cfg);
    }
    args.push(
      '--json',
      '--quiet',
      '--no-rewrite-rule-ids', // check_id === bare rule id (stable for presets/tests)
      '--disable-version-check',
      '--metrics',
      'off',
      '--max-memory',
      String(maxMemoryMb),
      '--timeout',
      '30',
      '--timeout-threshold',
      '3',
      targetPath
    );

    try {
      const { stdout } = await execFileAsync(semgrepCmd, args, {
        maxBuffer: MAX_BUFFER_BYTES,
        timeout: timeoutMs,
        windowsHide: true,
        env: {
          ...process.env,
          PYTHONUTF8: '1',
          PYTHONIOENCODING: 'utf-8',
        },
      });

      return this.parseOutput(stdout);
    } catch (error: any) {
      // Semgrep exits non-zero when blocking findings are present but still
      // prints a valid JSON document on stdout — recover it.
      if (error && typeof error.stdout === 'string' && error.stdout.trim().startsWith('{')) {
        try {
          return this.parseOutput(error.stdout);
        } catch {
          // fall through to structured error handling
        }
      }

      throw this.toFriendlyError(error, semgrepCmd, timeoutMs);
    }
  }

  /**
   * Parse and defensively normalize Semgrep JSON so a malformed/empty document
   * never crashes the scanner with an unguarded property access.
   */
  private parseOutput(stdout: string): SemgrepOutput {
    let parsed: any;
    try {
      parsed = JSON.parse(stdout);
    } catch {
      throw new Error('Failed to parse Semgrep output (not valid JSON).');
    }

    return {
      results: Array.isArray(parsed?.results) ? parsed.results : [],
      errors: Array.isArray(parsed?.errors) ? parsed.errors : [],
      version: typeof parsed?.version === 'string' ? parsed.version : undefined,
    };
  }

  /**
   * Translate raw subprocess failures into actionable messages.
   */
  private toFriendlyError(error: any, semgrepCmd: string, timeoutMs: number): Error {
    if (error?.code === 'ENOENT') {
      return new Error(
        `Semgrep executable not found at: ${semgrepCmd}\n` +
          'Install it (pip install semgrep) or set the SEMGREP_PATH environment variable.'
      );
    }

    // execFile sets `killed` / signal when the timeout fires.
    if (error?.killed || error?.signal === 'SIGTERM' || error?.code === 'ETIMEDOUT') {
      return new Error(
        `Semgrep timed out after ${Math.round(timeoutMs / 1000)}s. ` +
          'Scan a smaller path, or raise the timeout.'
      );
    }

    const stderr = (error?.stderr || '').toString();
    if (/out of memory|MemoryError|WinError 1455|paging file|page file|Cannot allocate/i.test(stderr)) {
      return new Error(
        'Semgrep ran out of memory while analyzing this target. ' +
          'Try scanning a smaller directory or lowering --max-memory.'
      );
    }

    const detail = stderr ? `\n${stderr.split('\n').slice(0, 6).join('\n')}` : '';
    return new Error(`Semgrep execution failed: ${error?.message || 'unknown error'}${detail}`);
  }

  /**
   * Check if Semgrep is available.
   */
  async checkInstallation(): Promise<boolean> {
    const semgrepCmd = await this.getSemgrepCommand();

    try {
      await execFileAsync(semgrepCmd, ['--version'], { windowsHide: true, timeout: 30000 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get Semgrep version.
   */
  async getVersion(): Promise<string | null> {
    const semgrepCmd = await this.getSemgrepCommand();

    try {
      const { stdout } = await execFileAsync(semgrepCmd, ['--version'], {
        windowsHide: true,
        timeout: 30000,
      });
      return stdout.trim();
    } catch {
      return null;
    }
  }

  /**
   * Check if Semgrep is available (static helper).
   */
  static async isSemgrepAvailable(): Promise<boolean> {
    const runner = new SemgrepRunner();
    return runner.checkInstallation();
  }

  /**
   * Get detailed installation status.
   */
  static async getInstallationStatus(): Promise<{
    available: boolean;
    version?: string;
    path?: string;
    error?: string;
  }> {
    const runner = new SemgrepRunner();
    const isAvailable = await runner.checkInstallation();

    if (!isAvailable) {
      return {
        available: false,
        error: 'Semgrep is not installed or not found in PATH',
      };
    }

    const version = await runner.getVersion();
    const path = process.env.SEMGREP_PATH || 'semgrep (system PATH)';

    return {
      available: true,
      version: version || undefined,
      path,
    };
  }
}
