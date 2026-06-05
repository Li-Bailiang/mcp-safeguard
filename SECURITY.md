# Security Policy

## Supported Versions

We release patches for security vulnerabilities in the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |

## Reporting a Vulnerability

If you discover a security vulnerability in MCP-Safeguard, please report it privately
via [GitHub Security Advisories](https://github.com/Li-Bailiang/mcp-safeguard/security/advisories/new)
("Report a vulnerability").

**Please do not report security vulnerabilities through public GitHub issues.**

### What to Include

Please include the following information in your report:

- Type of vulnerability
- Full paths of source file(s) related to the vulnerability
- Location of the affected source code (tag/branch/commit or direct URL)
- Step-by-step instructions to reproduce the issue
- Proof-of-concept or exploit code (if available)
- Impact of the issue, including how an attacker might exploit it

### Response Timeline

- **24 hours**: Initial acknowledgment of your report
- **7 days**: Detailed response with assessment and next steps
- **30 days**: Security patch released (if vulnerability confirmed)

### Disclosure Policy

- We will coordinate disclosure timing with you
- We will credit you in the security advisory (unless you prefer anonymity)
- We will publish a security advisory after the patch is released

## Security Best Practices for Users

When using MCP-Safeguard:

1. **Keep Updated**: Always use the latest version
2. **Review Rules**: Understand what each rule detects
3. **Custom Rules**: Test custom rules in safe environments first
4. **CI/CD Integration**: Run scans as part of your pipeline
5. **False Positives**: Report false positives to help improve accuracy

## Known Security Considerations

### Semgrep Dependency

MCP-Safeguard depends on Semgrep for static analysis. Ensure Semgrep is:
- Installed from official sources
- Kept up to date
- Run in isolated environments when scanning untrusted code

### Rule Updates

Security rules are updated regularly. Subscribe to release notifications to stay informed about new detections.

## Security Features

MCP-Safeguard includes:

- **Static Analysis**: No code execution during scanning
- **Sandboxed Execution**: Semgrep runs in isolated processes
- **UTF-8 Safe**: Proper encoding handling to prevent injection
- **Path Validation**: Safe file system operations
- **No Network Calls**: Scanning works offline (unless rules require remote resources)

## Acknowledgments

We thank the security research community for responsibly disclosing vulnerabilities.
