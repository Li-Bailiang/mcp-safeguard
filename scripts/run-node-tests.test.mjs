import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import test from 'node:test';

import { expandTestFiles } from './run-node-tests.mjs';

test('expands recursive test globs into stable relative file paths', async () => {
  const fixtureRoot = join(tmpdir(), `mcp-safeguard-test-globs-${Date.now()}`);
  await mkdir(join(fixtureRoot, 'src', '__tests__'), { recursive: true });
  await mkdir(join(fixtureRoot, 'src', 'helpers'), { recursive: true });
  await mkdir(join(fixtureRoot, 'tests', 'core'), { recursive: true });

  await writeFile(join(fixtureRoot, 'src', '__tests__', 'index.test.ts'), '');
  await writeFile(join(fixtureRoot, 'src', 'helpers', 'util.test.ts'), '');
  await writeFile(join(fixtureRoot, 'tests', 'core', 'scanner.test.ts'), '');
  await writeFile(join(fixtureRoot, 'src', 'helpers', 'util.ts'), '');

  const files = await expandTestFiles(['src/**/*.test.ts', 'tests/**/*.test.ts'], {
    cwd: fixtureRoot
  });

  assert.deepEqual(files, [
    'src/__tests__/index.test.ts',
    'src/helpers/util.test.ts',
    'tests/core/scanner.test.ts'
  ]);
});
