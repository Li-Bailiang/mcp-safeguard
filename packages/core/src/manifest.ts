import { readFile } from 'fs/promises';
import { join } from 'path';
import { ManifestData } from './types.js';

export class ManifestParser {
  async parse(projectPath: string): Promise<ManifestData | null> {
    try {
      const packageJsonPath = join(projectPath, 'package.json');
      const content = await readFile(packageJsonPath, 'utf-8');
      const parsed = JSON.parse(content);

      return {
        name: parsed.name || 'unknown',
        version: parsed.version || '0.0.0',
        dependencies: parsed.dependencies || {},
        devDependencies: parsed.devDependencies || {},
        mcpConfig: parsed.mcp || parsed.mcpConfig
      };
    } catch (error) {
      // Try Python requirements.txt
      try {
        const reqPath = join(projectPath, 'requirements.txt');
        const content = await readFile(reqPath, 'utf-8');
        const dependencies: Record<string, string> = {};

        content.split('\n').forEach(line => {
          const trimmed = line.trim();
          if (trimmed && !trimmed.startsWith('#')) {
            // Handle multi-char version operators (==, >=, <=, ~=, !=) so the
            // version isn't lost — a plain split on [=<>] turns "pkg==1.0.0"
            // into an empty version.
            const match = trimmed.match(/^([A-Za-z0-9._-]+)\s*(?:[=<>!~]=?\s*(.+))?$/);
            if (match) {
              const pkg = match[1].trim();
              const version = (match[2] || '').trim();
              dependencies[pkg] = version || '*';
            }
          }
        });

        return {
          name: 'python-project',
          version: '0.0.0',
          dependencies
        };
      } catch {
        return null;
      }
    }
  }
}
