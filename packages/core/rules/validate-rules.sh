#!/bin/bash
# Validation script for MCP Safeguard rules

echo "=== MCP Safeguard Rules Validation ==="
echo ""

# Validate all rules
echo "1. Validating all Semgrep rules..."
semgrep --validate --config packages/core/rules/

if [ $? -eq 0 ]; then
    echo "✓ All rules are valid"
else
    echo "✗ Some rules have validation errors"
fi

echo ""
echo "2. Testing rules against positive cases (should detect)..."
semgrep --config packages/core/rules/ packages/core/rules/test/*/positive.* --json > /tmp/positive-results.json
POSITIVE_COUNT=$(jq '.results | length' /tmp/positive-results.json 2>/dev/null || echo "0")
echo "   Detected $POSITIVE_COUNT issues in positive test cases"

echo ""
echo "3. Testing rules against negative cases (should NOT detect)..."
semgrep --config packages/core/rules/ packages/core/rules/test/*/negative.* --json > /tmp/negative-results.json
NEGATIVE_COUNT=$(jq '.results | length' /tmp/negative-results.json 2>/dev/null || echo "0")
echo "   Detected $NEGATIVE_COUNT issues in negative test cases (should be 0)"

echo ""
echo "4. Summary:"
echo "   - Total rule files: $(find packages/core/rules -name '*.yaml' -o -name '*.yml' | wc -l)"
echo "   - Test files created: $(find packages/core/rules/test -name '*.js' -o -name '*.ts' -o -name '*.py' | wc -l)"
echo "   - Rules with confidence field: $(grep -r 'confidence:' packages/core/rules/*.yaml packages/core/rules/*/*.yaml 2>/dev/null | wc -l)"
echo ""
echo "Done!"
