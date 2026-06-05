import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { ConfigLoader, ConfigValidator, PathMatcher, RuleFilter } from './config.js';
import { writeFileSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

// Test fixtures
const testDir = join(tmpdir(), 'mcp-safeguard-test-' + Date.now());

function setupTestDir() {
  mkdirSync(testDir, { recursive: true });
}

function cleanupTestDir() {
  try {
    rmSync(testDir, { recursive: true, force: true });
  } catch (e) {
    // Ignore cleanup errors
  }
}

test('ConfigLoader - load JSON config', async () => {
  setupTestDir();

  const configPath = join(testDir, '.mcp-safeguardrc.json');
  const config = {
    rules: {
      'test-rule': 'error',
    },
    ignore: ['**/test/**'],
  };

  writeFileSync(configPath, JSON.stringify(config));

  const loader = new ConfigLoader();
  const loaded = await loader.load(testDir);

  assert.ok(loaded.rules['test-rule']);
  assert.ok(loaded.ignore.includes('**/test/**'));

  cleanupTestDir();
});

test('ConfigLoader - discover config in parent directory', async () => {
  setupTestDir();

  const subDir = join(testDir, 'sub', 'deep');
  mkdirSync(subDir, { recursive: true });

  const configPath = join(testDir, '.mcp-safeguardrc.json');
  const config = {
    rules: {
      'parent-rule': 'warn',
    },
  };

  writeFileSync(configPath, JSON.stringify(config));

  const loader = new ConfigLoader();
  const loaded = await loader.load(subDir);

  assert.ok(loaded.rules['parent-rule']);

  cleanupTestDir();
});

test('ConfigLoader - merge configs with extends', async () => {
  setupTestDir();

  const baseConfigPath = join(testDir, 'base.json');
  const baseConfig = {
    rules: {
      'base-rule': 'error',
      'override-rule': 'warn',
    },
    ignore: ['**/base/**'],
  };
  writeFileSync(baseConfigPath, JSON.stringify(baseConfig));

  const configPath = join(testDir, '.mcp-safeguardrc.json');
  const config = {
    extends: './base.json',
    rules: {
      'override-rule': 'error',
      'new-rule': 'warn',
    },
    ignore: ['**/custom/**'],
  };
  writeFileSync(configPath, JSON.stringify(config));

  const loader = new ConfigLoader();
  const loaded = await loader.load(testDir);

  assert.equal(loaded.rules['base-rule'], 'error');
  assert.equal(loaded.rules['override-rule'], 'error');
  assert.equal(loaded.rules['new-rule'], 'warn');
  assert.ok(loaded.ignore.includes('**/base/**'));
  assert.ok(loaded.ignore.includes('**/custom/**'));

  cleanupTestDir();
});

test('ConfigLoader - extend multiple configs', async () => {
  setupTestDir();

  const config1Path = join(testDir, 'config1.json');
  writeFileSync(config1Path, JSON.stringify({
    rules: { 'rule1': 'error' },
  }));

  const config2Path = join(testDir, 'config2.json');
  writeFileSync(config2Path, JSON.stringify({
    rules: { 'rule2': 'warn' },
  }));

  const configPath = join(testDir, '.mcp-safeguardrc.json');
  writeFileSync(configPath, JSON.stringify({
    extends: ['./config1.json', './config2.json'],
    rules: { 'rule3': 'off' },
  }));

  const loader = new ConfigLoader();
  const loaded = await loader.load(testDir);

  assert.equal(loaded.rules['rule1'], 'error');
  assert.equal(loaded.rules['rule2'], 'warn');
  assert.equal(loaded.rules['rule3'], 'off');

  cleanupTestDir();
});

test('ConfigLoader - YAML config support', async () => {
  setupTestDir();

  const configPath = join(testDir, '.mcp-safeguardrc.yaml');
  const yamlContent = `
rules:
  test-rule: error
  another-rule: warn
ignore:
  - '**/test/**'
  - '**/build/**'
`;
  writeFileSync(configPath, yamlContent);

  const loader = new ConfigLoader();
  const loaded = await loader.load(testDir);

  assert.equal(loaded.rules['test-rule'], 'error');
  assert.equal(loaded.rules['another-rule'], 'warn');
  assert.ok(loaded.ignore.includes('**/test/**'));

  cleanupTestDir();
});

test('ConfigLoader - apply default config', async () => {
  setupTestDir();

  const loader = new ConfigLoader();
  const loaded = await loader.load(testDir);

  // Should have default ignores
  assert.ok(loaded.ignore.includes('**/node_modules/**'));
  assert.ok(loaded.ignore.includes('**/dist/**'));

  // Should have default severity
  assert.equal(loaded.severity.failOn, 'high');

  // Should have default languages
  assert.ok(loaded.languages.includes('javascript'));
  assert.ok(loaded.languages.includes('typescript'));

  cleanupTestDir();
});

test('ConfigValidator - validate valid config', () => {
  const validator = new ConfigValidator();
  const config = {
    rules: {
      'test-rule': 'error',
      'another-rule': 'warn',
    },
    severity: {
      failOn: 'high',
    },
    output: {
      format: 'json',
    },
  };

  const result = validator.validate(config);
  assert.equal(result.valid, true);
  assert.equal(result.errors.length, 0);
});

test('ConfigValidator - detect invalid rule values', () => {
  const validator = new ConfigValidator();
  const config = {
    rules: {
      'test-rule': 'invalid' as any,
    },
  };

  const result = validator.validate(config);
  assert.equal(result.valid, false);
  assert.ok(result.errors.length > 0);
  assert.ok(result.errors[0].includes('test-rule'));
});

test('ConfigValidator - detect invalid severity', () => {
  const validator = new ConfigValidator();
  const config = {
    severity: {
      failOn: 'invalid' as any,
    },
  };

  const result = validator.validate(config);
  assert.equal(result.valid, false);
  assert.ok(result.errors[0].includes('severity.failOn'));
});

test('ConfigValidator - detect invalid output format', () => {
  const validator = new ConfigValidator();
  const config = {
    output: {
      format: 'invalid' as any,
    },
  };

  const result = validator.validate(config);
  assert.equal(result.valid, false);
  assert.ok(result.errors[0].includes('output.format'));
});

test('PathMatcher - match ignore patterns', () => {
  const matcher = new PathMatcher([
    '**/node_modules/**',
    '**/test/**',
    '*.test.js',
  ]);

  assert.equal(matcher.shouldIgnore('node_modules/package/index.js'), true);
  assert.equal(matcher.shouldIgnore('src/test/file.js'), true);
  assert.equal(matcher.shouldIgnore('src/file.test.js'), true);
  assert.equal(matcher.shouldIgnore('src/file.js'), false);
});

test('PathMatcher - handle dot files', () => {
  const matcher = new PathMatcher([
    '**/.git/**',
    '.env',
  ]);

  assert.equal(matcher.shouldIgnore('.git/config'), true);
  assert.equal(matcher.shouldIgnore('src/.git/objects/file'), true);
  assert.equal(matcher.shouldIgnore('.env'), true);
  assert.equal(matcher.shouldIgnore('.envrc'), false);
});

test('PathMatcher - filter paths', () => {
  const matcher = new PathMatcher([
    '**/test/**',
    '*.test.js',
  ]);

  const paths = [
    'src/index.js',
    'src/test/file.js',
    'src/file.test.js',
    'src/utils.js',
  ];

  const filtered = matcher.filter(paths);
  assert.equal(filtered.length, 2);
  assert.ok(filtered.includes('src/index.js'));
  assert.ok(filtered.includes('src/utils.js'));
});

test('RuleFilter - check rule enabled', () => {
  const filter = new RuleFilter({
    'rule1': 'error',
    'rule2': 'off',
    'rule3': 'warn',
  });

  assert.equal(filter.isEnabled('rule1'), true);
  assert.equal(filter.isEnabled('rule2'), false);
  assert.equal(filter.isEnabled('rule3'), true);
  assert.equal(filter.isEnabled('rule4'), true); // Default enabled
});

test('RuleFilter - get rule severity', () => {
  const filter = new RuleFilter({
    'rule1': 'error',
    'rule2': 'warn',
    'rule3': { severity: 'off', options: {} },
  });

  assert.equal(filter.getSeverity('rule1'), 'error');
  assert.equal(filter.getSeverity('rule2'), 'warn');
  assert.equal(filter.getSeverity('rule3'), 'off');
  assert.equal(filter.getSeverity('rule4'), null);
});

test('RuleFilter - get rule options', () => {
  const filter = new RuleFilter({
    'rule1': 'error',
    'rule2': {
      severity: 'warn',
      options: {
        maxLength: 100,
        allowSpecial: true,
      },
    },
  });

  assert.equal(filter.getOptions('rule1'), undefined);
  const options = filter.getOptions('rule2');
  assert.ok(options);
  assert.equal(options.maxLength, 100);
  assert.equal(options.allowSpecial, true);
});

test('RuleFilter - filter findings by enabled rules', () => {
  const filter = new RuleFilter({
    'rule1': 'error',
    'rule2': 'off',
  });

  const findings = [
    { check_id: 'rule1', message: 'Finding 1' },
    { check_id: 'rule2', message: 'Finding 2' },
    { check_id: 'rule3', message: 'Finding 3' },
  ];

  const filtered = filter.filterFindings(findings);
  assert.equal(filtered.length, 2);
  assert.equal(filtered[0].check_id, 'rule1');
  assert.equal(filtered[1].check_id, 'rule3');
});

test('RuleFilter - apply severity overrides', () => {
  const filter = new RuleFilter({
    'rule1': 'warn',
    'rule2': 'error',
  });

  const findings = [
    { check_id: 'rule1', severity: 'ERROR', message: 'Finding 1' },
    { check_id: 'rule2', severity: 'WARNING', message: 'Finding 2' },
    { check_id: 'rule3', severity: 'INFO', message: 'Finding 3' },
  ];

  const updated = filter.applySeverityOverrides(findings);
  assert.equal(updated[0].severity, 'WARNING'); // Downgraded to warn
  assert.equal(updated[1].severity, 'ERROR');   // Upgraded to error
  assert.equal(updated[2].severity, 'INFO');    // No override
});

test('ConfigLoader - cache results', async () => {
  setupTestDir();

  const configPath = join(testDir, '.mcp-safeguardrc.json');
  writeFileSync(configPath, JSON.stringify({
    rules: { 'test-rule': 'error' },
  }));

  const loader = new ConfigLoader();
  const loaded1 = await loader.load(testDir);
  const loaded2 = await loader.load(testDir);

  // Should return same instance
  assert.equal(loaded1, loaded2);

  cleanupTestDir();
});

test('ConfigLoader - clear cache', async () => {
  setupTestDir();

  const configPath = join(testDir, '.mcp-safeguardrc.json');
  writeFileSync(configPath, JSON.stringify({
    rules: { 'test-rule': 'error' },
  }));

  const loader = new ConfigLoader();
  const loaded1 = await loader.load(testDir);

  loader.clearCache();

  const loaded2 = await loader.load(testDir);

  // Should return different instances after cache clear
  assert.notEqual(loaded1, loaded2);
  assert.deepEqual(loaded1.rules, loaded2.rules);

  cleanupTestDir();
});
