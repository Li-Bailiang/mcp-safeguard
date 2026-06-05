# MCP-Safeguard remediation guide

Per-category triage notes for explaining findings and proposing **minimal** fixes.
Always anchor to the actual `check_id`, category, and `file:line` from the scan
report — categories below are descriptive, not a substitute for the report. Re-scan
after every fix to confirm it cleared.

General fix order: highest severity first; within the same severity, fix the smallest
blast-radius / clearest cases first. Prefer `--dry-run` before `--fix`.

---

## Tool poisoning
**What:** A tool's description/schema contains hidden instructions intended to
manipulate the calling agent (e.g. "always also call X", "ignore previous rules").
**Look for:** Imperative or meta instructions inside `description`, `inputSchema`
docs, or returned tool results.
**Fix:** Strip injected instructions; keep tool descriptions purely declarative
(what it does + parameter semantics). Treat tool descriptions as data, never as
agent instructions. Add review of any dynamically generated descriptions.

## Rug-pull (mutable tool definition)
**What:** Tool name/description/behavior can change after initial approval, so a
benign tool later turns malicious.
**Look for:** Tool metadata fetched from a remote/mutable source at runtime; version
or definition not pinned.
**Fix:** Pin tool definitions; verify integrity (hash/signature) of remote
definitions; re-prompt for approval when a definition changes.

## Cross-server shadowing
**What:** One MCP server defines a tool whose name/description overrides or
intercepts another server's tool.
**Look for:** Duplicate/near-duplicate tool names across servers; descriptions
referencing other servers' tools.
**Fix:** Namespace tool names; reject or warn on collisions; don't let one server
describe another's behavior.

## Credential passthrough
**What:** Secrets/tokens received by the server are forwarded to downstream calls,
logs, or tool outputs.
**Look for:** Auth headers/env secrets passed into outbound requests, returned in
responses, or written to logs.
**Fix:** Scope and mint downstream credentials server-side; never echo secrets in
responses or logs; redact before logging. **High-risk — state impact before editing.**

## Command injection
**What:** User/tool input reaches a shell or process exec.
**Look for:** `child_process.exec`, `os.system`, `subprocess.*(shell=True)`, string-
built commands.
**Fix:** Use argument arrays (`execFile`/`spawn` with args, `subprocess.run([...])`,
no `shell=True`); validate/allowlist inputs. Never interpolate input into a shell
string. **High-risk.**

## Secrets in code
**What:** Hardcoded API keys, tokens, private keys, passwords.
**Look for:** Literal credential strings, `.env` committed, key material in source.
**Fix:** Move to environment/secret manager; remove from source **and history**;
rotate the exposed secret. Rotation is mandatory once exposed.

## SSRF (server-side request forgery)
**What:** Server makes outbound requests to a URL derived from input.
**Look for:** `fetch`/`requests`/`http` calls using an input-controlled URL/host.
**Fix:** Allowlist hosts/schemes; block internal/metadata IP ranges
(`169.254.169.254`, link-local, RFC1918, loopback); resolve+validate before request.
**High-risk — state impact (which destinations get blocked) before editing.**

## Path traversal
**What:** Input controls a filesystem path, allowing escape outside the intended dir.
**Look for:** `join(base, userInput)` then read/write, with no containment check.
**Fix:** Normalize and assert the resolved path stays within an allowed base
directory; reject `..` and absolute paths from input.

## Excessive agency / over-permissioned tools
**What:** Tools can take actions far broader than needed (delete, transfer, deploy)
with weak gating.
**Look for:** Tools exposing destructive or privileged operations without
confirmation/scoping.
**Fix:** Apply least privilege; split or gate dangerous operations; require explicit
confirmation; narrow scopes.

## Context overshare
**What:** Server returns more data/context than the task needs (full files, env,
internal state).
**Look for:** Responses dumping environment, full directory listings, or unbounded
data.
**Fix:** Return only what the tool's contract requires; filter/paginate; redact
internal metadata.

## Indirect prompt injection
**What:** External content the server ingests (files, web, tool results) carries
instructions that reach the agent.
**Look for:** Untrusted external text passed through to model context unsanitized.
**Fix:** Clearly delimit/label untrusted content as data; do not concatenate it into
instruction context; strip control directives.

## Missing input validation
**What:** Tool parameters used without type/shape/range checks.
**Look for:** Direct use of `args.*` without schema validation.
**Fix:** Validate against the declared `inputSchema`; reject malformed input early.
The `missing-input-validation` rule supports `options.allowedPatterns` (e.g. `email`,
`url`) in config.

## Typosquatting
**What:** Dependency or server name impersonates a popular package.
**Look for:** Near-miss package names in manifests.
**Fix:** Verify the intended package/publisher; pin and lock dependencies.

---

### After remediation
1. Re-run `mcp-safeguard scan <path>` (and `--dry-run` before any `--fix`).
2. Confirm the specific finding cleared and no new findings appeared.
3. Summarize what changed and any residual risk you could not fully remove.
