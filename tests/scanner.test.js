import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { Scanner } from '../packages/core/src/scanner.js';
import { resolve } from 'path';

test('Scanner detects vulnerabilities in vulnerable-extended fixture', async () => {
  const scanner = new Scanner();
  const fixturePath = resolve(process.cwd(), 'tests/fixtures/vulnerable-extended');

  const result = await scanner.scan(fixturePath);

  assert.ok(result.findings.length > 0, 'Should detect vulnerabilities');
  assert.ok(result.summary.bySeverity.ERROR > 0, 'Should have ERROR severity findings');
});

test('Scanner finds no issues in safe-extended fixture', async () => {
  const scanner = new Scanner();
  const fixturePath = resolve(process.cwd(), 'tests/fixtures/safe-extended');

  const result = await scanner.scan(fixturePath);

  assert.ok(result.findings.length === 0, 'Should have no findings for safe code');
});

test('Risk scorer calculates correct risk level', async () => {
  const { RiskScorer } = await import('../packages/core/src/scorer.js');
  const scorer = new RiskScorer();

  const mockFindings = [
    { severity: 'ERROR', metadata: { impact: 'HIGH', likelihood: 'HIGH' } },
    { severity: 'WARNING', metadata: { impact: 'MEDIUM', likelihood: 'MEDIUM' } }
  ];

  const score = scorer.calculateScore(mockFindings);
  assert.ok(score > 0, 'Risk score should be greater than 0');
  assert.ok(score <= 100, 'Risk score should be at most 100');
});
