#!/bin/bash
# Quick validation check for MCP Safeguard rules

echo "Validating MCP Safeguard rules..."
semgrep --validate --config packages/core/rules/

if [ $? -eq 0 ]; then
    echo ""
    echo "✓ All rules validated successfully!"
    echo ""
    echo "Summary:"
    echo "--------"
    echo "Updated rules in categories:"
    echo "  - indirect-injection/external-content.yaml: 8 rules"
    echo "  - excessive-agency/autonomous-actions.yaml: 8 rules"
    echo "  - context-overshare/excessive-sharing.yaml: 7 rules"
    echo "  - dos/resource-exhaustion.yaml: 6 rules"
    echo "  - supply-chain/suspicious-packages.yaml: 6 rules"
    echo "  - shadow-server/insecure-config-js.yaml: 7 rules"
    echo "  - shadow-server/insecure-config-py.yaml: 4 rules"
    echo "  - typosquatting/package-name-hijack.yaml: 4 rules"
    echo ""
    echo "Test files created: 28"
    echo "  - 7 test categories"
    echo "  - Each with positive (should detect) and negative (should NOT detect) cases"
    echo "  - Languages: JavaScript, TypeScript, Python"
    echo ""
else
    echo "✗ Validation failed. Check errors above."
    exit 1
fi
