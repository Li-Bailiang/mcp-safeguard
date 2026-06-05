import { describe, it, expect } from '../helpers/expect.js';
import { RiskScorer } from '../../src/scorer.js';
import { Finding } from '../../src/types.js';

function f(severity: string, impact: string, likelihood: string): Finding {
  return {
    id: 'x',
    check_id: 'r',
    path: 'p',
    start: { line: 1, col: 1 },
    end: { line: 1, col: 1 },
    message: 'm',
    severity: severity as any,
    category: 'c',
    metadata: { category: 'c', confidence: 'high', impact, likelihood },
    extra: { lines: '', message: 'm', metadata: { category: 'c', confidence: 'high', impact, likelihood } },
  };
}

describe('RiskScorer.calculateScore', () => {
  const scorer = new RiskScorer();

  it('is 0 for no findings', () => {
    expect(scorer.calculateScore([])).toBe(0);
  });

  it('is 100 for a single max-weight finding (ERROR/HIGH/HIGH)', () => {
    // 10 * 3 * 3 = 90; max = 1*10*3*3 = 90; round(90/90*100) = 100
    expect(scorer.calculateScore([f('ERROR', 'HIGH', 'HIGH')])).toBe(100);
  });

  it('is low for a single min-weight finding (INFO/LOW/LOW)', () => {
    // 1*1*1 = 1; max = 90; round(1/90*100) = 1
    expect(scorer.calculateScore([f('INFO', 'LOW', 'LOW')])).toBe(1);
  });

  it('defaults unknown impact/likelihood to weight 1', () => {
    // ERROR(10) * unknown(1) * unknown(1) = 10; max 90; round(10/90*100) = 11
    expect(scorer.calculateScore([f('ERROR', 'NOPE', 'ALSO-NOPE')])).toBe(11);
  });

  it('caps at 100 and never exceeds it', () => {
    const many = [f('ERROR', 'HIGH', 'HIGH'), f('ERROR', 'HIGH', 'HIGH'), f('INFO', 'LOW', 'LOW')];
    const score = scorer.calculateScore(many);
    expect(score).toBeLessThan(101);
    expect(score).toBeGreaterThanOrEqual(0);
  });
});

describe('RiskScorer.getRiskLevel', () => {
  const scorer = new RiskScorer();

  it('maps scores to levels at the documented boundaries', () => {
    expect(scorer.getRiskLevel(0)).toBe('LOW');
    expect(scorer.getRiskLevel(24)).toBe('LOW');
    expect(scorer.getRiskLevel(25)).toBe('MEDIUM');
    expect(scorer.getRiskLevel(49)).toBe('MEDIUM');
    expect(scorer.getRiskLevel(50)).toBe('HIGH');
    expect(scorer.getRiskLevel(74)).toBe('HIGH');
    expect(scorer.getRiskLevel(75)).toBe('CRITICAL');
    expect(scorer.getRiskLevel(100)).toBe('CRITICAL');
  });
});
