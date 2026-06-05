# Contributing to MCP-Safeguard

Thank you for considering contributing to MCP-Safeguard! This document provides guidelines for contributing to the project.

This project follows a [Code of Conduct](./CODE_OF_CONDUCT.md) — by participating, you are expected to uphold it.

## Development Setup

```bash
# Clone the repository
git clone https://github.com/Li-Bailiang/mcp-safeguard.git
cd mcp-safeguard

# Install dependencies
pnpm install

# Build the project
pnpm build

# Run tests
pnpm test
```

## Project Structure

```
mcp-safeguard/
├── packages/
│   ├── core/           # Core scanning functionality
│   │   ├── src/        # Source code
│   │   └── rules/      # Semgrep security rules
│   └── cli/            # Command-line interface
├── tests/              # Test files and fixtures
└── docs/               # Documentation
```

## Adding New Rules

To add a new security rule:

1. Create a YAML file in the appropriate category under `packages/core/rules/`
2. Follow the Semgrep rule syntax
3. Include metadata: category, confidence, impact, likelihood, CWE, OWASP
4. Add test cases in `tests/fixtures/`
5. Update `docs/rules.md` with rule documentation

### Rule Template

```yaml
rules:
  - id: mcp-rule-id
    languages: [javascript, typescript]
    message: Description of the security issue
    severity: ERROR
    patterns:
      - pattern: |
          code pattern here
    metadata:
      category: category-name
      subcategory:
        - specific-issue
      confidence: HIGH
      impact: HIGH
      likelihood: MEDIUM
      cwe:
        - "CWE-XXX"
      owasp:
        - "AXX:2021"
```

## Testing

Before submitting a PR:

1. Add tests for new features
2. Ensure all tests pass: `pnpm test`
3. Verify the build succeeds: `pnpm build`
4. Test the CLI with real MCP servers

## Code Style

- Use TypeScript for all new code
- Follow existing code formatting
- Use meaningful variable names
- Add comments for complex logic
- Keep functions focused and small

## Pull Request Process

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make your changes
4. Add tests
5. Update documentation
6. Commit with clear messages
7. Push to your fork
8. Open a pull request

## Commit Messages

Follow conventional commits:

- `feat: Add new rule for XYZ`
- `fix: Correct false positive in ABC rule`
- `docs: Update installation instructions`
- `test: Add test cases for DEF`

## Security Issues

If you discover a security vulnerability, please follow the responsible-disclosure process in [SECURITY.md](./SECURITY.md) instead of opening a public issue.

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
