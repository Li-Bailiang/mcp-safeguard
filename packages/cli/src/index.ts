#!/usr/bin/env node

import { Command, Option } from 'commander';
import { Scanner, Reporter, OutputFormat, applyFix, canAutoFix, getFixableStats, Finding, ConfigLoader, ConfigValidator, RuleFilter, PathMatcher, RiskScorer } from '@mcp-safeguard/core';
import { SemgrepInstaller } from '@mcp-safeguard/semgrep-installer';
import { resolve } from 'path';
import chalk from 'chalk';
import Table from 'cli-table3';
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

const program = new Command();

// First-run detection
const CONFIG_DIR = join(homedir(), '.mcp-safeguard');
const FIRST_RUN_MARKER = join(CONFIG_DIR, 'first-run');

function isFirstRun(): boolean {
  return !existsSync(FIRST_RUN_MARKER);
}

function markFirstRunComplete(): void {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true });
  }
  writeFileSync(FIRST_RUN_MARKER, new Date().toISOString());
}

function showWelcomeMessage(): void {
  console.log(chalk.bold.cyan('\n=== Welcome to MCP-Safeguard! ===\n'));
  console.log(chalk.white('MCP-Safeguard scans Model Context Protocol servers for security vulnerabilities.\n'));
  console.log(chalk.bold('Quick Start:'));
  console.log(chalk.gray('  1. Run a scan:') + chalk.white(' mcp-safeguard scan <path>'));
  console.log(chalk.gray('  2. Filter by severity:') + chalk.white(' mcp-safeguard scan <path> --severity error'));
  console.log(chalk.gray('  3. Export results:') + chalk.white(' mcp-safeguard scan <path> -f json -o report.json'));
  console.log(chalk.bold('\nRequirements:'));
  console.log(chalk.gray('  - Semgrep') + chalk.white(' (downloaded/installed automatically on first run if missing)\n'));
}

/**
 * A minimal status indicator that writes ONLY to stderr, so stdout stays clean
 * for piped JSON/SARIF output. Animates a spinner on a TTY; on a non-TTY it
 * prints the message once with no animation.
 */
function createStatus(message: string): { stop: () => void } {
  const frames = ['-', '\\', '|', '/'];
  const startedAt = Date.now();

  const render = (frame: string): string => {
    const elapsedSeconds = Math.floor((Date.now() - startedAt) / 1000);
    return `${chalk.cyan(frame)} ${message} ${elapsedSeconds}s`;
  };

  if (!process.stderr.isTTY) {
    process.stderr.write(`${message} 0s\n`);
    return { stop: () => {} };
  }

  let i = 0;
  let lastLineLength = 0;

  const writeLine = () => {
    const line = render(frames[i]);
    lastLineLength = line.length;
    process.stderr.write(`\r${line}`);
  };

  writeLine();
  const timer = setInterval(() => {
    i = (i + 1) % frames.length;
    writeLine();
  }, 80);

  return {
    stop: () => {
      clearInterval(timer);
      // Erase the spinner line so it doesn't linger above the results.
      process.stderr.write('\r' + ' '.repeat(lastLineLength) + '\r');
    },
  };
}

/**
 * Recompute the summary (counts + risk score) from the current findings array.
 * Must be called after any filtering (config rule/path filters, --severity) so
 * the summary, the printed totals, and the exit code all reflect what the user
 * actually sees — not the pre-filter scan result.
 */
function recomputeSummary(result: any): void {
  const findings: any[] = result.findings;
  const bySeverity: Record<string, number> = { ERROR: 0, WARNING: 0, INFO: 0 };
  const byCategory: Record<string, number> = {};
  for (const f of findings) {
    bySeverity[f.severity] = (bySeverity[f.severity] || 0) + 1;
    byCategory[f.category] = (byCategory[f.category] || 0) + 1;
  }
  result.summary.total = findings.length;
  result.summary.bySeverity = bySeverity;
  result.summary.byCategory = byCategory;
  result.summary.riskScore = new RiskScorer().calculateScore(findings);
}

function getSeverityColor(severity: string): chalk.Chalk {
  switch (severity.toUpperCase()) {
    case 'ERROR':
      return chalk.red;
    case 'WARNING':
      return chalk.yellow;
    case 'INFO':
      return chalk.blue;
    default:
      return chalk.gray;
  }
}

function getSeveritySymbol(severity: string): string {
  switch (severity.toUpperCase()) {
    case 'ERROR':
      return '[!]';
    case 'WARNING':
      return '[*]';
    case 'INFO':
      return '[i]';
    default:
      return '[-]';
  }
}

function formatFindingsTable(findings: any[]): void {
  if (findings.length === 0) {
    return;
  }

  const table = new Table({
    head: [
      chalk.bold('Severity'),
      chalk.bold('Category'),
      chalk.bold('File'),
      chalk.bold('Line'),
      chalk.bold('Message')
    ],
    colWidths: [12, 20, 30, 8, 50],
    wordWrap: true,
    style: {
      head: [],
      border: ['gray']
    }
  });

  for (const finding of findings) {
    const severityColor = getSeverityColor(finding.severity);
    const symbol = getSeveritySymbol(finding.severity);

    table.push([
      severityColor(`${symbol} ${finding.severity}`),
      finding.category,
      finding.path,
      finding.start.line.toString(),
      finding.message
    ]);
  }

  console.log('\n' + table.toString());
}

function formatSummary(result: any): void {
  console.log(chalk.bold('\n=== Scan Summary ===\n'));

  const summaryTable = new Table({
    style: { border: ['gray'] }
  });

  summaryTable.push(
    [chalk.bold('Total Findings'), result.summary.total.toString()],
    [chalk.red.bold('High Severity (ERROR)'), result.summary.bySeverity.ERROR.toString()],
    [chalk.yellow.bold('Medium Severity (WARNING)'), result.summary.bySeverity.WARNING.toString()],
    [chalk.blue.bold('Low Severity (INFO)'), result.summary.bySeverity.INFO.toString()],
    [chalk.bold('Risk Score'), result.summary.riskScore.toFixed(2)]
  );

  console.log(summaryTable.toString());

  if (result.summary.total > 0) {
    console.log(chalk.bold('\nTop Categories:'));
    const categories = Object.entries(result.summary.byCategory as Record<string, number>)
      .sort(([, a], [, b]) => (b as number) - (a as number))
      .slice(0, 5);

    for (const [category, count] of categories) {
      console.log(chalk.gray(`  - ${category}: `) + chalk.white(count));
    }
  }

  console.log(chalk.gray(`\nScan completed in ${result.metadata.duration}ms`));
}

function formatError(error: any): string {
  if (error.message.includes('Semgrep is not installed')) {
    return chalk.red.bold('Error: Semgrep not found\n\n') +
      chalk.white('Semgrep is required to run security scans.\n') +
      chalk.bold('To install Semgrep:\n') +
      chalk.gray('  pip install semgrep\n\n') +
      chalk.white('Or visit: https://semgrep.dev/docs/getting-started/');
  }

  if (error.code === 'ENOENT') {
    return chalk.red.bold('Error: Path not found\n\n') +
      chalk.white(`The specified path does not exist: ${error.path}\n`) +
      chalk.bold('Please check:\n') +
      chalk.gray('  - The path is correct\n') +
      chalk.gray('  - You have permission to access it');
  }

  if (error.code === 'EACCES') {
    return chalk.red.bold('Error: Permission denied\n\n') +
      chalk.white(`Cannot access: ${error.path}\n`) +
      chalk.bold('Try:\n') +
      chalk.gray('  - Running with appropriate permissions\n') +
      chalk.gray('  - Checking file/directory ownership');
  }

  return chalk.red.bold('Error: ') + chalk.white(error.message);
}

program
  .name('mcp-safeguard')
  .description('Security scanner for Model Context Protocol servers')
  .version('0.1.1');

program
  .command('scan')
  .description('Scan an MCP server for security issues')
  .argument('<path>', 'Path to the MCP server directory')
  .addOption(new Option('-f, --format <format>', 'Output format').choices(['text', 'json', 'sarif', 'html']).default('text'))
  .option('-o, --output <file>', 'Output file (default: stdout)')
  .addOption(new Option('--severity <level>', 'Minimum severity to report (error = high, warning = medium, info = low)').choices(['info', 'warning', 'error']).default('info'))
  .option('--config <path>', 'Path to configuration file')
  .option('--no-config', 'Disable configuration file lookup')
  .option('--fix', 'Automatically apply fixes for auto-fixable findings')
  .option('--dry-run', 'Preview auto-fixes without modifying files (implies --fix)')
  .option('--cross-file', 'Enable cross-file taint analysis (experimental)')
  .option('-v, --verbose', 'Show detailed output including loaded configuration')
  .action(async (targetPath: string, options) => {
    try {
      // Show welcome message on first run
      if (isFirstRun()) {
        showWelcomeMessage();
        markFirstRunComplete();
        console.log(''); // Extra newline
      }

      const absolutePath = resolve(targetPath);

      // Load configuration
      let config;
      if (options.config !== false) {
        const configLoader = new ConfigLoader();
        const configValidator = new ConfigValidator();

        try {
          config = await configLoader.load(absolutePath, {
            configPath: options.config,
          });

          // Validate configuration
          const validation = configValidator.validate(config);
          if (!validation.valid) {
            console.error(chalk.yellow('⚠ Configuration validation warnings:'));
            validation.errors.forEach(error => {
              console.error(chalk.gray('  - ' + error));
            });
            console.error('');
          }

          // Show loaded config in verbose mode
          if (options.verbose) {
            console.error(chalk.bold('Configuration loaded:'));
            console.error(chalk.gray('  Rules: ') + Object.keys(config.rules).length + ' configured');
            console.error(chalk.gray('  Ignore patterns: ') + config.ignore.length);
            console.error(chalk.gray('  Fail on: ') + config.severity.failOn);
            console.error(chalk.gray('  Languages: ') + config.languages.join(', '));
            console.error('');
          }
        } catch (error: any) {
          if (options.verbose) {
            console.error(chalk.yellow('⚠ No configuration file found, using defaults'));
            console.error('');
          }
          config = await configLoader.load(absolutePath);
        }
      }

      console.error(chalk.bold(`\nScanning: ${chalk.cyan(absolutePath)}\n`));

      const scanner = new Scanner();

      // Check if Semgrep is installed; offer auto-installation if missing.
      // All install messaging goes to stderr so stdout stays clean for JSON/SARIF.
      const installer = new SemgrepInstaller();
      const isAvailable = await installer.isSemgrepAvailable();

      if (!isAvailable) {
        console.error(chalk.yellow.bold('⚠️  Semgrep is not installed or not found in PATH.'));
        console.error(chalk.cyan('Attempting automatic installation...\n'));

        const installStatus = createStatus('Installing Semgrep...');
        let installResult;
        try {
          installResult = await installer.install({
            silent: true,
            fallbackToPip: true
          });
        } finally {
          installStatus.stop();
        }

        if (!installResult.success) {
          console.error(chalk.red.bold('\n✗ Installation failed\n'));
          console.error(chalk.white('Error: ' + installResult.error));
          console.error(chalk.white('\nPlease install Semgrep manually:'));
          console.error(chalk.gray('  pip install semgrep\n'));
          process.exit(2);
        }

        console.error(chalk.green.bold(`✓ Semgrep installed via ${installResult.method}`));
        if (installResult.version) {
          console.error(chalk.gray(`  Version: ${installResult.version}`));
        }
        console.error('');
      }

      // Single stderr status indicator (keeps stdout clean for piped output).
      const status = createStatus('Running Semgrep analysis...');
      let result;
      try {
        result = await scanner.scan(absolutePath, { crossFile: Boolean(options.crossFile) });
      } finally {
        status.stop();
      }

      // Apply configuration filters if config is loaded
      if (config) {
        const ruleFilter = new RuleFilter(config.rules);
        const pathMatcher = new PathMatcher(config.ignore);

        // Filter findings by enabled rules
        result.findings = ruleFilter.filterFindings(result.findings);

        // Apply severity overrides from config
        result.findings = ruleFilter.applySeverityOverrides(result.findings);

        // Filter findings by ignored paths
        result.findings = result.findings.filter(finding => {
          return !pathMatcher.shouldIgnore(finding.path);
        });

        if (options.verbose) {
          console.error(chalk.gray('Applied configuration filters'));
          console.error('');
        }
      }

      // Filter by severity if specified
      if (options.severity !== 'info') {
        const severityOrder: Record<string, number> = { info: 0, warning: 1, error: 2 };
        const minLevel = severityOrder[options.severity.toLowerCase()] || 0;
        result.findings = result.findings.filter(f => {
          const level = severityOrder[f.severity.toLowerCase()] || 0;
          return level >= minLevel;
        });
      }

      // The summary must reflect the findings the user actually sees, after all
      // filtering (config rule/path filters and --severity). Recompute once here.
      recomputeSummary(result);

      // Apply fixes if requested
      if (options.fix || options.dryRun) {
        const fixableStats = getFixableStats(result.findings);

        if (fixableStats.fixable === 0) {
          console.log(chalk.yellow('\n⚠️  No auto-fixable issues found\n'));
        } else {
          console.log(chalk.bold(`\n=== ${options.dryRun ? 'Fix Preview (Dry Run)' : 'Applying Fixes'} ===\n`));

          const fixResults: Array<{
            finding: Finding;
            success: boolean;
            message: string;
          }> = [];

          // Group findings by file
          const findingsByFile = new Map<string, Finding[]>();
          for (const finding of result.findings) {
            if (canAutoFix(finding.check_id)) {
              const findings = findingsByFile.get(finding.path) || [];
              findings.push(finding);
              findingsByFile.set(finding.path, findings);
            }
          }

          // Apply fixes file by file
          for (const [filePath, findings] of findingsByFile.entries()) {
            const absoluteFilePath = resolve(absolutePath, filePath);

            if (!existsSync(absoluteFilePath)) {
              console.log(chalk.red(`✗ File not found: ${filePath}`));
              continue;
            }

            let fileContent = readFileSync(absoluteFilePath, 'utf-8');
            let modified = false;

            // Sort findings by line number (descending) to avoid offset issues
            findings.sort((a, b) => b.start.line - a.start.line);

            for (const finding of findings) {
              const fixResult = applyFix(finding, fileContent);

              if (fixResult.fixed && fixResult.newContent) {
                fileContent = fixResult.newContent;
                modified = true;

                fixResults.push({
                  finding,
                  success: true,
                  message: fixResult.message
                });

                const icon = options.dryRun ? chalk.blue('[DRY]') : chalk.green('✓');
                console.log(`${icon} ${filePath}:${finding.start.line} - ${fixResult.message}`);
              } else {
                fixResults.push({
                  finding,
                  success: false,
                  message: fixResult.message
                });

                console.log(chalk.yellow(`⚠️  ${filePath}:${finding.start.line} - ${fixResult.message}`));
              }
            }

            // Write the file if not in dry-run mode
            if (modified && !options.dryRun) {
              writeFileSync(absoluteFilePath, fileContent, 'utf-8');
            }
          }

          // Display fix summary
          const successCount = fixResults.filter(r => r.success).length;
          const failCount = fixResults.filter(r => !r.success).length;

          console.log(chalk.bold('\n=== Fix Summary ===\n'));

          const fixSummaryTable = new Table({
            style: { border: ['gray'] }
          });

          fixSummaryTable.push(
            [chalk.bold('Total Fixable Issues'), fixableStats.fixable.toString()],
            [chalk.green.bold('Successfully Fixed'), successCount.toString()],
            [chalk.yellow.bold('Failed to Fix'), failCount.toString()],
            [chalk.gray.bold('Not Auto-Fixable'), fixableStats.notFixable.toString()]
          );

          console.log(fixSummaryTable.toString());

          if (options.dryRun) {
            console.log(chalk.blue('\n💡 This was a dry run. No files were modified.'));
            console.log(chalk.gray('    Run with --fix to apply these changes.\n'));
          } else if (successCount > 0) {
            console.log(chalk.green(`\n✓ Fixed ${successCount} issue${successCount !== 1 ? 's' : ''} across ${findingsByFile.size} file${findingsByFile.size !== 1 ? 's' : ''}\n`));
          }
        }
      }

      // Handle different output formats
      const reporter = new Reporter();
      if (options.format === 'text') {
        if (options.output) {
          // -o specified: write to file only (consistent with json/sarif behavior)
          const output = reporter.format(result, 'text' as OutputFormat);
          const { writeFile } = await import('fs/promises');
          await writeFile(options.output, output);
          console.error(chalk.green(`\n✓ Report written to ${options.output}\n`));
        } else {
          // No -o: pretty-print to stdout
          formatFindingsTable(result.findings);
          formatSummary(result);

          if (result.summary.total === 0) {
            console.log(chalk.green.bold('\n✓ No security issues found!\n'));
          }
        }
      } else {
        // JSON, SARIF, or HTML output
        const output = reporter.format(result, options.format as OutputFormat);

        if (options.output) {
          const { writeFile } = await import('fs/promises');
          await writeFile(options.output, output);
          console.error(chalk.green(`\n✓ Report written to ${options.output}\n`));
        } else {
          console.log(output);
        }
      }

      // Exit codes:
      //   0 — clean scan, or findings below the configured fail-on threshold
      //   1 — findings at or above the fail-on threshold
      //   2 — error during execution (handled in the catch block)
      //
      // The failOn level comes from the loaded config (default: 'high').
      const failOnLevel = config?.severity?.failOn ?? 'high';
      const shouldFail = (() => {
        switch (failOnLevel) {
          case 'low':    return result.summary.total > 0;
          case 'medium': return result.summary.bySeverity.WARNING > 0 || result.summary.bySeverity.ERROR > 0;
          case 'high':   return result.summary.bySeverity.ERROR > 0;
          case 'critical': return false; // no CRITICAL-severity findings exist
          default:       return result.summary.bySeverity.ERROR > 0;
        }
      })();

      process.exit(shouldFail ? 1 : 0);
    } catch (error: any) {
      // Enhanced error handling
      console.error('\n' + formatError(error) + '\n');
      process.exit(2); // Exit code 2: error during execution
    }
  });

program.parse();
