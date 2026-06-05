# MCP-Safeguard CI examples

Two supported approaches for GitHub Actions. Prefer the official composite action;
use the manual npm approach when you need full control over steps.

---

## Option A — official composite action (recommended)

`Li-Bailiang/mcp-safeguard` ships a composite action. Pin to a tag/SHA.

```yaml
name: MCP Security Scan
on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

permissions:
  contents: read
  security-events: write   # required for SARIF upload
  pull-requests: write     # required for the PR comment

jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: MCP-Safeguard
        uses: Li-Bailiang/mcp-safeguard@v0.1.1   # pin to a real released tag/SHA
        with:
          fail-on-severity: 'high'   # high | medium | low
          upload-sarif: 'true'
          working-directory: '.'
          # config-path: '.mcp-safeguardrc.yaml'   # optional
          github-token: ${{ secrets.GITHUB_TOKEN }}
```

**Verified action inputs:** `fail-on-severity` (default `high`), `upload-sarif`
(default `true`), `config-path` (default `.mcp-safeguardrc.js`), `working-directory`
(default `.`), `github-token` (default `${{ github.token }}`).
**Verified outputs:** `risk-score`, `total-findings`, `error-count`, `sarif-path`.

> Note: the action's `fail-on-severity` gates on the **risk score** (high ≥ 70,
> medium ≥ 50, low ≥ 30), which differs from the CLI's `failOn` (severity-count
> based). Pick thresholds accordingly.

Before writing `uses: Li-Bailiang/mcp-safeguard@<ref>`, confirm a matching release
tag exists. If unsure, use Option B.

---

## Option B — manual npm steps

Full control; works without the composite action.

```yaml
name: MCP Security Scan
on:
  pull_request:
    branches: [ main ]

permissions:
  contents: read
  security-events: write   # for SARIF upload

jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      # Run scan; capture exit code without failing the step yet.
      - name: Run MCP-Safeguard
        id: scan
        run: |
          set +e
          npx --yes @mcp-safeguard/cli scan . -f sarif -o results.sarif
          scan_exit=$?
          set -e
          echo "exit=$scan_exit" >> "$GITHUB_OUTPUT"

      - name: Upload SARIF to GitHub Security
        if: always()
        uses: github/codeql-action/upload-sarif@v3
        with:
          sarif_file: results.sarif
          category: mcp-safeguard

      # Gate the build on the scan's exit code (1 = findings at/above failOn).
      - name: Enforce gate
        if: always() && steps.scan.outputs.exit != '0'
        run: |
          echo "MCP-Safeguard found blocking security issues (exit ${{ steps.scan.outputs.exit }})."
          exit 1
```

Exit codes: `0` clean / below threshold, `1` findings at/above `failOn`, `2`
execution error. To distinguish a real error (`2`) from findings (`1`), branch on the
captured exit code instead of treating all non-zero the same.

---

## PR gating strategy

- **Block PRs** on `error`/high findings; surface `warning`/`info` as non-blocking.
- Always **upload SARIF** so findings appear inline in the GitHub "Security" tab and
  on the PR diff (`security-events: write` permission required).
- Pin the action ref and (for npm) consider pinning the CLI version
  (`@mcp-safeguard/cli@<version>`) for reproducible runs.
- For monorepos, scan each package directory (matrix over `working-directory`).
- Keep secrets out of the workflow; the scan needs no credentials beyond
  `GITHUB_TOKEN` for PR comments.
