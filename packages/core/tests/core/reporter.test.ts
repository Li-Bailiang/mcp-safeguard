/**
 * Reporter tests — focused on the HTML XSS hardening and basic format validity.
 *
 * The HTML report embeds findings (which contain attacker-influenced strings
 * from the scanned project: messages, paths, code snippets) into the page. A
 * finding text containing `</script>` or markup must never break out of its
 * context. These tests lock in that escaping so it can't silently regress.
 */
import { describe, it, expect } from '../helpers/expect.js';
import { Reporter } from '../../src/reporter.js';
import { Finding, ScanResult } from '../../src/types.js';

function makeResult(findings: Finding[]): ScanResult {
  const bySeverity = { ERROR: 0, WARNING: 0, INFO: 0 } as Record<string, number>;
  const byCategory: Record<string, number> = {};
  for (const f of findings) {
    bySeverity[f.severity] = (bySeverity[f.severity] || 0) + 1;
    byCategory[f.category] = (byCategory[f.category] || 0) + 1;
  }
  return {
    findings,
    summary: { total: findings.length, bySeverity: bySeverity as any, byCategory, riskScore: 10 },
    metadata: {
      version: '0.1.0',
      timestamp: '2026-06-04T00:00:00.000Z',
      targetPath: '/x',
      rulesVersion: '1.0.0',
      duration: 1,
    },
  };
}

// A finding whose attacker-influenced fields carry HTML/JS injection payloads.
const maliciousFinding: Finding = {
  id: 'finding-0',
  check_id: 'evil-rule<b>x</b>',
  path: 'a</script>.ts',
  start: { line: 1, col: 1 },
  end: { line: 1, col: 1 },
  message: '</script><img src=x onerror=alert(1)>',
  severity: 'ERROR',
  category: 'supply-chain',
  metadata: { category: 'supply-chain', confidence: 'high', impact: 'HIGH', likelihood: 'HIGH' },
  extra: {
    lines: 'const x = "<script>alert(2)</script>";',
    message: '</script><img src=x onerror=alert(1)>',
    metadata: { category: 'supply-chain', confidence: 'high', impact: 'HIGH', likelihood: 'HIGH' },
  },
};

describe('Reporter HTML XSS hardening', () => {
  const html = new Reporter().format(makeResult([maliciousFinding]), 'html');

  it('does not emit the injected <img> tag unescaped (message breakout blocked)', () => {
    expect(html).not.toContain('<img src=x onerror=alert(1)>');
    expect(html).not.toContain('</script><img');
  });

  it('escapes injected markup in check_id', () => {
    expect(html).not.toContain('<b>x</b>');
  });

  it('escapes source code rendered in the code-context block', () => {
    // The fix runs escapeHtml() over every code line.
    expect(html).toContain('&lt;script&gt;alert(2)&lt;/script&gt;');
    expect(html).not.toContain('"<script>alert(2)</script>"');
  });

  it('unicode-escapes < > in the embedded JSON data blob', () => {
    // safeJsonEmbed() turns < and > into < / > inside the <script> blob.
    expect(html).toContain('\\u003c');
  });
});

describe('Reporter format validity', () => {
  it('produces parseable JSON', () => {
    const out = new Reporter().format(makeResult([maliciousFinding]), 'json');
    const parsed = JSON.parse(out);
    expect(parsed.findings.length).toBe(1);
    expect(parsed.summary.total).toBe(1);
  });

  it('produces valid SARIF', () => {
    const out = new Reporter().format(makeResult([maliciousFinding]), 'sarif');
    const parsed = JSON.parse(out);
    expect(parsed.version).toBe('2.1.0');
    expect(parsed.runs[0].tool.driver.name).toBe('MCP-Safeguard');
    expect(parsed.runs[0].results.length).toBe(1);
  });

  it('renders a clean-state HTML report for zero findings', () => {
    const html0 = new Reporter().format(makeResult([]), 'html');
    expect(html0).toContain('No Security Findings');
  });
});
