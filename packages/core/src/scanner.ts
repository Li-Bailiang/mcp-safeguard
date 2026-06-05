import { SemgrepRunner } from './semgrep.js';
import { ManifestParser } from './manifest.js';
import { IgnoreManager } from './ignore.js';
import { RiskScorer } from './scorer.js';
import { ScanResult, Finding, ScanSummary, Severity, SemgrepResult, FindingMetadata } from './types.js';
import { VERSION, RULES_VERSION } from './version.js';
import { detectLanguages } from './language-detect.js';
import { promises as fs } from 'fs';
import { join, relative, isAbsolute, sep } from 'path';
import { findCrossFileTaints } from './static/cross-file-taint.js';

export interface ScanOptions {
  crossFile?: boolean;
}

export class Scanner {
  private semgrep: SemgrepRunner;
  private manifestParser: ManifestParser;
  private ignoreManager: IgnoreManager;
  private scorer: RiskScorer;

  // Infrastructure file patterns to detect
  private readonly infrastructurePatterns = [
    'Dockerfile',
    'dockerfile',
    '*.dockerfile',
    'docker-compose.yml',
    'docker-compose.yaml',
    'deployment.yaml',
    'deployment.yml',
    'pod.yaml',
    'pod.yml',
    'service.yaml',
    'service.yml',
    'statefulset.yaml',
    'statefulset.yml',
    'daemonset.yaml',
    'daemonset.yml',
    'configmap.yaml',
    'configmap.yml',
    'secret.yaml',
    'secret.yml',
    'ingress.yaml',
    'ingress.yml',
    'networkpolicy.yaml',
    'networkpolicy.yml',
    'role.yaml',
    'role.yml',
    'rolebinding.yaml',
    'rolebinding.yml',
    'clusterrole.yaml',
    'clusterrole.yml',
    'clusterrolebinding.yaml',
    'clusterrolebinding.yml',
    'mcp.json',
    'mcp-config.json',
    '.mcprc.json'
  ];

  constructor() {
    this.semgrep = new SemgrepRunner();
    this.manifestParser = new ManifestParser();
    this.ignoreManager = new IgnoreManager();
    this.scorer = new RiskScorer();
  }

  async scan(targetPath: string, options?: ScanOptions): Promise<ScanResult> {
    const startTime = Date.now();

    // Check Semgrep installation
    const isInstalled = await this.semgrep.checkInstallation();
    if (!isInstalled) {
      const errorMsg = [
        'Semgrep is not installed or not found in PATH.',
        '',
        'Installation options:',
        '  1. Install via pip: pip install semgrep',
        '  2. Install via pipx: pipx install semgrep',
        '  3. Use auto-installer: npx @mcp-safeguard/semgrep-installer',
        '  4. Set custom path: export SEMGREP_PATH=/path/to/semgrep',
        '',
        'For more information, visit: https://semgrep.dev/docs/getting-started/'
      ].join('\n');
      throw new Error(errorMsg);
    }

    // Load ignore patterns
    await this.ignoreManager.loadIgnoreFile(targetPath);

    // Detect infrastructure files
    const hasInfrastructure = await this.detectInfrastructureFiles(targetPath);

    // Detect which languages are present and load only the relevant rule packs.
    // Loading every generic per-language pack unconditionally is what previously
    // overwhelmed the Semgrep engine and crashed default scans.
    const languages = await detectLanguages(targetPath);
    const configs = this.semgrep.resolveConfigs(languages);

    // Run Semgrep
    const semgrepOutput = await this.semgrep.run(targetPath, { configs });

    // Convert results to findings. Each record is mapped defensively so a
    // malformed Semgrep entry can never crash the scan via an unguarded access.
    const findings: Finding[] = semgrepOutput.results
      .filter(result => result && typeof result.path === 'string')
      .filter(result => !this.ignoreManager.shouldIgnore(result.path))
      .map((result, index) => this.toFinding(result, index, targetPath));

    // Run cross-file taint analysis if enabled
    if (options?.crossFile) {
      try {
        const crossFileFindings = await findCrossFileTaints(targetPath);
        findings.push(...crossFileFindings.filter(
          finding => !this.ignoreManager.shouldIgnore(finding.path)
        ));
      } catch (error) {
        // Log but don't fail the scan if cross-file analysis fails
        console.error('Cross-file taint analysis failed:', error);
      }
    }

    // Calculate summary
    const summary = this.calculateSummary(findings);

    const duration = Date.now() - startTime;

    return {
      findings,
      summary,
      metadata: {
        version: VERSION,
        timestamp: new Date().toISOString(),
        targetPath,
        rulesVersion: RULES_VERSION,
        duration,
        hasInfrastructure
      }
    };
  }

  /**
   * Map a raw Semgrep result into a Finding, tolerating missing/odd fields.
   */
  private toFinding(result: SemgrepResult, index: number, root: string): Finding {
    const extra = (result.extra ?? {}) as SemgrepResult['extra'];
    const metadata = (extra.metadata ?? {}) as FindingMetadata;
    const message = extra.message ?? result.check_id ?? 'Security finding';
    const severity = this.normalizeSeverity(extra.severity);
    const category =
      typeof metadata.category === 'string' && metadata.category
        ? metadata.category
        : 'uncategorized';

    return {
      id: `finding-${index}`,
      check_id: result.check_id ?? 'unknown-rule',
      path: this.relativizePath(result.path, root),
      start: result.start ?? { line: 0, col: 0 },
      end: result.end ?? { line: 0, col: 0 },
      message,
      severity,
      category,
      metadata,
      extra: {
        lines: extra.lines ?? '',
        message,
        metadata,
        metavars: extra.metavars,
      },
    };
  }

  /**
   * Present finding paths relative to the scan target, using forward slashes.
   *
   * The CLI resolves the scan target to an absolute path before handing it to
   * Semgrep, so Semgrep echoes back absolute paths (e.g. `C:\Users\…\index.js`).
   * Absolute paths are noisy in the terminal table and — more importantly —
   * break SARIF consumers like GitHub code scanning, which expect repo-relative
   * URIs to map findings onto files. Normalizing here fixes every output format
   * (text, JSON, SARIF, HTML) at the source. Paths that are already relative, or
   * that fall outside the scan root, are left untouched.
   */
  private relativizePath(filePath: string, root: string): string {
    try {
      if (!isAbsolute(filePath)) return filePath;
      const rel = relative(root, filePath);
      if (!rel || rel.startsWith('..')) return filePath;
      return rel.split(sep).join('/');
    } catch {
      return filePath;
    }
  }

  /**
   * Coerce Semgrep severities into the three buckets the summary expects.
   */
  private normalizeSeverity(raw: unknown): Severity {
    const value = typeof raw === 'string' ? raw.toUpperCase() : '';
    if (value === 'ERROR') return 'ERROR';
    if (value === 'WARNING') return 'WARNING';
    return 'INFO';
  }

  private calculateSummary(findings: Finding[]): ScanSummary {
    const bySeverity: Record<Severity, number> = {
      ERROR: 0,
      WARNING: 0,
      INFO: 0
    };

    const byCategory: Record<string, number> = {};

    for (const finding of findings) {
      bySeverity[finding.severity]++;
      byCategory[finding.category] = (byCategory[finding.category] || 0) + 1;
    }

    const riskScore = this.scorer.calculateScore(findings);

    return {
      total: findings.length,
      bySeverity,
      byCategory,
      riskScore
    };
  }

  /**
   * Detects infrastructure files in the target path
   */
  private async detectInfrastructureFiles(targetPath: string): Promise<boolean> {
    try {
      const stats = await fs.stat(targetPath);

      if (stats.isFile()) {
        return this.isInfrastructureFile(targetPath);
      }

      // If directory, recursively check for infrastructure files
      return await this.findInfrastructureInDirectory(targetPath);
    } catch (error) {
      // If path doesn't exist or can't be accessed, return false
      return false;
    }
  }

  /**
   * Recursively search directory for infrastructure files
   */
  private async findInfrastructureInDirectory(dirPath: string, depth: number = 0): Promise<boolean> {
    // Limit recursion depth to avoid performance issues
    if (depth > 5) return false;

    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = join(dirPath, entry.name);

        // Skip common directories to ignore
        if (entry.isDirectory()) {
          if (['node_modules', '.git', 'dist', 'build', '.next', 'target'].includes(entry.name)) {
            continue;
          }

          const found = await this.findInfrastructureInDirectory(fullPath, depth + 1);
          if (found) return true;
        } else if (entry.isFile()) {
          if (this.isInfrastructureFile(entry.name)) {
            return true;
          }
        }
      }
    } catch (error) {
      // Ignore permission errors and continue
    }

    return false;
  }

  /**
   * Check if a file matches infrastructure patterns
   */
  private isInfrastructureFile(filename: string): boolean {
    const basename = filename.split('/').pop() || filename;
    const lower = basename.toLowerCase();

    return this.infrastructurePatterns.some(pattern => {
      if (pattern.includes('*')) {
        // Escape regex metacharacters in the literal parts, then replace the
        // escaped wildcard placeholder with `.*`. Without escaping, dots in
        // patterns like `*.dockerfile` would match any character rather than
        // a literal dot (e.g. `xdockerfile` would otherwise match).
        // Escape all regex metacharacters except `*`, then turn `*` into `.*`.
        const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
        const regex = new RegExp('^' + escaped + '$', 'i');
        return regex.test(lower);
      }
      return lower === pattern.toLowerCase();
    });
  }
}
