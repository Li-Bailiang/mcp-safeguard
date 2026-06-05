# CI/CD Integration Guide

Integrate MCP-Safeguard into your continuous integration and deployment pipelines.

Install the published CLI package in CI with `npm install -g @mcp-safeguard/cli`, then run `mcp-safeguard scan ...`.

## Overview

MCP-Safeguard can automatically scan your MCP servers for security vulnerabilities in CI/CD pipelines, blocking builds when critical issues are found and providing detailed reports.

## GitHub Actions

### Quick Setup

Create `.github/workflows/mcp-security.yml`:

```yaml
name: MCP Security Scan

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

permissions:
  contents: read
  security-events: write

jobs:
  security-scan:
    name: Security Scan
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'

      - name: Install MCP-Safeguard
        run: npm install -g @mcp-safeguard/cli

      - name: Install Semgrep
        run: pip install semgrep

      - name: Run security scan
        run: mcp-safeguard scan . --format sarif -o results.sarif

      - name: Upload SARIF to GitHub
        uses: github/codeql-action/upload-sarif@v3
        if: always()
        with:
          sarif_file: results.sarif

      - name: Fail on high severity issues
        run: |
          HIGH_COUNT=$(mcp-safeguard scan . --format json | jq '.summary.bySeverity.ERROR')
          if [ "$HIGH_COUNT" -gt 0 ]; then
            echo "Found $HIGH_COUNT high-severity issues"
            exit 1
          fi
```

### Advanced Configuration

```yaml
name: Advanced MCP Security Scan

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]
  schedule:
    # Run daily at 2 AM UTC
    - cron: '0 2 * * *'
  workflow_dispatch:

permissions:
  contents: read
  security-events: write
  pull-requests: write

jobs:
  security-scan:
    name: Security Scan
    runs-on: ubuntu-latest
    
    strategy:
      matrix:
        directory: ['packages/server', 'packages/tools']
      fail-fast: false

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Install MCP-Safeguard
        run: npm install -g @mcp-safeguard/cli

      - name: Install Semgrep
        run: pip install semgrep

      - name: Create reports directory
        run: mkdir -p reports

      - name: Run security scan
        continue-on-error: true
        run: |
          mcp-safeguard scan ${{ matrix.directory }} \
            --format json -o reports/scan-results.json
          
          mcp-safeguard scan ${{ matrix.directory }} \
            --format sarif -o reports/scan-results.sarif

      - name: Upload SARIF results
        uses: github/codeql-action/upload-sarif@v3
        if: always()
        with:
          sarif_file: reports/scan-results.sarif
          category: mcp-safeguard-${{ matrix.directory }}

      - name: Generate summary
        if: always()
        run: |
          echo "### Security Scan Results for ${{ matrix.directory }}" >> $GITHUB_STEP_SUMMARY
          TOTAL=$(jq '.summary.total' reports/scan-results.json)
          ERRORS=$(jq '.summary.bySeverity.ERROR' reports/scan-results.json)
          WARNINGS=$(jq '.summary.bySeverity.WARNING' reports/scan-results.json)
          RISK=$(jq '.summary.riskScore' reports/scan-results.json)
          
          echo "- **Total Findings**: $TOTAL" >> $GITHUB_STEP_SUMMARY
          echo "- **High Severity**: $ERRORS" >> $GITHUB_STEP_SUMMARY
          echo "- **Medium Severity**: $WARNINGS" >> $GITHUB_STEP_SUMMARY
          echo "- **Risk Score**: $RISK/100" >> $GITHUB_STEP_SUMMARY

      - name: Comment on PR
        if: github.event_name == 'pull_request' && always()
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            const results = JSON.parse(fs.readFileSync('reports/scan-results.json', 'utf8'));
            
            const body = `## MCP-Safeguard Security Scan Results
            
            **Directory**: ${{ matrix.directory }}
            
            | Metric | Value |
            |--------|-------|
            | Total Findings | ${results.summary.total} |
            | High Severity | ${results.summary.bySeverity.ERROR} |
            | Medium Severity | ${results.summary.bySeverity.WARNING} |
            | Risk Score | ${results.summary.riskScore.toFixed(2)}/100 |
            
            ${results.summary.bySeverity.ERROR > 0 ? 'âš ï¸ **High severity issues found!**' : 'âœ?No high severity issues'}
            `;
            
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: body
            });

      - name: Upload artifacts
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: security-reports-${{ matrix.directory }}
          path: reports/
          retention-days: 30

      - name: Check severity threshold
        run: |
          ERRORS=$(jq '.summary.bySeverity.ERROR' reports/scan-results.json)
          if [ "$ERRORS" -gt 0 ]; then
            echo "â?Found $ERRORS high-severity issues"
            exit 1
          fi
          echo "âœ?No high-severity issues found"
```

## GitLab CI

### Basic Configuration

Create `.gitlab-ci.yml`:

```yaml
stages:
  - security

mcp-security-scan:
  stage: security
  image: node:18
  before_script:
    - npm install -g @mcp-safeguard/cli
    - pip install semgrep
  script:
    - mcp-safeguard scan . --format json -o mcp-safeguard-results.json
    - mcp-safeguard scan . --format sarif -o mcp-safeguard-results.sarif
  artifacts:
    reports:
      sast: mcp-safeguard-results.sarif
    paths:
      - mcp-safeguard-results.json
      - mcp-safeguard-results.sarif
    expire_in: 30 days
    when: always
  allow_failure: false
  rules:
    - if: $CI_COMMIT_BRANCH == "main"
    - if: $CI_PIPELINE_SOURCE == "merge_request_event"
```

### Advanced Configuration

```yaml
stages:
  - security
  - report

variables:
  MCP_SAFEGUARD_VERSION: "latest"
  SEVERITY_THRESHOLD: "error"

.mcp-scan-template:
  image: node:18-alpine
  before_script:
    - apk add --no-cache python3 py3-pip jq
    - npm install -g @mcp-safeguard/cli@${MCP_SAFEGUARD_VERSION}
    - pip3 install semgrep
  artifacts:
    reports:
      sast: reports/mcp-safeguard-results.sarif
    paths:
      - reports/
    expire_in: 30 days
    when: always

mcp-scan-server:
  extends: .mcp-scan-template
  stage: security
  script:
    - mkdir -p reports
    - |
      mcp-safeguard scan packages/server \
        --format json -o reports/server-results.json
    - |
      mcp-safeguard scan packages/server \
        --format sarif -o reports/mcp-safeguard-results.sarif
    - |
      ERRORS=$(jq '.summary.bySeverity.ERROR' reports/server-results.json)
      echo "High severity issues: $ERRORS"
      if [ "$ERRORS" -gt 0 ]; then
        exit 1
      fi
  rules:
    - if: $CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH
    - if: $CI_PIPELINE_SOURCE == "merge_request_event"

mcp-scan-tools:
  extends: .mcp-scan-template
  stage: security
  script:
    - mkdir -p reports
    - |
      mcp-safeguard scan packages/tools \
        --format json -o reports/tools-results.json
    - |
      mcp-safeguard scan packages/tools \
        --format sarif -o reports/tools-results.sarif
    - |
      ERRORS=$(jq '.summary.bySeverity.ERROR' reports/tools-results.json)
      if [ "$ERRORS" -gt 0 ]; then
        exit 1
      fi
  rules:
    - if: $CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH
    - if: $CI_PIPELINE_SOURCE == "merge_request_event"

security-report:
  stage: report
  image: alpine:latest
  before_script:
    - apk add --no-cache jq
  script:
    - |
      echo "# MCP-Safeguard Security Summary" > security-summary.md
      echo "" >> security-summary.md
      for file in reports/*-results.json; do
        NAME=$(basename "$file" -results.json)
        TOTAL=$(jq '.summary.total' "$file")
        ERRORS=$(jq '.summary.bySeverity.ERROR' "$file")
        WARNINGS=$(jq '.summary.bySeverity.WARNING' "$file")
        RISK=$(jq '.summary.riskScore' "$file")
        
        echo "## $NAME" >> security-summary.md
        echo "- Total: $TOTAL" >> security-summary.md
        echo "- High Severity: $ERRORS" >> security-summary.md
        echo "- Medium Severity: $WARNINGS" >> security-summary.md
        echo "- Risk Score: $RISK/100" >> security-summary.md
        echo "" >> security-summary.md
      done
    - cat security-summary.md
  dependencies:
    - mcp-scan-server
    - mcp-scan-tools
  artifacts:
    paths:
      - security-summary.md
    expire_in: 30 days
  rules:
    - if: $CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH
    - if: $CI_PIPELINE_SOURCE == "merge_request_event"
```

## Jenkins

### Declarative Pipeline

Create `Jenkinsfile`:

```groovy
pipeline {
    agent any
    
    environment {
        MCP_SAFEGUARD_VERSION = 'latest'
    }
    
    stages {
        stage('Setup') {
            steps {
                sh 'npm install -g @mcp-safeguard/cli@${MCP_SAFEGUARD_VERSION}'
                sh 'pip install semgrep'
            }
        }
        
        stage('Security Scan') {
            steps {
                sh 'mkdir -p reports'
                sh '''
                    mcp-safeguard scan . \
                        --format json -o reports/scan-results.json || true
                '''
                sh '''
                    mcp-safeguard scan . \
                        --format sarif -o reports/scan-results.sarif || true
                '''
            }
        }
        
        stage('Analyze Results') {
            steps {
                script {
                    def results = readJSON file: 'reports/scan-results.json'
                    def errorCount = results.summary.bySeverity.ERROR
                    def warningCount = results.summary.bySeverity.WARNING
                    def riskScore = results.summary.riskScore
                    
                    echo "Total Findings: ${results.summary.total}"
                    echo "High Severity: ${errorCount}"
                    echo "Medium Severity: ${warningCount}"
                    echo "Risk Score: ${riskScore}/100"
                    
                    if (errorCount > 0) {
                        error("Found ${errorCount} high-severity security issues")
                    }
                }
            }
        }
    }
    
    post {
        always {
            archiveArtifacts artifacts: 'reports/**', allowEmptyArchive: true
            
            // Publish SARIF results
            recordIssues(
                enabledForFailure: true,
                tools: [sarif(pattern: 'reports/scan-results.sarif')]
            )
        }
        
        success {
            echo 'Security scan passed!'
        }
        
        failure {
            echo 'Security scan failed - review the findings'
        }
    }
}
```

### Scripted Pipeline

```groovy
node {
    stage('Checkout') {
        checkout scm
    }
    
    stage('Setup Tools') {
        sh 'npm install -g @mcp-safeguard/cli'
        sh 'pip install semgrep'
    }
    
    stage('Run Security Scan') {
        try {
            sh 'mkdir -p reports'
            sh 'mcp-safeguard scan . --format json -o reports/results.json'
            sh 'mcp-safeguard scan . --format sarif -o reports/results.sarif'
        } catch (Exception e) {
            echo "Scan completed with findings"
        }
    }
    
    stage('Check Threshold') {
        def results = readJSON file: 'reports/results.json'
        def errorCount = results.summary.bySeverity.ERROR
        
        if (errorCount > 0) {
            currentBuild.result = 'FAILURE'
            error("Found ${errorCount} high-severity issues")
        }
    }
    
    stage('Archive Results') {
        archiveArtifacts artifacts: 'reports/**'
    }
}
```

## Azure DevOps

### Pipeline YAML

Create `azure-pipelines.yml`:

```yaml
trigger:
  - main
  - develop

pr:
  - main
  - develop

pool:
  vmImage: 'ubuntu-latest'

variables:
  mcpSafeguardVersion: 'latest'

stages:
  - stage: SecurityScan
    displayName: 'Security Scan'
    jobs:
      - job: MCPSafeguard
        displayName: 'MCP-Safeguard Security Scan'
        steps:
          - task: NodeTool@0
            inputs:
              versionSpec: '18.x'
            displayName: 'Install Node.js'

          - script: |
              npm install -g @mcp-safeguard/cli@$(mcpSafeguardVersion)
              pip install semgrep
            displayName: 'Install Tools'

          - script: |
              mkdir -p $(Build.ArtifactStagingDirectory)/reports
              mcp-safeguard scan $(Build.SourcesDirectory) \
                --format json -o $(Build.ArtifactStagingDirectory)/reports/results.json
              mcp-safeguard scan $(Build.SourcesDirectory) \
                --format sarif -o $(Build.ArtifactStagingDirectory)/reports/results.sarif
            displayName: 'Run Security Scan'
            continueOnError: true

          - task: PublishBuildArtifacts@1
            inputs:
              pathToPublish: '$(Build.ArtifactStagingDirectory)/reports'
              artifactName: 'security-reports'
            displayName: 'Publish Results'
            condition: always()

          - script: |
              ERRORS=$(cat $(Build.ArtifactStagingDirectory)/reports/results.json | jq '.summary.bySeverity.ERROR')
              echo "High severity issues: $ERRORS"
              if [ "$ERRORS" -gt 0 ]; then
                echo "##vso[task.logissue type=error]Found $ERRORS high-severity security issues"
                exit 1
              fi
            displayName: 'Check Results'

          - task: PublishSecurityAnalysisLogs@3
            inputs:
              ArtifactName: 'CodeAnalysisLogs'
              ArtifactType: 'Container'
            condition: always()
```

## CircleCI

### Configuration

Create `.circleci/config.yml`:

```yaml
version: 2.1

orbs:
  node: circleci/node@5.1.0

jobs:
  security-scan:
    docker:
      - image: cimg/node:18.0
    steps:
      - checkout
      
      - run:
          name: Install MCP-Safeguard
          command: npm install -g @mcp-safeguard/cli
      
      - run:
          name: Install Semgrep
          command: pip install semgrep
      
      - run:
          name: Run Security Scan
          command: |
            mkdir -p reports
            mcp-safeguard scan . --format json -o reports/results.json || true
            mcp-safeguard scan . --format sarif -o reports/results.sarif || true
      
      - run:
          name: Check Severity
          command: |
            ERRORS=$(cat reports/results.json | jq '.summary.bySeverity.ERROR')
            if [ "$ERRORS" -gt 0 ]; then
              echo "Found $ERRORS high-severity issues"
              exit 1
            fi
      
      - store_artifacts:
          path: reports
          destination: security-reports
      
      - store_test_results:
          path: reports

workflows:
  version: 2
  security:
    jobs:
      - security-scan:
          filters:
            branches:
              only:
                - main
                - develop
```

## Generic CI/CD Pattern

### Bash Script

Create `scripts/security-scan.sh`:

```bash
#!/bin/bash
set -e

# Configuration
SEVERITY_THRESHOLD=${SEVERITY_THRESHOLD:-"error"}
OUTPUT_DIR=${OUTPUT_DIR:-"./reports"}
FAIL_ON_ERROR=${FAIL_ON_ERROR:-"true"}

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "=== MCP-Safeguard Security Scan ==="
echo ""

# Check if tools are installed
if ! command -v mcp-safeguard &> /dev/null; then
    echo -e "${RED}Error: mcp-safeguard is not installed${NC}"
    echo "Install: npm install -g @mcp-safeguard/cli"
    exit 1
fi

if ! command -v semgrep &> /dev/null; then
    echo -e "${RED}Error: semgrep is not installed${NC}"
    echo "Install: pip install semgrep"
    exit 1
fi

# Create output directory
mkdir -p "$OUTPUT_DIR"

# Run scan
echo "Running security scan..."
mcp-safeguard scan . --format json -o "$OUTPUT_DIR/results.json" || true
mcp-safeguard scan . --format sarif -o "$OUTPUT_DIR/results.sarif" || true

# Parse results
TOTAL=$(jq '.summary.total' "$OUTPUT_DIR/results.json")
ERRORS=$(jq '.summary.bySeverity.ERROR' "$OUTPUT_DIR/results.json")
WARNINGS=$(jq '.summary.bySeverity.WARNING' "$OUTPUT_DIR/results.json")
RISK=$(jq '.summary.riskScore' "$OUTPUT_DIR/results.json")

# Display summary
echo ""
echo "=== Scan Results ==="
echo "Total Findings: $TOTAL"
echo "High Severity: $ERRORS"
echo "Medium Severity: $WARNINGS"
echo "Risk Score: $RISK/100"
echo ""

# Determine exit code
if [ "$FAIL_ON_ERROR" = "true" ] && [ "$ERRORS" -gt 0 ]; then
    echo -e "${RED}â?Build failed: Found $ERRORS high-severity issues${NC}"
    exit 1
elif [ "$TOTAL" -gt 0 ]; then
    echo -e "${YELLOW}âš ï¸  Build passed with warnings${NC}"
    exit 0
else
    echo -e "${GREEN}âœ?Build passed: No security issues found${NC}"
    exit 0
fi
```

Make it executable:
```bash
chmod +x scripts/security-scan.sh
```

## Docker Integration

### Dockerfile for CI

```dockerfile
FROM node:18-alpine

# Install dependencies
RUN apk add --no-cache python3 py3-pip jq

# Install tools
RUN npm install -g @mcp-safeguard/cli
RUN pip3 install semgrep

# Set working directory
WORKDIR /workspace

# Default command
CMD ["mcp-safeguard", "scan", "."]
```

Build and use:
```bash
docker build -t mcp-safeguard-ci .
docker run -v $(pwd):/workspace mcp-safeguard-ci
```

## Best Practices

### 1. Fail Fast on Critical Issues

```bash
mcp-safeguard scan . --severity error || exit 1
```

### 2. Archive Reports

Always save scan results as artifacts for audit trails.

### 3. Scan on Multiple Events

- Push to main branches
- Pull requests
- Scheduled daily scans
- Manual triggers

### 4. Use SARIF Format

SARIF integrates with security dashboards in GitHub, GitLab, and Azure DevOps.

### 5. Set Appropriate Thresholds

```bash
# Fail only on high severity
mcp-safeguard scan . --severity error

# Generate reports for all findings
mcp-safeguard scan . --format json -o report.json
```

### 6. Scan Multiple Directories

For monorepos, scan each package:

```bash
for dir in packages/*; do
  mcp-safeguard scan "$dir" --format json -o "reports/$(basename $dir).json"
done
```

### 7. Add to Pre-commit Hooks

```bash
# .git/hooks/pre-commit
#!/bin/bash
mcp-safeguard scan . --severity error || exit 1
```

### 8. Monitor Trends

Track risk scores over time to measure security improvements.

## Troubleshooting

### Semgrep Not Found

```bash
# Ensure Semgrep is installed
pip install semgrep

# Or use auto-installer
npx @mcp-safeguard/semgrep-installer
```

### Out of Memory

For large codebases:

```bash
# Increase Node.js memory
export NODE_OPTIONS="--max-old-space-size=4096"
```

### Slow Scans

Exclude unnecessary directories:

```bash
# Create .mcpignore
echo "node_modules/" > .mcpignore
echo "dist/" >> .mcpignore
echo "coverage/" >> .mcpignore
```

### False Positives

Create `.mcpignore` or adjust rules in configuration.

## Example CI Configurations

See example configurations in the repository:
- [GitHub Actions Example](../.github/workflows/mcp-security.yml)
- [GitLab CI Example](../examples/gitlab-ci.yml)
- [Jenkins Example](../examples/Jenkinsfile)
- [Azure DevOps Example](../examples/azure-pipelines.yml)

## Additional Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [GitLab CI Documentation](https://docs.gitlab.com/ee/ci/)
- [Jenkins Pipeline Documentation](https://www.jenkins.io/doc/book/pipeline/)
- [Azure Pipelines Documentation](https://docs.microsoft.com/en-us/azure/devops/pipelines/)
