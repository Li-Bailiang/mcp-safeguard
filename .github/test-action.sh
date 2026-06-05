#!/usr/bin/env bash
# Test script for GitHub Action validation

set -e

echo "=== Testing MCP-Safeguard GitHub Action Implementation ==="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test 1: Check action.yml structure
echo "Test 1: Validating action.yml structure..."
if [ -f ".github/action.yml" ]; then
    echo -e "${GREEN}✓ action.yml exists${NC}"

    # Check required fields
    if grep -q "name:" .github/action.yml && \
       grep -q "description:" .github/action.yml && \
       grep -q "runs:" .github/action.yml; then
        echo -e "${GREEN}✓ Required fields present${NC}"
    else
        echo -e "${RED}✗ Missing required fields${NC}"
        exit 1
    fi

    # Check inputs
    if grep -q "fail-on-severity:" .github/action.yml && \
       grep -q "upload-sarif:" .github/action.yml && \
       grep -q "working-directory:" .github/action.yml; then
        echo -e "${GREEN}✓ All inputs defined${NC}"
    else
        echo -e "${YELLOW}⚠ Some inputs missing${NC}"
    fi

    # Check outputs
    if grep -q "risk-score:" .github/action.yml && \
       grep -q "total-findings:" .github/action.yml; then
        echo -e "${GREEN}✓ Outputs defined${NC}"
    else
        echo -e "${YELLOW}⚠ Outputs missing${NC}"
    fi
else
    echo -e "${RED}✗ action.yml not found${NC}"
    exit 1
fi
echo ""

# Test 2: Check workflow files
echo "Test 2: Validating workflow files..."
if [ -d ".github/workflows" ]; then
    echo -e "${GREEN}✓ .github/workflows directory exists${NC}"

    workflow_count=$(find .github/workflows -name "*.yml" -o -name "*.yaml" | wc -l)
    echo -e "${GREEN}✓ Found ${workflow_count} workflow file(s)${NC}"

    for workflow in .github/workflows/*.yml; do
        if [ -f "$workflow" ]; then
            echo "  - $(basename $workflow)"
            if grep -q "uses:.*mcp-safeguard" "$workflow" || grep -q "mcp-safeguard scan" "$workflow"; then
                echo -e "    ${GREEN}✓ Uses MCP-Safeguard${NC}"
            fi
        fi
    done
else
    echo -e "${RED}✗ .github/workflows directory not found${NC}"
    exit 1
fi
echo ""

# Test 3: Check GitHub Commenter implementation
echo "Test 3: Validating GitHub Commenter..."
if [ -f "packages/core/src/github-commenter.ts" ]; then
    echo -e "${GREEN}✓ github-commenter.ts exists${NC}"

    # Check key methods
    if grep -q "generateComment" packages/core/src/github-commenter.ts && \
       grep -q "postComment" packages/core/src/github-commenter.ts && \
       grep -q "getNewFindings" packages/core/src/github-commenter.ts; then
        echo -e "${GREEN}✓ All key methods implemented${NC}"
    else
        echo -e "${RED}✗ Missing key methods${NC}"
        exit 1
    fi

    # Check if exported
    if grep -q "GitHubCommenter" packages/core/src/index.ts; then
        echo -e "${GREEN}✓ Exported from core package${NC}"
    else
        echo -e "${RED}✗ Not exported from index.ts${NC}"
        exit 1
    fi
else
    echo -e "${RED}✗ github-commenter.ts not found${NC}"
    exit 1
fi
echo ""

# Test 4: Check documentation
echo "Test 4: Validating documentation..."
if [ -f "docs/github-action.md" ]; then
    echo -e "${GREEN}✓ github-action.md exists${NC}"

    # Check sections
    if grep -q "## Quick Start" docs/github-action.md && \
       grep -q "## Configuration" docs/github-action.md && \
       grep -q "## Troubleshooting" docs/github-action.md; then
        echo -e "${GREEN}✓ All required sections present${NC}"
    else
        echo -e "${YELLOW}⚠ Some sections missing${NC}"
    fi

    # Check examples
    example_count=$(grep -c '```yaml' docs/github-action.md || true)
    echo -e "${GREEN}✓ Found ${example_count} YAML example(s)${NC}"
else
    echo -e "${RED}✗ github-action.md not found${NC}"
    exit 1
fi
echo ""

# Test 5: Validate YAML syntax (if yamllint available)
echo "Test 5: Validating YAML syntax..."
if command -v yamllint &> /dev/null; then
    if yamllint .github/ 2>&1 | grep -q "error"; then
        echo -e "${RED}✗ YAML syntax errors found${NC}"
        yamllint .github/
        exit 1
    else
        echo -e "${GREEN}✓ YAML syntax valid${NC}"
    fi
else
    echo -e "${YELLOW}⚠ yamllint not available, skipping YAML validation${NC}"
fi
echo ""

# Test 6: Check action composition
echo "Test 6: Validating action composition..."
if grep -q "using: 'composite'" .github/action.yml; then
    echo -e "${GREEN}✓ Uses composite action type${NC}"
else
    echo -e "${RED}✗ Not a composite action${NC}"
    exit 1
fi

if grep -q "shell: bash" .github/action.yml; then
    echo -e "${GREEN}✓ Uses bash shell${NC}"
else
    echo -e "${YELLOW}⚠ Shell not specified${NC}"
fi
echo ""

# Test 7: Check SARIF upload integration
echo "Test 7: Validating SARIF upload..."
if grep -q "github/codeql-action/upload-sarif" .github/action.yml; then
    echo -e "${GREEN}✓ SARIF upload action integrated${NC}"
else
    echo -e "${RED}✗ SARIF upload not found${NC}"
    exit 1
fi

if grep -q "sarif_file:" .github/action.yml; then
    echo -e "${GREEN}✓ SARIF file path configured${NC}"
else
    echo -e "${RED}✗ SARIF file path not configured${NC}"
    exit 1
fi
echo ""

# Test 8: Check PR comment integration
echo "Test 8: Validating PR comment feature..."
if grep -q "actions/github-script" .github/action.yml; then
    echo -e "${GREEN}✓ GitHub Script action integrated${NC}"
else
    echo -e "${RED}✗ GitHub Script action not found${NC}"
    exit 1
fi

if grep -q "github.event_name == 'pull_request'" .github/action.yml; then
    echo -e "${GREEN}✓ PR event check present${NC}"
else
    echo -e "${YELLOW}⚠ PR event check not found${NC}"
fi
echo ""

# Summary
echo "========================================"
echo -e "${GREEN}All tests passed!${NC}"
echo "========================================"
echo ""
echo "GitHub Action implementation validated:"
echo "  ✓ Action definition (action.yml)"
echo "  ✓ Example workflows"
echo "  ✓ GitHub Commenter"
echo "  ✓ Documentation"
echo "  ✓ SARIF integration"
echo "  ✓ PR comments"
echo ""
echo "Next steps:"
echo "  1. Build packages: pnpm build"
echo "  2. Test locally: act -j security-scan"
echo "  3. Push to GitHub and create test PR"
echo "  4. Monitor action execution"
