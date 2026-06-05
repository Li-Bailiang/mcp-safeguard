import { Finding } from './types.js';
import * as path from 'path';

export interface FixResult {
  fixed: boolean;
  newContent?: string;
  message: string;
}

export interface FixStrategy {
  rulePattern: RegExp;
  canFix: (finding: Finding) => boolean;
  apply: (finding: Finding, fileContent: string) => FixResult;
}

/**
 * Fixes hardcoded credentials by replacing them with environment variables
 */
function fixHardcodedCredentials(finding: Finding, fileContent: string): FixResult {
  const lines = fileContent.split('\n');
  const lineIndex = finding.start.line - 1;

  if (lineIndex < 0 || lineIndex >= lines.length) {
    return { fixed: false, message: 'Line number out of range' };
  }

  const line = lines[lineIndex];

  // Match patterns like: const apiKey = "EXAMPLE_API_KEY_DO_NOT_USE" or apiKey: "EXAMPLE_API_KEY_DO_NOT_USE"
  const patterns = [
    { regex: /(\s*(?:const|let|var)\s+)(\w+)(\s*=\s*)["']([^"']+)["']/, envVarIndex: 2 },
    { regex: /(\s*)(\w+)(\s*:\s*)["']([^"']+)["']/, envVarIndex: 2 },
    { regex: /(\s*["']?)(\w+)(\s*["']?\s*:\s*)["']([^"']+)["']/, envVarIndex: 2 }
  ];

  for (const pattern of patterns) {
    const match = line.match(pattern.regex);
    if (match) {
      const varName = match[pattern.envVarIndex];
      const envVarName = varName.replace(/([A-Z])/g, '_$1').toUpperCase().replace(/^_/, '');

      // Replace the hardcoded value with process.env access
      const fixedLine = line.replace(
        pattern.regex,
        `$1$2$3process.env.${envVarName}`
      );

      lines[lineIndex] = fixedLine;

      return {
        fixed: true,
        newContent: lines.join('\n'),
        message: `Replaced hardcoded credential with process.env.${envVarName}`
      };
    }
  }

  return { fixed: false, message: 'Could not identify credential pattern to fix' };
}

/**
 * Fixes insecure random number generation
 */
function fixInsecureRandom(finding: Finding, fileContent: string): FixResult {
  const lines = fileContent.split('\n');
  const lineIndex = finding.start.line - 1;

  if (lineIndex < 0 || lineIndex >= lines.length) {
    return { fixed: false, message: 'Line number out of range' };
  }

  const line = lines[lineIndex];

  // Replace Math.random() with crypto.randomBytes()
  if (line.includes('Math.random()')) {
    const fixedLine = line.replace(
      /Math\.random\(\)/g,
      "crypto.randomBytes(16).toString('hex')"
    );
    lines[lineIndex] = fixedLine;

    // Check if crypto is already imported
    const hasCryptoImport = fileContent.includes('import') &&
                           (fileContent.includes("from 'crypto'") ||
                            fileContent.includes('from "crypto"') ||
                            fileContent.includes("require('crypto')") ||
                            fileContent.includes('require("crypto")'));

    if (!hasCryptoImport) {
      // Add crypto import at the top
      const importLine = "import crypto from 'crypto';\n";
      lines.unshift(importLine);
    }

    return {
      fixed: true,
      newContent: lines.join('\n'),
      message: 'Replaced Math.random() with crypto.randomBytes()'
    };
  }

  return { fixed: false, message: 'Could not identify Math.random() call' };
}

/**
 * Fixes SQL injection vulnerabilities
 */
function fixSqlInjection(finding: Finding, fileContent: string): FixResult {
  const lines = fileContent.split('\n');
  const lineIndex = finding.start.line - 1;

  if (lineIndex < 0 || lineIndex >= lines.length) {
    return { fixed: false, message: 'Line number out of range' };
  }

  let line = lines[lineIndex];

  // Handle multi-line SQL queries
  let fullQuery = line;
  let endLineIndex = lineIndex;

  // If the query spans multiple lines, collect them
  if (!line.includes(')') && lineIndex + 1 < lines.length) {
    for (let i = lineIndex + 1; i < lines.length && i < lineIndex + 10; i++) {
      fullQuery += '\n' + lines[i];
      endLineIndex = i;
      if (lines[i].includes(')')) break;
    }
  }

  // Match patterns like: db.query(`SELECT ... ${variable}`) or db.query("SELECT ... " + variable)
  const templateLiteralMatch = fullQuery.match(/\.query\s*\(\s*`([^`]*\$\{[^}]+\}[^`]*)`\s*\)/);
  // The string literal may itself contain the *other* quote character (e.g.
  // "... name = '" + userName), so match a balanced quoted string with a
  // backreference and capture the first concatenated identifier/expression.
  const concatenationMatch = fullQuery.match(
    /\.query\s*\(\s*(["'])((?:(?!\1).)*)\1\s*\+\s*([A-Za-z_$][\w$.]*)/
  );

  if (templateLiteralMatch) {
    // Convert template literal to parameterized query
    const sqlTemplate = templateLiteralMatch[1];
    const variables: string[] = [];

    // Extract variables from template
    const varRegex = /\$\{([^}]+)\}/g;
    let match;
    let parameterizedSql = sqlTemplate;

    while ((match = varRegex.exec(sqlTemplate)) !== null) {
      variables.push(match[1].trim());
      parameterizedSql = parameterizedSql.replace(match[0], '?');
    }

    const fixedQuery = `.query('${parameterizedSql}', [${variables.join(', ')}])`;
    const fixedFullQuery = fullQuery.replace(
      /\.query\s*\(\s*`[^`]*`\s*\)/,
      fixedQuery
    );

    // Replace the affected lines
    const newLines = fixedFullQuery.split('\n');
    for (let i = 0; i < newLines.length && lineIndex + i <= endLineIndex; i++) {
      lines[lineIndex + i] = newLines[i];
    }

    // Remove any extra lines if the query was shortened
    if (endLineIndex > lineIndex && newLines.length === 1) {
      lines.splice(lineIndex + 1, endLineIndex - lineIndex);
    }

    return {
      fixed: true,
      newContent: lines.join('\n'),
      message: 'Converted to parameterized query with placeholders'
    };
  }

  if (concatenationMatch) {
    // Groups: 1 = quote char, 2 = SQL string body, 3 = first concatenated variable.
    const sqlPart = concatenationMatch[2];
    const variablePart = concatenationMatch[3].trim();

    const fixedQuery = `.query('${sqlPart} ?', [${variablePart}])`;
    const fixedLine = fullQuery.replace(
      /\.query\s*\([^)]+\)/,
      fixedQuery
    );

    lines[lineIndex] = fixedLine;

    return {
      fixed: true,
      newContent: lines.join('\n'),
      message: 'Converted to parameterized query with placeholders'
    };
  }

  return { fixed: false, message: 'Could not identify SQL injection pattern to fix' };
}

/**
 * Fixes path traversal vulnerabilities
 */
function fixPathTraversal(finding: Finding, fileContent: string): FixResult {
  const lines = fileContent.split('\n');
  const lineIndex = finding.start.line - 1;

  if (lineIndex < 0 || lineIndex >= lines.length) {
    return { fixed: false, message: 'Line number out of range' };
  }

  const line = lines[lineIndex];

  // Match patterns like: fs.readFile(userPath) or fs.readFileSync(userPath)
  const fsOperationMatch = line.match(/fs\.(readFile|readFileSync|writeFile|writeFileSync|open|openSync)\s*\(\s*([^,)]+)/);

  if (fsOperationMatch) {
    const operation = fsOperationMatch[1];
    const pathVariable = fsOperationMatch[2].trim();

    // Insert sanitization before the fs operation
    const sanitizationCode = `const safePath = path.normalize(${pathVariable}).replace(/^(\\.\\.[/\\\\])+/, '');\n  `;
    const fixedLine = line.replace(
      new RegExp(`fs\\.${operation}\\s*\\(\\s*${pathVariable.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`),
      `fs.${operation}(safePath`
    );

    lines.splice(lineIndex, 0, sanitizationCode.trimEnd());
    lines[lineIndex + 1] = fixedLine;

    // Check if path is already imported
    const hasPathImport = fileContent.includes('import') &&
                         (fileContent.includes("from 'path'") ||
                          fileContent.includes('from "path"') ||
                          fileContent.includes("require('path')") ||
                          fileContent.includes('require("path")'));

    if (!hasPathImport) {
      // Add path import at the top
      const importLine = "import path from 'path';\n";
      lines.unshift(importLine);
    }

    return {
      fixed: true,
      newContent: lines.join('\n'),
      message: 'Added path normalization to prevent traversal attacks'
    };
  }

  return { fixed: false, message: 'Could not identify file operation to fix' };
}

/**
 * Adds input validation for missing validation issues
 */
function fixMissingInputValidation(finding: Finding, fileContent: string): FixResult {
  const lines = fileContent.split('\n');
  const lineIndex = finding.start.line - 1;

  if (lineIndex < 0 || lineIndex >= lines.length) {
    return { fixed: false, message: 'Line number out of range' };
  }

  const line = lines[lineIndex];

  // Look for function parameters or variable assignments
  const functionMatch = line.match(/(?:function|const|let|var)\s+\w+\s*\(([^)]+)\)/);
  const assignmentMatch = line.match(/(?:const|let|var)\s+(\w+)\s*=\s*([^;]+)/);

  if (functionMatch) {
    // Add validation at the start of the function
    const params = functionMatch[1].split(',').map(p => p.trim().split(':')[0].trim());
    const validationLines = params.map(param =>
      `  if (!${param} || typeof ${param} !== 'string') {\n    throw new Error('Invalid ${param} parameter');\n  }`
    );

    // Find the opening brace
    let braceIndex = lineIndex;
    for (let i = lineIndex; i < lines.length && i < lineIndex + 5; i++) {
      if (lines[i].includes('{')) {
        braceIndex = i;
        break;
      }
    }

    // Insert validation after the opening brace
    lines.splice(braceIndex + 1, 0, validationLines.join('\n'));

    return {
      fixed: true,
      newContent: lines.join('\n'),
      message: 'Added input validation for function parameters'
    };
  }

  if (assignmentMatch) {
    const varName = assignmentMatch[1];
    const validationLine = `  if (!${varName} || typeof ${varName} !== 'string') {\n    throw new Error('Invalid ${varName} value');\n  }`;

    lines.splice(lineIndex + 1, 0, validationLine);

    return {
      fixed: true,
      newContent: lines.join('\n'),
      message: `Added input validation for ${varName}`
    };
  }

  return { fixed: false, message: 'Could not identify where to add validation' };
}

/**
 * Registry of fix strategies
 */
const fixStrategies: FixStrategy[] = [
  {
    rulePattern: /hardcoded[-_]?credentials?|hardcoded[-_]?secrets?/i,
    canFix: (finding) => finding.check_id.match(/hardcoded[-_]?credentials?|hardcoded[-_]?secrets?/i) !== null,
    apply: fixHardcodedCredentials
  },
  {
    rulePattern: /insecure[-_]?random/i,
    canFix: (finding) => finding.check_id.match(/insecure[-_]?random/i) !== null,
    apply: fixInsecureRandom
  },
  {
    rulePattern: /sql[-_]?injection/i,
    canFix: (finding) => finding.check_id.match(/sql[-_]?injection/i) !== null,
    apply: fixSqlInjection
  },
  {
    rulePattern: /path[-_]?traversal/i,
    canFix: (finding) => finding.check_id.match(/path[-_]?traversal/i) !== null,
    apply: fixPathTraversal
  },
  {
    rulePattern: /missing[-_]?input[-_]?validation/i,
    canFix: (finding) => finding.check_id.match(/missing[-_]?input[-_]?validation/i) !== null,
    apply: fixMissingInputValidation
  }
];

/**
 * Check if a rule can be automatically fixed
 */
export function canAutoFix(ruleId: string): boolean {
  return fixStrategies.some(strategy => strategy.rulePattern.test(ruleId));
}

/**
 * Apply automatic fix for a finding
 */
export function applyFix(finding: Finding, fileContent: string): FixResult {
  const strategy = fixStrategies.find(s => s.canFix(finding));

  if (!strategy) {
    return {
      fixed: false,
      message: `No auto-fix available for rule: ${finding.check_id}`
    };
  }

  try {
    return strategy.apply(finding, fileContent);
  } catch (error) {
    return {
      fixed: false,
      message: `Error applying fix: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Get statistics about fixable findings
 */
export function getFixableStats(findings: Finding[]): {
  total: number;
  fixable: number;
  notFixable: number;
  byRule: Record<string, { total: number; fixable: number }>;
} {
  const stats = {
    total: findings.length,
    fixable: 0,
    notFixable: 0,
    byRule: {} as Record<string, { total: number; fixable: number }>
  };

  for (const finding of findings) {
    const isFixable = canAutoFix(finding.check_id);

    if (isFixable) {
      stats.fixable++;
    } else {
      stats.notFixable++;
    }

    if (!stats.byRule[finding.check_id]) {
      stats.byRule[finding.check_id] = { total: 0, fixable: 0 };
    }

    stats.byRule[finding.check_id].total++;
    if (isFixable) {
      stats.byRule[finding.check_id].fixable++;
    }
  }

  return stats;
}
