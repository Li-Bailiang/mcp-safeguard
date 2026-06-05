import { promises as fs } from 'fs';
import { join, extname, basename } from 'path';

/**
 * Languages / file classes MCP-Safeguard knows how to map to rule packs.
 */
export type DetectedLanguage =
  | 'javascript'
  | 'typescript'
  | 'python'
  | 'go'
  | 'java'
  | 'rust'
  | 'infra';

const EXT_MAP: Record<string, DetectedLanguage> = {
  '.js': 'javascript',
  '.jsx': 'javascript',
  '.mjs': 'javascript',
  '.cjs': 'javascript',
  '.ts': 'typescript',
  '.tsx': 'typescript',
  '.mts': 'typescript',
  '.cts': 'typescript',
  '.py': 'python',
  '.pyi': 'python',
  '.go': 'go',
  '.java': 'java',
  '.rs': 'rust',
  '.yaml': 'infra',
  '.yml': 'infra',
};

// Directories that should never be walked for language detection (and that
// Semgrep skips by default). Keeps detection fast and avoids dependency noise.
const SKIP_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  'out',
  '.next',
  'target',
  'coverage',
  '.venv',
  'venv',
  '__pycache__',
  '.mypy_cache',
  '.pytest_cache',
  'vendor',
  '.turbo',
]);

const INFRA_FILENAMES = new Set([
  'dockerfile',
  'docker-compose.yml',
  'docker-compose.yaml',
  'mcp.json',
  'mcp-config.json',
  '.mcprc.json',
]);

/**
 * Walk a target path and report which languages / file classes are present.
 *
 * This is the basis for language-gated rule loading: generic Go/Java/Rust rule
 * packs are only loaded when those languages are actually present, which keeps
 * the Semgrep engine from loading (and choking on) hundreds of irrelevant rules
 * for a JavaScript/Python MCP server.
 */
export async function detectLanguages(
  targetPath: string,
  maxDepth = 8
): Promise<Set<DetectedLanguage>> {
  const found = new Set<DetectedLanguage>();

  let stat;
  try {
    stat = await fs.stat(targetPath);
  } catch {
    return found;
  }

  const consider = (name: string): void => {
    const lower = name.toLowerCase();
    const ext = extname(lower);
    const mapped = EXT_MAP[ext];
    if (mapped) {
      found.add(mapped);
    }
    if (
      INFRA_FILENAMES.has(lower) ||
      lower.startsWith('dockerfile') ||
      lower.endsWith('.dockerfile')
    ) {
      found.add('infra');
    }
  };

  if (stat.isFile()) {
    consider(basename(targetPath));
    return found;
  }

  const walk = async (dir: string, depth: number): Promise<void> => {
    if (depth > maxDepth) {
      return;
    }
    let entries;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (SKIP_DIRS.has(entry.name)) {
          continue;
        }
        await walk(join(dir, entry.name), depth + 1);
      } else if (entry.isFile()) {
        consider(entry.name);
      }
    }
  };

  await walk(targetPath, 0);
  return found;
}
