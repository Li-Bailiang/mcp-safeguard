# MCP-Safeguard — Quality Hardening Summary

This document records what changed during the hardening pass. It deliberately
contains **only verifiable facts** — no invented adoption numbers, success
rates, false-positive percentages, or competitor scores. Anything not measured
is not claimed.

## What MCP-Safeguard ships today

- **170 Semgrep rules** (count: `grep -rhE '^\s+- id:' packages/core/rules --include='*.yaml' | wc -l`):
  - 57 MCP-focused rules across 8 categories (MCP Threats, Supply Chain, Shadow
    Server, Indirect Injection, Excessive Agency, Context Overshare,
    Typosquatting, DoS)
  - 25 infrastructure rules (Dockerfile, Kubernetes, MCP config)
  - 88 general-purpose Go/Java/Rust SAST rules, loaded **only** when that
    language is present in the scan target (language-gated)
- **Packages**: `@mcp-safeguard/core`, `@mcp-safeguard/cli`, `@mcp-safeguard/runtime`,
  `@mcp-safeguard/semgrep-installer`, and three config presets.
- **Output formats**: text, JSON, SARIF, HTML.
- **Runtime SDK**: tool-call interception, rate limiting, prompt-injection
  heuristics, audit logging, circuit breaker.

## Hardening changes in this pass

### Correctness / security
- `semgrep.ts` and `semgrep-installer` invoke subprocesses via `execFile` with
  an argument array (no shell) — removes the command-injection surface from
  interpolated paths/`SEMGREP_PATH`.
- Semgrep runs with `--max-memory` and `--timeout` caps; subprocess has an
  overall timeout; crashes are translated into actionable error messages.
- Semgrep JSON output is parsed defensively (missing fields can't crash a scan).
- Rule loading is language-gated, so a JS/Python project no longer loads the
  88 Go/Java/Rust rules.
- `ConfigLoader` resolves relative `extends` against the config file's own
  directory; `PathMatcher` matches slash-less patterns by basename.

### New MCP-specific rules (`packages/core/rules/mcp-threats/`)
- `mcp-tool-poisoning` — hidden instructions in a tool description
- `mcp-tool-description-dynamic` — rug-pull (description computed at runtime)
- `mcp-cross-server-shadowing` — a description that overrides other tools
- `mcp-credential-passthrough` — a server secret forwarded to an outbound request
- These match the modern `McpServer.tool()` / `registerTool()` API and have
  Python variants where applicable.

### False-positive reduction
- `mcp-dynamic-import` no longer fires on static `require("...")` / `import("...")`.
- `mcp-excessive-logging` / `mcp-pii-exposure` only fire when the logged/returned
  value references sensitive/PII identifiers.
- Destructive-action and SSRF rules recognize common guard-clause idioms
  (`if (!confirmed) throw`, host allow-lists, path `startsWith` checks).

### Verification
- `pnpm build` and `pnpm test` pass.
- `tests/fixtures/vulnerable-extended` reports findings (13 ERROR-level);
  `tests/fixtures/safe-extended` reports **0** findings — asserted by
  `packages/core/tests/e2e/mcp-scan.test.ts`.
- The MCP-threat rules are validated against positive/negative fixtures in
  `packages/core/rules/test/mcp-threats/`.

## Known limitations

- Not published to npm — install from source or use the GitHub composite action.
- Pattern-based SAST: the Go/Java/Rust packs are general-purpose and can produce
  false positives on guarded code; they are advisory.
- No measured false-positive/false-negative rate is published. Don't infer one.
