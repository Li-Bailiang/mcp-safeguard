import { readFile } from 'fs/promises';
import { join, relative, isAbsolute, sep } from 'path';
import ignore from 'ignore';

export class IgnoreManager {
  private ig: ReturnType<typeof ignore>;
  private basePath: string | null = null;

  constructor(basePath?: string) {
    this.ig = ignore();
    this.basePath = basePath ?? null;
    this.addDefaultPatterns();
  }

  private addDefaultPatterns(): void {
    this.ig.add([
      'node_modules/**',
      '.git/**',
      'dist/**',
      'build/**',
      '*.min.js',
      '*.bundle.js',
      '.env*',
      '*.log'
    ]);
  }

  /**
   * Set the base directory used to relativize absolute paths before matching.
   */
  setBasePath(basePath: string): void {
    this.basePath = basePath;
  }

  async loadIgnoreFile(projectPath: string): Promise<void> {
    // The scan target doubles as the base for relativizing absolute result
    // paths reported by Semgrep.
    if (!this.basePath) {
      this.basePath = projectPath;
    }

    try {
      const ignoreFile = join(projectPath, '.mcpignore');
      const content = await readFile(ignoreFile, 'utf-8');
      this.ig.add(content);
    } catch {
      // No .mcpignore file, use defaults only
    }
  }

  /**
   * The `ignore` package only accepts forward-slashed, *relative* paths and
   * throws on absolute ones. Semgrep reports absolute paths, so we normalize
   * first and never let a path quirk crash the scan.
   */
  shouldIgnore(path: string): boolean {
    const normalized = this.normalize(path);
    if (!normalized || normalized.startsWith('..')) {
      // Empty (the target itself) or outside the base dir: don't ignore.
      return false;
    }
    try {
      return this.ig.ignores(normalized);
    } catch {
      return false;
    }
  }

  /**
   * Produce a POSIX-style relative path the `ignore` matcher can consume.
   */
  private normalize(p: string): string {
    let rel = p;
    if (this.basePath && isAbsolute(p)) {
      rel = relative(this.basePath, p);
    }
    rel = rel.split(sep).join('/').replace(/\\/g, '/');
    if (rel.startsWith('./')) {
      rel = rel.slice(2);
    }
    return rel;
  }
}
