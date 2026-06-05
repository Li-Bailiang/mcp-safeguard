# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-06-03

### Added
- Initial release of MCP-Safeguard
- 170 security rules:
  - MCP/JS/Python/config (82 rules):
    - MCP Threats (6): tool poisoning, rug-pull, cross-server shadowing, credential passthrough
    - Supply Chain (6)
    - Shadow Server (11)
    - Indirect Injection (8)
    - Excessive Agency (8)
    - Context Overshare (7)
    - Typosquatting (4)
    - DoS (7)
    - Infrastructure — Dockerfile / Kubernetes / MCP config (25)
  - General-purpose SAST (88): Go (27), Java (32), Rust (29) — loaded only when that language is present
- Language-gated rule loading (only loads packs for languages present in the target)
- Core scanning engine with Semgrep integration (`execFile`, memory + timeout caps)
- Risk scoring system
- CLI tool with multiple output formats (text, JSON, SARIF, HTML)
- Auto-installer for Semgrep (`@mcp-safeguard/semgrep-installer`)
- Runtime protection SDK (`@mcp-safeguard/runtime`)
- GitHub composite action (`.github/action.yml`)
- Manifest parser for JavaScript and Python projects
- Ignore file support (.mcpignore)
- Comprehensive test suite

### Fixed
- UTF-8 encoding support for Semgrep output on non-UTF-8 locales
- Semgrep rule syntax validation
- Test infrastructure for fixtures

### Security
- Rules carry CWE mappings and OWASP Top 10 2021 references where applicable
- Confidence, impact, and likelihood ratings on each rule

## [Unreleased]

### Planned
- Publish to npm
- VS Code extension
- Baseline / diff scanning
- Web dashboard for results visualization
