import { readFile, readdir, stat } from 'fs/promises';
import { join, relative, dirname, resolve } from 'path';
import { Finding, Severity, Location } from '../types.js';

export interface TaintSource {
  file: string;
  export: string;
  reason: string; // "fetch", "req.body", etc.
  line: number;
}

export interface TaintSink {
  file: string;
  line: number;
  sink: string; // "llm.sendMessage", etc.
  importedFrom?: string;
  importedName?: string;
}

interface ModuleExport {
  name: string;
  line: number;
  isTainted: boolean;
  taintReason?: string;
}

interface ModuleImport {
  name: string;
  localName: string;
  from: string;
  line: number;
}

interface ModuleInfo {
  file: string;
  exports: ModuleExport[];
  imports: ModuleImport[];
  content: string;
}

export class CrossFileTaintAnalyzer {
  private moduleCache: Map<string, ModuleInfo> = new Map();
  private maxHops: number = 2;

  // Taint sources - functions/methods that introduce user-controlled data
  private taintSources = [
    'fetch',
    'axios',
    'request',
    'req.body',
    'req.query',
    'req.params',
    'req.headers',
    'process.argv',
    'process.env',
    'location.search',
    'location.hash',
    'window.location',
    'document.cookie',
    'localStorage.getItem',
    'sessionStorage.getItem'
  ];

  // Taint sinks - dangerous operations that should not receive tainted data
  private taintSinks = [
    'llm.sendMessage',
    'llm.send',
    'anthropic.messages.create',
    'openai.chat.completions.create',
    'eval',
    'Function',
    'vm.runInNewContext',
    'vm.runInThisContext',
    'exec',
    'execSync',
    'spawn',
    'execFile',
    'child_process.exec',
    'child_process.execSync',
    'child_process.spawn'
  ];

  async analyze(targetPath: string): Promise<Finding[]> {
    const findings: Finding[] = [];

    // Step 1: Scan all TypeScript/JavaScript files
    const files = await this.findSourceFiles(targetPath);

    // Step 2: Parse each file to build module graph
    for (const file of files) {
      await this.parseModule(file);
    }

    // Step 3: Identify taint sources
    const sources = this.identifyTaintSources();

    // Step 4: Track taint propagation across files
    const taintedExports = this.propagateTaint(sources);

    // Step 5: Find sinks that receive tainted data
    const crossFileTaints = this.findTaintedSinks(taintedExports);

    // Step 6: Convert to findings
    for (const taint of crossFileTaints) {
      findings.push(this.createFinding(taint, targetPath));
    }

    return findings;
  }

  private async findSourceFiles(targetPath: string): Promise<string[]> {
    const files: string[] = [];

    const traverse = async (dir: string) => {
      try {
        const entries = await readdir(dir);

        for (const entry of entries) {
          const fullPath = join(dir, entry);
          const stats = await stat(fullPath);

          if (stats.isDirectory()) {
            // Skip node_modules and common directories
            if (!entry.startsWith('.') && entry !== 'node_modules' && entry !== 'dist' && entry !== 'build') {
              await traverse(fullPath);
            }
          } else if (stats.isFile()) {
            // Include .ts, .tsx, .js, .jsx files
            if (/\.(ts|tsx|js|jsx)$/.test(entry)) {
              files.push(fullPath);
            }
          }
        }
      } catch (error) {
        // Skip directories we can't read
      }
    };

    const stats = await stat(targetPath);
    if (stats.isFile()) {
      files.push(targetPath);
    } else {
      await traverse(targetPath);
    }

    return files;
  }

  private async parseModule(filePath: string): Promise<ModuleInfo> {
    if (this.moduleCache.has(filePath)) {
      return this.moduleCache.get(filePath)!;
    }

    const content = await readFile(filePath, 'utf-8');
    const exports: ModuleExport[] = [];
    const imports: ModuleImport[] = [];

    // Parse imports
    const importRegex = /import\s+(?:{([^}]+)}|(\w+))\s+from\s+['"]([^'"]+)['"]/g;
    let match;

    const lines = content.split('\n');

    while ((match = importRegex.exec(content)) !== null) {
      const line = content.substring(0, match.index).split('\n').length;

      if (match[1]) {
        // Named imports: import { a, b } from 'module'
        const names = match[1].split(',').map(n => n.trim());
        for (const name of names) {
          const [imported, local] = name.includes(' as ')
            ? name.split(' as ').map(s => s.trim())
            : [name, name];
          imports.push({
            name: imported,
            localName: local,
            from: match[3],
            line
          });
        }
      } else if (match[2]) {
        // Default import: import x from 'module'
        imports.push({
          name: 'default',
          localName: match[2],
          from: match[3],
          line
        });
      }
    }

    // Also handle require imports
    const requireRegex = /(?:const|let|var)\s+(?:{([^}]+)}|(\w+))\s*=\s*require\s*\(['"]([^'"]+)['"]\)/g;
    while ((match = requireRegex.exec(content)) !== null) {
      const line = content.substring(0, match.index).split('\n').length;

      if (match[1]) {
        // Destructured: const { a, b } = require('module')
        const names = match[1].split(',').map(n => n.trim());
        for (const name of names) {
          imports.push({
            name,
            localName: name,
            from: match[3],
            line
          });
        }
      } else if (match[2]) {
        // Direct: const x = require('module')
        imports.push({
          name: 'default',
          localName: match[2],
          from: match[3],
          line
        });
      }
    }

    // Parse exports
    const exportRegex = /export\s+(?:const|let|var|function|class|interface|type)\s+(\w+)/g;
    while ((match = exportRegex.exec(content)) !== null) {
      const line = content.substring(0, match.index).split('\n').length;
      exports.push({
        name: match[1],
        line,
        isTainted: false
      });
    }

    // Parse export { ... }
    const exportListRegex = /export\s+{([^}]+)}/g;
    while ((match = exportListRegex.exec(content)) !== null) {
      const line = content.substring(0, match.index).split('\n').length;
      const names = match[1].split(',').map(n => n.trim().split(' as ')[0]);
      for (const name of names) {
        exports.push({
          name,
          line,
          isTainted: false
        });
      }
    }

    // Parse module.exports
    const moduleExportsRegex = /module\.exports\s*=\s*{([^}]+)}/g;
    while ((match = moduleExportsRegex.exec(content)) !== null) {
      const line = content.substring(0, match.index).split('\n').length;
      const names = match[1].split(',').map(n => {
        const parts = n.trim().split(':');
        return parts[0].trim();
      });
      for (const name of names) {
        exports.push({
          name,
          line,
          isTainted: false
        });
      }
    }

    const moduleInfo: ModuleInfo = {
      file: filePath,
      exports,
      imports,
      content
    };

    this.moduleCache.set(filePath, moduleInfo);
    return moduleInfo;
  }

  private identifyTaintSources(): TaintSource[] {
    const sources: TaintSource[] = [];

    for (const [filePath, moduleInfo] of this.moduleCache) {
      const lines = moduleInfo.content.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Check if line contains any taint source
        for (const source of this.taintSources) {
          if (line.includes(source)) {
            // Check if this is part of an exported variable/function
            for (const exp of moduleInfo.exports) {
              // Check if this taint source is within the export definition
              // Simple heuristic: check nearby lines
              const exportLineStart = exp.line - 1;
              const exportLineEnd = Math.min(exportLineStart + 20, lines.length);

              if (i >= exportLineStart && i < exportLineEnd) {
                sources.push({
                  file: filePath,
                  export: exp.name,
                  reason: source,
                  line: i + 1
                });

                // Mark export as tainted
                exp.isTainted = true;
                exp.taintReason = source;
              }
            }
          }
        }
      }
    }

    return sources;
  }

  private propagateTaint(sources: TaintSource[]): Map<string, Set<string>> {
    // Map: file -> Set of tainted export names
    const taintedExports = new Map<string, Set<string>>();

    // Initialize with direct sources
    for (const source of sources) {
      if (!taintedExports.has(source.file)) {
        taintedExports.set(source.file, new Set());
      }
      taintedExports.get(source.file)!.add(source.export);
    }

    // Propagate taint across imports (up to maxHops)
    for (let hop = 0; hop < this.maxHops; hop++) {
      let changed = false;

      for (const [filePath, moduleInfo] of this.moduleCache) {
        for (const imp of moduleInfo.imports) {
          // Resolve the imported module path
          const importedFilePath = this.resolveImportPath(filePath, imp.from);

          if (importedFilePath && taintedExports.has(importedFilePath)) {
            const taintedNames = taintedExports.get(importedFilePath)!;

            if (taintedNames.has(imp.name)) {
              // This import brings in tainted data
              // Check if it's re-exported
              for (const exp of moduleInfo.exports) {
                // Check if export uses the imported tainted data
                const lines = moduleInfo.content.split('\n');
                const exportLineStart = exp.line - 1;
                const exportLineEnd = Math.min(exportLineStart + 20, lines.length);

                for (let i = exportLineStart; i < exportLineEnd; i++) {
                  if (lines[i].includes(imp.localName)) {
                    // This export uses tainted import
                    if (!taintedExports.has(filePath)) {
                      taintedExports.set(filePath, new Set());
                    }
                    if (!taintedExports.get(filePath)!.has(exp.name)) {
                      taintedExports.get(filePath)!.add(exp.name);
                      changed = true;
                    }
                  }
                }
              }
            }
          }
        }
      }

      if (!changed) break;
    }

    return taintedExports;
  }

  private findTaintedSinks(taintedExports: Map<string, Set<string>>): TaintSink[] {
    const sinks: TaintSink[] = [];

    for (const [filePath, moduleInfo] of this.moduleCache) {
      const lines = moduleInfo.content.split('\n');

      // Find all sink usages
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        for (const sink of this.taintSinks) {
          if (line.includes(sink)) {
            // Check if any tainted import is used in this line or nearby
            for (const imp of moduleInfo.imports) {
              const importedFilePath = this.resolveImportPath(filePath, imp.from);

              if (importedFilePath && taintedExports.has(importedFilePath)) {
                const taintedNames = taintedExports.get(importedFilePath)!;

                if (taintedNames.has(imp.name) && line.includes(imp.localName)) {
                  sinks.push({
                    file: filePath,
                    line: i + 1,
                    sink,
                    importedFrom: importedFilePath,
                    importedName: imp.name
                  });
                }
              }
            }
          }
        }
      }
    }

    return sinks;
  }

  private resolveImportPath(fromFile: string, importPath: string): string | null {
    // Skip node_modules and external packages
    if (!importPath.startsWith('.')) {
      return null;
    }

    const dir = dirname(fromFile);
    let resolved = resolve(dir, importPath);

    // Try different extensions
    const extensions = ['', '.ts', '.tsx', '.js', '.jsx'];
    for (const ext of extensions) {
      const fullPath = resolved + ext;
      if (this.moduleCache.has(fullPath)) {
        return fullPath;
      }
    }

    // Try index files
    for (const ext of ['.ts', '.tsx', '.js', '.jsx']) {
      const indexPath = join(resolved, 'index' + ext);
      if (this.moduleCache.has(indexPath)) {
        return indexPath;
      }
    }

    return null;
  }

  private createFinding(taint: TaintSink, targetPath: string): Finding {
    const relativePath = relative(targetPath, taint.file);
    const moduleInfo = this.moduleCache.get(taint.file);
    const lines = moduleInfo?.content.split('\n') || [];
    const lineContent = lines[taint.line - 1] || '';

    return {
      id: `cross-file-taint-${taint.file}-${taint.line}`,
      check_id: 'mcp-safeguard.cross-file-taint',
      path: relativePath,
      start: { line: taint.line, col: 1 },
      end: { line: taint.line, col: lineContent.length },
      message: `Cross-file taint detected: Tainted data from ${taint.importedName} (imported from ${relative(targetPath, taint.importedFrom || '')}) flows to dangerous sink ${taint.sink}`,
      severity: 'ERROR' as Severity,
      category: 'security',
      metadata: {
        category: 'security',
        confidence: 'MEDIUM',
        impact: 'HIGH',
        likelihood: 'MEDIUM',
        subcategory: ['injection', 'cross-file-taint'],
        cwe: ['CWE-79', 'CWE-89', 'CWE-94'],
        technology: ['typescript', 'javascript']
      },
      extra: {
        lines: lineContent,
        message: `Cross-file taint detected: Tainted data from ${taint.importedName} flows to ${taint.sink}`,
        metadata: {
          category: 'security',
          confidence: 'MEDIUM',
          impact: 'HIGH',
          likelihood: 'MEDIUM',
          subcategory: ['injection', 'cross-file-taint'],
          cwe: ['CWE-79', 'CWE-89', 'CWE-94'],
          technology: ['typescript', 'javascript']
        },
        metavars: {
          sink: taint.sink,
          source: taint.importedName,
          sourceFile: taint.importedFrom
        }
      }
    };
  }
}

export async function findCrossFileTaints(targetPath: string): Promise<Finding[]> {
  const analyzer = new CrossFileTaintAnalyzer();
  return analyzer.analyze(targetPath);
}
