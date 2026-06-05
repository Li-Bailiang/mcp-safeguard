# GitHub Action Integration

Complete guide for integrating MCP-Safeguard into your GitHub Actions CI/CD pipeline.

## Quick Start

### 1. Basic Setup

Add the MCP Security Scanner to your workflow:

```yaml
name: Security Scan

on: [push, pull_request]

permissions:
  contents: read
  security-events: write
  pull-requests: write

jobs:
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: Li-Bailiang/mcp-safeguard@main
        with:
          fail-on-severity: 'high'
          upload-sarif: 'true'
```

### 2. Install from npm and Run Directly

```yaml
- name: Setup Node.js
  uses: actions/setup-node@v4
  with:
    node-version: '20'

- name: Install MCP-Safeguard
  run: npm install -g @mcp-safeguard/cli

- name: Run scan
  run: mcp-safeguard scan . --format sarif --output results.sarif

- name: Upload SARIF
  uses: github/codeql-action/upload-sarif@v3
  with:
    sarif_file: results.sarif
```

## Configuration

### Input Parameters

| Parameter | Description | Default | Required |
|-----------|-------------|---------|----------|
| `fail-on-severity` | Fail build on severity level: `low`, `medium`, `high` | `high` | No |
| `upload-sarif` | Upload SARIF to GitHub Security tab | `true` | No |
| `config-path` | Path to custom config file | `.mcp-safeguardrc.js` | No |
| `working-directory` | Working directory for scan | `.` | No |
| `github-token` | GitHub token for API access | `${{ github.token }}` | No |

### Output Parameters

| Output | Description |
|--------|-------------|
| `risk-score` | Overall risk score (0-100) |
| `total-findings` | Total number of findings |
| `error-count` | Number of error-level findings |
| `sarif-path` | Path to generated SARIF file |

## Advanced Usage

### Custom Configuration

Create a `.mcp-safeguardrc.js` file:

```javascript
module.exports = {
  // Ignore patterns
  ignore: [
    '**/node_modules/**',
    '**/test/**',
    '**/*.test.ts'
  ],

  // Severity settings
  severity: {
    minimum: 'warning'
  },

  // Rule configuration
  rules: {
    disabled: ['rule-id-to-disable'],
    custom: './custom-rules/'
  },

  // Risk scoring
  scoring: {
    weights: {
      ERROR: 10,
      WARNING: 5,
      INFO: 1
    }
  }
};
```

Use in workflow:

```yaml
- uses: Li-Bailiang/mcp-safeguard@main
  with:
    config-path: '.mcp-safeguardrc.js'
    fail-on-severity: 'medium'
```

### Matrix Scanning

Scan multiple directories or packages:

```yaml
jobs:
  security:
    strategy:
      matrix:
        directory: ['packages/cli', 'packages/core', 'packages/rules']
    steps:
      - uses: actions/checkout@v4
      - uses: Li-Bailiang/mcp-safeguard@main
        with:
          working-directory: ${{ matrix.directory }}
          fail-on-severity: 'high'
```

### Conditional Scanning

Run only when relevant files change:

```yaml
- name: Check for changes
  id: changes
  run: |
    if git diff --name-only ${{ github.event.before }} ${{ github.sha }} | grep -E '\.(ts|js)$'; then
      echo "scan-needed=true" >> $GITHUB_OUTPUT
    fi

- name: Run security scan
  if: steps.changes.outputs.scan-needed == 'true'
  uses: Li-Bailiang/mcp-safeguard@main
```

### Scheduled Scans

Run daily security audits:

```yaml
on:
  schedule:
    - cron: '0 2 * * *'  # 2 AM UTC daily
  workflow_dispatch:  # Manual trigger

jobs:
  security-audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: Li-Bailiang/mcp-safeguard@main
        with:
          fail-on-severity: 'medium'
          upload-sarif: 'true'
```

### PR Comments

The action automatically comments on pull requests with scan results:

```yaml
on:
  pull_request:

permissions:
  pull-requests: write

jobs:
  security:
    steps:
      - uses: actions/checkout@v4
      - uses: Li-Bailiang/mcp-safeguard@main
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
```

The comment includes:
- Risk score and trend
- Summary by severity
- New findings since baseline
- Top security issues
- Category breakdown

### Baseline Comparison

Compare against main branch:

This example builds the CLI from source (see "Build from Source and Run
Directly" above) and reuses the resulting binary for both scans:

```yaml
- name: Checkout baseline
  uses: actions/checkout@v4
  with:
    ref: main
    path: baseline

# Assumes pnpm + Node are set up and the CLI has been built at
# mcp-safeguard/packages/cli/dist/index.js (see the build-from-source example).
- name: Scan baseline
  run: |
    cd baseline
    node ../mcp-safeguard/packages/cli/dist/index.js scan . --format json --output ../baseline.json
    cd ..

- name: Scan current
  run: node mcp-safeguard/packages/cli/dist/index.js scan . --format json --output current.json

- name: Compare results
  run: |
    # MCP-Safeguard does not yet ship a built-in baseline/diff command, so compare
    # the two JSON reports yourself. Minimal example using jq — fail if the
    # current scan has more ERROR-level findings than the baseline:
    BASE=$(jq '.summary.bySeverity.ERROR // 0' baseline.json)
    CUR=$(jq '.summary.bySeverity.ERROR // 0' current.json)
    echo "baseline errors=$BASE current errors=$CUR"
    if [ "$CUR" -gt "$BASE" ]; then
      echo "::error::New error-level findings introduced ($BASE -> $CUR)"
      exit 1
    fi
```

> Baseline / diff scanning is on the roadmap; until then, compare exported JSON
> reports as shown above.

## SARIF Integration

### GitHub Security Tab

Findings are automatically uploaded to GitHub's Security tab when `upload-sarif: true`:

```yaml
- uses: Li-Bailiang/mcp-safeguard@main
  with:
    upload-sarif: 'true'
```

View results at: `https://github.com/owner/repo/security/code-scanning`

### Manual SARIF Upload

Assumes the CLI has been built from source (see "Build from Source and Run
Directly" above):

```yaml
- name: Generate SARIF
  run: node mcp-safeguard/packages/cli/dist/index.js scan . --format sarif --output results.sarif

- name: Upload to Security tab
  uses: github/codeql-action/upload-sarif@v3
  with:
    sarif_file: results.sarif
    category: mcp-safeguard
```

## Fail Conditions

### Severity Thresholds

Control when the action fails:

```yaml
# Fail on high-risk issues only (risk score >= 70)
fail-on-severity: 'high'

# Fail on medium-risk issues (risk score >= 50)
fail-on-severity: 'medium'

# Fail on any issues (risk score >= 30)
fail-on-severity: 'low'
```

### Custom Thresholds

Use outputs for custom logic:

```yaml
- uses: Li-Bailiang/mcp-safeguard@main
  id: scan
  with:
    fail-on-severity: 'none'

- name: Custom threshold check
  run: |
    if [ "${{ steps.scan.outputs.error-count }}" -gt 5 ]; then
      echo "Too many errors: ${{ steps.scan.outputs.error-count }}"
      exit 1
    fi
```

## Example Workflows

### Complete CI Pipeline

```yaml
name: CI Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:

permissions:
  contents: read
  security-events: write
  pull-requests: write

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm test

  security:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: Li-Bailiang/mcp-safeguard@main
        with:
          fail-on-severity: 'high'
          upload-sarif: 'true'
          github-token: ${{ secrets.GITHUB_TOKEN }}

      - name: Archive results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: security-results
          path: mcp-safeguard-results.*
```

### Multi-Stage Security

```yaml
jobs:
  quick-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: Li-Bailiang/mcp-safeguard@main
        with:
          fail-on-severity: 'high'
          config-path: '.mcp-safeguardrc.quick.js'

  deep-scan:
    needs: quick-scan
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: Li-Bailiang/mcp-safeguard@main
        with:
          fail-on-severity: 'medium'
          config-path: '.mcp-safeguardrc.deep.js'
```

## Troubleshooting

### Common Issues

#### 1. Permission Denied

```
Error: Resource not accessible by integration
```

**Solution**: Add required permissions to workflow:

```yaml
permissions:
  contents: read
  security-events: write
  pull-requests: write
```

#### 2. SARIF Upload Fails

```
Error: SARIF file is too large
```

**Solution**: GitHub has a 10MB limit. Filter results:

```javascript
// .mcp-safeguardrc.js
module.exports = {
  severity: {
    minimum: 'warning'  // Exclude INFO findings
  }
};
```

#### 3. No Findings in Security Tab

**Solution**: Ensure SARIF upload is enabled and permissions are set:

```yaml
- uses: Li-Bailiang/mcp-safeguard@main
  with:
    upload-sarif: 'true'
```

#### 4. Action Times Out

**Solution**: Increase timeout or reduce scan scope:

```yaml
- uses: Li-Bailiang/mcp-safeguard@main
  timeout-minutes: 30
  with:
    config-path: '.mcp-safeguardrc.js'
```

#### 5. False Positives

**Solution**: Disable specific rules:

```javascript
// .mcp-safeguardrc.js
module.exports = {
  rules: {
    disabled: [
      'rule-id-with-false-positives'
    ]
  }
};
```

### Debug Mode

Enable verbose logging:

```yaml
- name: Run scan with debug output
  run: |
    node mcp-safeguard/packages/cli/dist/index.js scan . --format json --output results.json
  env:
    DEBUG: 'mcp-safeguard:*'
```

### Getting Help

- **Issues**: https://github.com/Li-Bailiang/mcp-safeguard/issues
- **Discussions**: https://github.com/Li-Bailiang/mcp-safeguard/discussions
- **Documentation**: https://github.com/Li-Bailiang/mcp-safeguard/docs

## Best Practices

1. **Start with high severity threshold**, then gradually increase strictness
2. **Use PR comments** to catch issues during code review
3. **Schedule regular scans** to catch new vulnerabilities
4. **Archive scan results** as artifacts for audit trail
5. **Compare with baseline** to track security improvements
6. **Configure ignore patterns** for test files and third-party code
7. **Use matrix strategy** for monorepos with multiple packages
8. **Set up notifications** for security alerts
9. **Integrate with existing CI/CD** pipelines
10. **Review and update rules** regularly

## Migration Guide

### From Other Security Scanners

#### From ESLint Security Plugin

```yaml
# Before
- run: npm run lint:security

# After
- uses: Li-Bailiang/mcp-safeguard@main
  with:
    fail-on-severity: 'high'
```

#### From Semgrep Cloud

```yaml
# Before
- uses: returntocorp/semgrep-action@v1

# After (MCP-focused rules)
- uses: Li-Bailiang/mcp-safeguard@main
  with:
    upload-sarif: 'true'
```

## License

MIT License - see LICENSE file for details
