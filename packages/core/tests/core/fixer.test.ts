import { describe, it, expect } from '../helpers/expect.js';
import { applyFix, canAutoFix, getFixableStats } from '../../src/fixer.js';
import { Finding } from '../../src/types.js';

// Helper to create a test finding
function createFinding(checkId: string, line: number, code: string): Finding {
  return {
    id: `test-${checkId}-${line}`,
    check_id: checkId,
    path: 'test.ts',
    start: { line, col: 1 },
    end: { line, col: code.length },
    message: `Test finding for ${checkId}`,
    severity: 'ERROR',
    category: 'security',
    metadata: {
      category: 'security',
      confidence: 'HIGH',
      impact: 'HIGH',
      likelihood: 'MEDIUM'
    },
    extra: {
      lines: code,
      message: `Test finding for ${checkId}`,
      metadata: {
        category: 'security',
        confidence: 'HIGH',
        impact: 'HIGH',
        likelihood: 'MEDIUM'
      }
    }
  };
}

describe('Fixer', () => {
  describe('canAutoFix', () => {
    it('should identify fixable rules', () => {
      expect(canAutoFix('hardcoded-credentials')).toBe(true);
      expect(canAutoFix('hardcoded-secrets')).toBe(true);
      expect(canAutoFix('insecure-random')).toBe(true);
      expect(canAutoFix('sql-injection')).toBe(true);
      expect(canAutoFix('path-traversal')).toBe(true);
      expect(canAutoFix('missing-input-validation')).toBe(true);
    });

    it('should identify non-fixable rules', () => {
      expect(canAutoFix('unknown-rule')).toBe(false);
      expect(canAutoFix('custom-vulnerability')).toBe(false);
    });

    it('should handle rule names with different separators', () => {
      expect(canAutoFix('hardcoded_credentials')).toBe(true);
      expect(canAutoFix('insecure_random')).toBe(true);
      expect(canAutoFix('sql_injection')).toBe(true);
    });
  });

  describe('hardcoded-credentials fix', () => {
    it('should fix const variable with hardcoded string', () => {
      const code = `const apiKey = "EXAMPLE_API_KEY_DO_NOT_USE";`;
      const finding = createFinding('hardcoded-credentials', 1, code);
      const result = applyFix(finding, code);

      expect(result.fixed).toBe(true);
      expect(result.newContent).toContain('process.env.API_KEY');
      expect(result.newContent).not.toContain('EXAMPLE_API_KEY_DO_NOT_USE');
      expect(result.message).toContain('process.env.API_KEY');
    });

    it('should fix let variable with hardcoded string', () => {
      const code = `let password = "secret123";`;
      const finding = createFinding('hardcoded-credentials', 1, code);
      const result = applyFix(finding, code);

      expect(result.fixed).toBe(true);
      expect(result.newContent).toContain('process.env.PASSWORD');
    });

    it('should fix object property with hardcoded string', () => {
      const code = `  apiKey: "EXAMPLE_API_KEY_DO_NOT_USE"`;
      const finding = createFinding('hardcoded-credentials', 1, code);
      const result = applyFix(finding, code);

      expect(result.fixed).toBe(true);
      expect(result.newContent).toContain('process.env.API_KEY');
    });

    it('should handle camelCase to UPPER_CASE conversion', () => {
      const code = `const mySecretApiKey = "secret";`;
      const finding = createFinding('hardcoded-credentials', 1, code);
      const result = applyFix(finding, code);

      expect(result.fixed).toBe(true);
      expect(result.newContent).toContain('process.env.MY_SECRET_API_KEY');
    });
  });

  describe('insecure-random fix', () => {
    it('should replace Math.random() with crypto.randomBytes()', () => {
      const code = `const token = Math.random();`;
      const finding = createFinding('insecure-random', 1, code);
      const result = applyFix(finding, code);

      expect(result.fixed).toBe(true);
      expect(result.newContent).toContain("crypto.randomBytes(16).toString('hex')");
      expect(result.newContent).not.toContain('Math.random()');
    });

    it('should add crypto import if not present', () => {
      const code = `const token = Math.random();`;
      const finding = createFinding('insecure-random', 1, code);
      const result = applyFix(finding, code);

      expect(result.fixed).toBe(true);
      expect(result.newContent).toContain("import crypto from 'crypto'");
    });

    it('should not duplicate crypto import', () => {
      const code = `import crypto from 'crypto';\nconst token = Math.random();`;
      const finding = createFinding('insecure-random', 2, code);
      const result = applyFix(finding, code);

      expect(result.fixed).toBe(true);
      const importCount = (result.newContent?.match(/import crypto from 'crypto'/g) || []).length;
      expect(importCount).toBe(1);
    });
  });

  describe('sql-injection fix', () => {
    it('should fix template literal SQL injection', () => {
      const code = `db.query(\`SELECT * FROM users WHERE id = \${userId}\`)`;
      const finding = createFinding('sql-injection', 1, code);
      const result = applyFix(finding, code);

      expect(result.fixed).toBe(true);
      expect(result.newContent).toContain("'SELECT * FROM users WHERE id = ?'");
      expect(result.newContent).toContain('[userId]');
      expect(result.newContent).not.toContain('${');
    });

    it('should fix string concatenation SQL injection', () => {
      const code = `db.query("SELECT * FROM users WHERE name = '" + userName + "')`;
      const finding = createFinding('sql-injection', 1, code);
      const result = applyFix(finding, code);

      expect(result.fixed).toBe(true);
      expect(result.newContent).toContain('?');
      expect(result.newContent).toContain('[userName]');
    });

    it('should handle multiple variables in template literal', () => {
      const code = `db.query(\`SELECT * FROM users WHERE id = \${userId} AND name = \${userName}\`)`;
      const finding = createFinding('sql-injection', 1, code);
      const result = applyFix(finding, code);

      expect(result.fixed).toBe(true);
      expect(result.newContent).toContain('?');
      expect(result.newContent).toContain('[userId, userName]');
    });
  });

  describe('path-traversal fix', () => {
    it('should add path normalization for fs.readFile', () => {
      const code = `  fs.readFile(userPath, callback);`;
      const finding = createFinding('path-traversal', 1, code);
      const result = applyFix(finding, code);

      expect(result.fixed).toBe(true);
      expect(result.newContent).toContain('path.normalize(userPath)');
      expect(result.newContent).toContain("replace(/^(\\.\\.[/\\\\])+/, '')");
      expect(result.newContent).toContain('fs.readFile(safePath');
    });

    it('should add path import if not present', () => {
      const code = `fs.readFileSync(userPath);`;
      const finding = createFinding('path-traversal', 1, code);
      const result = applyFix(finding, code);

      expect(result.fixed).toBe(true);
      expect(result.newContent).toContain("import path from 'path'");
    });

    it('should work with different fs operations', () => {
      const operations = ['readFile', 'readFileSync', 'writeFile', 'writeFileSync', 'open', 'openSync'];

      for (const op of operations) {
        const code = `fs.${op}(filePath);`;
        const finding = createFinding('path-traversal', 1, code);
        const result = applyFix(finding, code);

        expect(result.fixed).toBe(true);
        expect(result.newContent).toContain('safePath');
      }
    });
  });

  describe('missing-input-validation fix', () => {
    it('should add validation for function parameters', () => {
      const code = `function processUser(userId) {\n  return db.get(userId);\n}`;
      const finding = createFinding('missing-input-validation', 1, code);
      const result = applyFix(finding, code);

      expect(result.fixed).toBe(true);
      expect(result.newContent).toContain("if (!userId || typeof userId !== 'string')");
      expect(result.newContent).toContain("throw new Error('Invalid userId parameter')");
    });

    it('should add validation for variable assignments', () => {
      const code = `const userId = req.params.id;\nprocessUser(userId);`;
      const finding = createFinding('missing-input-validation', 1, code);
      const result = applyFix(finding, code);

      expect(result.fixed).toBe(true);
      expect(result.newContent).toContain("if (!userId || typeof userId !== 'string')");
    });

    it('should handle multiple parameters', () => {
      const code = `function getUser(userId, userName) {\n  return db.query(userId, userName);\n}`;
      const finding = createFinding('missing-input-validation', 1, code);
      const result = applyFix(finding, code);

      expect(result.fixed).toBe(true);
      expect(result.newContent).toContain('userId');
      expect(result.newContent).toContain('userName');
    });
  });

  describe('getFixableStats', () => {
    it('should calculate statistics correctly', () => {
      const findings: Finding[] = [
        createFinding('hardcoded-credentials', 1, 'code1'),
        createFinding('hardcoded-credentials', 2, 'code2'),
        createFinding('insecure-random', 3, 'code3'),
        createFinding('unknown-rule', 4, 'code4'),
        createFinding('another-unknown', 5, 'code5')
      ];

      const stats = getFixableStats(findings);

      expect(stats.total).toBe(5);
      expect(stats.fixable).toBe(3);
      expect(stats.notFixable).toBe(2);
      expect(stats.byRule['hardcoded-credentials'].total).toBe(2);
      expect(stats.byRule['hardcoded-credentials'].fixable).toBe(2);
      expect(stats.byRule['insecure-random'].total).toBe(1);
      expect(stats.byRule['insecure-random'].fixable).toBe(1);
      expect(stats.byRule['unknown-rule'].total).toBe(1);
      expect(stats.byRule['unknown-rule'].fixable).toBe(0);
    });

    it('should handle empty findings array', () => {
      const stats = getFixableStats([]);

      expect(stats.total).toBe(0);
      expect(stats.fixable).toBe(0);
      expect(stats.notFixable).toBe(0);
      expect(Object.keys(stats.byRule).length).toBe(0);
    });

    it('should handle all fixable findings', () => {
      const findings: Finding[] = [
        createFinding('hardcoded-credentials', 1, 'code1'),
        createFinding('sql-injection', 2, 'code2'),
        createFinding('path-traversal', 3, 'code3')
      ];

      const stats = getFixableStats(findings);

      expect(stats.total).toBe(3);
      expect(stats.fixable).toBe(3);
      expect(stats.notFixable).toBe(0);
    });

    it('should handle all non-fixable findings', () => {
      const findings: Finding[] = [
        createFinding('unknown-rule-1', 1, 'code1'),
        createFinding('unknown-rule-2', 2, 'code2')
      ];

      const stats = getFixableStats(findings);

      expect(stats.total).toBe(2);
      expect(stats.fixable).toBe(0);
      expect(stats.notFixable).toBe(2);
    });
  });

  describe('edge cases', () => {
    it('should handle findings with invalid line numbers', () => {
      const code = `const x = 1;`;
      const finding = createFinding('hardcoded-credentials', 999, code);
      const result = applyFix(finding, code);

      expect(result.fixed).toBe(false);
      expect(result.message).toContain('out of range');
    });

    it('should handle empty file content', () => {
      const finding = createFinding('hardcoded-credentials', 1, '');
      const result = applyFix(finding, '');

      expect(result.fixed).toBe(false);
    });

    it('should handle multi-line code', () => {
      const code = `const config = {\n  apiKey: "secret123",\n  url: "https://api.example.com"\n};`;
      const finding = createFinding('hardcoded-credentials', 2, '  apiKey: "secret123",');
      const result = applyFix(finding, code);

      expect(result.fixed).toBe(true);
      expect(result.newContent).toContain('process.env.API_KEY');
    });

    it('should not break when pattern does not match', () => {
      const code = `const x = someComplexExpression();`;
      const finding = createFinding('hardcoded-credentials', 1, code);
      const result = applyFix(finding, code);

      expect(result.fixed).toBe(false);
      expect(result.message).toContain('Could not identify');
    });
  });
});
