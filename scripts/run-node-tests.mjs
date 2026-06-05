import { execFileSync } from 'node:child_process';
import { readdir } from 'node:fs/promises';
import { relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

function toPosixPath(value) {
  return value.replace(/\\/g, '/');
}

function escapeRegex(value) {
  return value.replace(/[|\\{}()[\]^$+?.]/g, '\\$&');
}

function globToRegex(pattern) {
  const normalized = toPosixPath(pattern);
  let source = '^';

  for (let index = 0; index < normalized.length; index += 1) {
    const char = normalized[index];

    if (char === '*') {
      if (normalized[index + 1] === '*') {
        if (normalized[index + 2] === '/') {
          source += '(?:.*/)?';
          index += 2;
        } else {
          source += '.*';
          index += 1;
        }
      } else {
        source += '[^/]*';
      }
      continue;
    }

    source += escapeRegex(char);
  }

  return new RegExp(`${source}$`);
}

function getSearchRoot(pattern) {
  const segments = toPosixPath(pattern).split('/');
  const staticSegments = [];

  for (const segment of segments) {
    if (segment.includes('*')) {
      break;
    }
    staticSegments.push(segment);
  }

  return staticSegments.length > 0 ? staticSegments.join('/') : '.';
}

async function walkFiles(root) {
  const files = [];
  const pending = [root];

  while (pending.length > 0) {
    const current = pending.pop();
    let entries;

    try {
      entries = await readdir(current, { withFileTypes: true });
    } catch (error) {
      if (error?.code === 'ENOENT') {
        continue;
      }
      throw error;
    }

    for (const entry of entries.sort((left, right) => right.name.localeCompare(left.name))) {
      const child = resolve(current, entry.name);
      if (entry.isDirectory()) {
        pending.push(child);
      } else if (entry.isFile()) {
        files.push(child);
      }
    }
  }

  return files;
}

export async function expandTestFiles(patterns, options = {}) {
  const cwd = resolve(options.cwd ?? process.cwd());
  const matches = [];

  for (const pattern of patterns) {
    const normalizedPattern = toPosixPath(pattern);
    const matcher = globToRegex(normalizedPattern);
    const searchRoot = resolve(cwd, getSearchRoot(normalizedPattern));
    const files = await walkFiles(searchRoot);

    for (const file of files) {
      const relativePath = toPosixPath(relative(cwd, file));
      if (matcher.test(relativePath)) {
        matches.push(relativePath);
      }
    }
  }

  return [...new Set(matches)].sort((left, right) => left.localeCompare(right));
}

async function main() {
  const patterns = process.argv.slice(2);
  if (patterns.length === 0) {
    console.error('Usage: node scripts/run-node-tests.mjs <glob...>');
    process.exitCode = 1;
    return;
  }

  const files = await expandTestFiles(patterns);
  if (files.length === 0) {
    console.error(`No test files matched: ${patterns.join(', ')}`);
    process.exitCode = 1;
    return;
  }

  execFileSync(process.execPath, ['--import', 'tsx', '--test', ...files], {
    stdio: 'inherit'
  });
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : '';
if (fileURLToPath(import.meta.url) === invokedPath) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
