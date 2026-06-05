import { ScanResult, OutputFormat, Finding } from './types.js';
import { RiskScorer } from './scorer.js';
import * as fs from 'fs';
import * as path from 'path';

export class Reporter {
  private scorer: RiskScorer;

  constructor() {
    this.scorer = new RiskScorer();
  }

  format(result: ScanResult, format: OutputFormat = 'text', baseline?: ScanResult): string {
    switch (format) {
      case 'json':
        return this.formatJson(result);
      case 'sarif':
        return this.formatSarif(result);
      case 'html':
        return this.generateHtml(result, baseline);
      case 'text':
      default:
        return this.formatText(result);
    }
  }

  private generateHtml(result: ScanResult, baseline?: ScanResult): string {
    const riskLevel = this.scorer.getRiskLevel(result.summary.riskScore);
    const baselineComparison = baseline ? this.compareWithBaseline(result, baseline) : null;

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MCP-Safeguard Security Report</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github-dark.min.css">
  <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js"></script>
  <style>
    :root {
      --bg-primary: #ffffff;
      --bg-secondary: #f9fafb;
      --text-primary: #111827;
      --text-secondary: #6b7280;
      --border-color: #e5e7eb;
    }

    [data-theme="dark"] {
      --bg-primary: #1f2937;
      --bg-secondary: #111827;
      --text-primary: #f9fafb;
      --text-secondary: #9ca3af;
      --border-color: #374151;
    }

    body {
      background-color: var(--bg-secondary);
      color: var(--text-primary);
      transition: background-color 0.3s, color 0.3s;
    }

    .card {
      background-color: var(--bg-primary);
      border: 1px solid var(--border-color);
      transition: all 0.3s;
    }

    .risk-gauge {
      width: 200px;
      height: 200px;
      position: relative;
    }

    .gauge-svg {
      transform: rotate(-90deg);
    }

    .severity-ERROR { border-left: 4px solid #ef4444; }
    .severity-WARNING { border-left: 4px solid #f59e0b; }
    .severity-INFO { border-left: 4px solid #3b82f6; }

    .code-context {
      font-family: 'Courier New', monospace;
      font-size: 0.875rem;
      line-height: 1.5;
      overflow-x: auto;
    }

    .line-highlight {
      background-color: rgba(239, 68, 68, 0.1);
      border-left: 3px solid #ef4444;
    }

    .collapsible-content {
      max-height: 0;
      overflow: hidden;
      transition: max-height 0.3s ease;
    }

    .collapsible-content.open {
      max-height: 1000px;
    }

    .trend-up { color: #ef4444; }
    .trend-down { color: #10b981; }
    .trend-neutral { color: #6b7280; }
  </style>
</head>
<body class="p-8">
  <div class="max-w-7xl mx-auto">
    <!-- Header -->
    <div class="flex justify-between items-center mb-8">
      <div>
        <h1 class="text-4xl font-bold mb-2">MCP-Safeguard Security Report</h1>
        <p class="text-gray-600 dark:text-gray-400">Target: ${this.escapeHtml(result.metadata.targetPath)}</p>
        <p class="text-sm text-gray-500">Scanned: ${result.metadata.timestamp} | Duration: ${result.metadata.duration}ms</p>
      </div>
      <button id="darkModeToggle" class="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600">
        🌙 Toggle Dark Mode
      </button>
    </div>

    <!-- Dashboard Section -->
    <div class="dashboard grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      <div class="card rounded-lg p-6 flex flex-col items-center">
        <h3 class="text-lg font-semibold mb-4">Risk Score</h3>
        <div class="risk-gauge" id="riskGauge">
          <svg class="gauge-svg w-full h-full" viewBox="0 0 200 200">
            <circle cx="100" cy="100" r="80" fill="none" stroke="#e5e7eb" stroke-width="20"/>
            <circle id="gaugeProgress" cx="100" cy="100" r="80" fill="none"
                    stroke="${this.getRiskColor(result.summary.riskScore)}"
                    stroke-width="20"
                    stroke-dasharray="${(result.summary.riskScore / 100) * 502.4} 502.4"
                    stroke-linecap="round"/>
          </svg>
          <div class="absolute inset-0 flex flex-col items-center justify-center">
            <div class="text-4xl font-bold">${result.summary.riskScore}</div>
            <div class="text-sm text-gray-600 dark:text-gray-400">${riskLevel}</div>
          </div>
        </div>
        ${baselineComparison ? `
          <div class="mt-4 text-sm ${baselineComparison.riskTrend > 0 ? 'trend-up' : baselineComparison.riskTrend < 0 ? 'trend-down' : 'trend-neutral'}">
            ${baselineComparison.riskTrend > 0 ? '↑' : baselineComparison.riskTrend < 0 ? '↓' : '→'}
            ${Math.abs(baselineComparison.riskTrend)} from baseline
          </div>
        ` : ''}
      </div>

      <div class="card rounded-lg p-6">
        <h3 class="text-lg font-semibold mb-4">Severity Distribution</h3>
        <canvas id="severityChart"></canvas>
        ${baselineComparison ? `
          <div class="mt-4 text-sm space-y-1">
            <div class="flex justify-between">
              <span>New Issues:</span>
              <span class="font-semibold text-red-500">${baselineComparison.newFindings}</span>
            </div>
            <div class="flex justify-between">
              <span>Fixed Issues:</span>
              <span class="font-semibold text-green-500">${baselineComparison.fixedFindings}</span>
            </div>
          </div>
        ` : ''}
      </div>

      <div class="card rounded-lg p-6">
        <h3 class="text-lg font-semibold mb-4">Category Breakdown</h3>
        <canvas id="categoryChart"></canvas>
      </div>
    </div>

    <!-- Filters and Controls -->
    <div class="card rounded-lg p-6 mb-6">
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label class="block text-sm font-medium mb-2">Search</label>
          <input type="text" id="searchInput" placeholder="Search findings..."
                 class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800">
        </div>
        <div>
          <label class="block text-sm font-medium mb-2">Severity</label>
          <select id="severityFilter" class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800">
            <option value="">All Severities</option>
            <option value="ERROR">Error</option>
            <option value="WARNING">Warning</option>
            <option value="INFO">Info</option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium mb-2">Category</label>
          <select id="categoryFilter" class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800">
            <option value="">All Categories</option>
            ${Object.keys(result.summary.byCategory).map(cat =>
              `<option value="${this.escapeHtml(cat)}">${this.escapeHtml(cat)}</option>`
            ).join('')}
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium mb-2">Sort By</label>
          <select id="sortBy" class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800">
            <option value="severity">Severity</option>
            <option value="file">File</option>
            <option value="line">Line Number</option>
            <option value="category">Category</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Findings Section -->
    <div class="mb-4 flex justify-between items-center">
      <h2 class="text-2xl font-bold">Findings (<span id="findingCount">${result.findings.length}</span>)</h2>
    </div>

    <div id="findingsContainer" class="space-y-4">
      ${result.findings.map(finding => this.generateFindingCard(finding)).join('')}
    </div>

    ${result.findings.length === 0 ? `
      <div class="card rounded-lg p-12 text-center">
        <div class="text-6xl mb-4">✅</div>
        <h3 class="text-2xl font-semibold mb-2">No Security Findings</h3>
        <p class="text-gray-600 dark:text-gray-400">Your code passed all security checks!</p>
      </div>
    ` : ''}
  </div>

  <script>
    // Chart data
    // safeJson() replaces the sequences that would end a <script> block.
    // JSON.stringify alone does not escape </script>, so without this a
    // finding whose message contains "</script>" could inject arbitrary HTML.
    const severityData = ${this.safeJsonEmbed(result.summary.bySeverity)};
    const categoryData = ${this.safeJsonEmbed(result.summary.byCategory)};
    const allFindings = ${this.safeJsonEmbed(result.findings)};

    // Initialize charts
    const severityCtx = document.getElementById('severityChart').getContext('2d');
    new Chart(severityCtx, {
      type: 'doughnut',
      data: {
        labels: ['Error', 'Warning', 'Info'],
        datasets: [{
          data: [severityData.ERROR, severityData.WARNING, severityData.INFO],
          backgroundColor: ['#ef4444', '#f59e0b', '#3b82f6']
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: { position: 'bottom' }
        }
      }
    });

    const categoryCtx = document.getElementById('categoryChart').getContext('2d');
    new Chart(categoryCtx, {
      type: 'bar',
      data: {
        labels: Object.keys(categoryData),
        datasets: [{
          label: 'Findings',
          data: Object.values(categoryData),
          backgroundColor: '#8b5cf6'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        indexAxis: 'y',
        plugins: {
          legend: { display: false }
        },
        scales: {
          x: { beginAtZero: true }
        }
      }
    });

    // Dark mode toggle
    const darkModeToggle = document.getElementById('darkModeToggle');
    const html = document.documentElement;

    darkModeToggle.addEventListener('click', () => {
      if (html.getAttribute('data-theme') === 'dark') {
        html.removeAttribute('data-theme');
      } else {
        html.setAttribute('data-theme', 'dark');
      }
    });

    // Collapsible sections
    document.querySelectorAll('.toggle-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const target = document.getElementById(e.target.dataset.target);
        target.classList.toggle('open');
        e.target.textContent = target.classList.contains('open') ? '▼' : '▶';
      });
    });

    // Copy fix button
    document.querySelectorAll('.copy-fix-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const text = e.target.dataset.fix;
        navigator.clipboard.writeText(text).then(() => {
          const originalText = e.target.textContent;
          e.target.textContent = '✓ Copied!';
          setTimeout(() => e.target.textContent = originalText, 2000);
        });
      });
    });

    // Filtering and sorting
    let filteredFindings = [...allFindings];

    function applyFilters() {
      const search = document.getElementById('searchInput').value.toLowerCase();
      const severity = document.getElementById('severityFilter').value;
      const category = document.getElementById('categoryFilter').value;
      const sortBy = document.getElementById('sortBy').value;

      filteredFindings = allFindings.filter(finding => {
        const matchesSearch = !search ||
          finding.message.toLowerCase().includes(search) ||
          finding.path.toLowerCase().includes(search) ||
          finding.check_id.toLowerCase().includes(search);
        const matchesSeverity = !severity || finding.severity === severity;
        const matchesCategory = !category || finding.category === category;
        return matchesSearch && matchesSeverity && matchesCategory;
      });

      // Sort findings
      filteredFindings.sort((a, b) => {
        switch(sortBy) {
          case 'severity':
            const severityOrder = { ERROR: 0, WARNING: 1, INFO: 2 };
            return severityOrder[a.severity] - severityOrder[b.severity];
          case 'file':
            return a.path.localeCompare(b.path);
          case 'line':
            return a.start.line - b.start.line;
          case 'category':
            return a.category.localeCompare(b.category);
          default:
            return 0;
        }
      });

      renderFindings();
    }

    function renderFindings() {
      const container = document.getElementById('findingsContainer');
      document.getElementById('findingCount').textContent = filteredFindings.length;

      if (filteredFindings.length === 0) {
        container.innerHTML = '<div class="card rounded-lg p-8 text-center text-gray-500">No findings match the current filters.</div>';
        return;
      }

      container.innerHTML = filteredFindings.map(finding => {
        const card = document.querySelector(\`[data-finding-id="\${finding.id}"]\`);
        return card ? card.outerHTML : '';
      }).join('');

      // Reattach event listeners
      document.querySelectorAll('.toggle-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const target = document.getElementById(e.target.dataset.target);
          target.classList.toggle('open');
          e.target.textContent = target.classList.contains('open') ? '▼' : '▶';
        });
      });

      document.querySelectorAll('.copy-fix-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const text = e.target.dataset.fix;
          navigator.clipboard.writeText(text).then(() => {
            const originalText = e.target.textContent;
            e.target.textContent = '✓ Copied!';
            setTimeout(() => e.target.textContent = originalText, 2000);
          });
        });
      });
    }

    document.getElementById('searchInput').addEventListener('input', applyFilters);
    document.getElementById('severityFilter').addEventListener('change', applyFilters);
    document.getElementById('categoryFilter').addEventListener('change', applyFilters);
    document.getElementById('sortBy').addEventListener('change', applyFilters);

    // Syntax highlighting
    document.querySelectorAll('pre code').forEach((block) => {
      hljs.highlightElement(block);
    });
  </script>
</body>
</html>`;
  }

  private generateFindingCard(finding: Finding): string {
    const codeContext = this.getCodeContext(finding);
    const fixSuggestion = this.getFixSuggestion(finding);
    const dangerExplanation = this.getDangerExplanation(finding);

    return `
    <div class="card rounded-lg p-6 severity-${finding.severity}" data-finding-id="${finding.id}">
      <div class="flex justify-between items-start mb-4">
        <div class="flex-1">
          <div class="flex items-center gap-2 mb-2">
            <span class="px-3 py-1 rounded-full text-xs font-semibold ${this.getSeverityClass(finding.severity)}">
              ${finding.severity}
            </span>
            <span class="text-sm text-gray-600 dark:text-gray-400">${this.escapeHtml(finding.category)}</span>
          </div>
          <h3 class="text-lg font-semibold mb-1">${this.escapeHtml(finding.check_id)}</h3>
          <p class="text-gray-700 dark:text-gray-300 mb-2">${this.escapeHtml(finding.message)}</p>
          <p class="text-sm text-gray-600 dark:text-gray-400">
            📄 ${this.escapeHtml(finding.path)}:${finding.start.line}:${finding.start.col}
          </p>
        </div>
      </div>

      ${dangerExplanation ? `
        <div class="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <h4 class="font-semibold text-red-800 dark:text-red-200 mb-2">⚠️ Why is this dangerous?</h4>
          <p class="text-sm text-red-700 dark:text-red-300">${dangerExplanation}</p>
        </div>
      ` : ''}

      <div class="mb-4">
        <h4 class="font-semibold mb-2 flex items-center gap-2">
          <span>Code Context</span>
          ${finding.metadata.confidence ? `<span class="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded">Confidence: ${finding.metadata.confidence}</span>` : ''}
        </h4>
        <div class="code-context bg-gray-900 rounded-lg p-4 overflow-x-auto">
          <pre><code class="language-${this.getLanguageFromPath(finding.path)}">${codeContext}</code></pre>
        </div>
      </div>

      ${fixSuggestion ? `
        <div class="mb-4">
          <button class="toggle-btn text-sm font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200"
                  data-target="fix-${finding.id}">
            ▶ Fix Suggestion
          </button>
          <div id="fix-${finding.id}" class="collapsible-content mt-2">
            <div class="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <div class="flex justify-between items-start mb-2">
                <h5 class="font-semibold text-green-800 dark:text-green-200">Recommended Fix:</h5>
                <button class="copy-fix-btn px-3 py-1 text-xs bg-green-600 hover:bg-green-700 text-white rounded"
                        data-fix="${this.escapeHtml(fixSuggestion)}">
                  📋 Copy Fix
                </button>
              </div>
              <pre class="text-sm text-green-700 dark:text-green-300 whitespace-pre-wrap">${this.escapeHtml(fixSuggestion)}</pre>
            </div>
          </div>
        </div>
      ` : ''}

      <div class="flex flex-wrap gap-2 text-sm">
        ${finding.metadata.cwe && finding.metadata.cwe.length > 0 ? `
          <div class="flex items-center gap-1">
            <span class="text-gray-600 dark:text-gray-400">CWE:</span>
            ${finding.metadata.cwe.map(cwe => `
              <a href="https://cwe.mitre.org/data/definitions/${cwe.replace('CWE-', '')}.html"
                 target="_blank"
                 class="px-2 py-1 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 rounded hover:bg-purple-200 dark:hover:bg-purple-800">
                ${this.escapeHtml(cwe)}
              </a>
            `).join('')}
          </div>
        ` : ''}
        ${finding.metadata.owasp && finding.metadata.owasp.length > 0 ? `
          <div class="flex items-center gap-1">
            <span class="text-gray-600 dark:text-gray-400">OWASP:</span>
            ${finding.metadata.owasp.map(owasp => `
              <span class="px-2 py-1 bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200 rounded">
                ${this.escapeHtml(owasp)}
              </span>
            `).join('')}
          </div>
        ` : ''}
        ${finding.metadata.impact ? `
          <span class="px-2 py-1 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded">
            Impact: ${finding.metadata.impact}
          </span>
        ` : ''}
        ${finding.metadata.likelihood ? `
          <span class="px-2 py-1 bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 rounded">
            Likelihood: ${finding.metadata.likelihood}
          </span>
        ` : ''}
      </div>

      ${finding.metadata.references && finding.metadata.references.length > 0 ? `
        <div class="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <h5 class="text-sm font-semibold mb-2">References:</h5>
          <ul class="text-sm space-y-1">
            ${finding.metadata.references.map(ref => `
              <li>
                <a href="${this.escapeHtml(ref)}" target="_blank"
                   class="text-blue-600 dark:text-blue-400 hover:underline">
                  🔗 ${this.escapeHtml(ref)}
                </a>
              </li>
            `).join('')}
          </ul>
        </div>
      ` : ''}
    </div>`;
  }

  private getCodeContext(finding: Finding): string {
    try {
      const lines = finding.extra.lines.split('\n');
      const startLine = finding.start.line;

      // Add line numbers and highlight the vulnerable line.
      // HTML-escape each code line so that source containing `<`, `>`, or `&`
      // renders as literal text rather than injected markup.
      return lines.map((line, idx) => {
        const lineNum = startLine + idx;
        const isVulnerable = lineNum === finding.start.line;
        const escapedLine = this.escapeHtml(line);
        return `${lineNum.toString().padStart(4, ' ')} ${isVulnerable ? '→' : ' '} ${escapedLine}`;
      }).join('\n');
    } catch (e) {
      return this.escapeHtml(finding.extra.lines) || 'Code context not available';
    }
  }

  private getFixSuggestion(finding: Finding): string {
    const suggestions: Record<string, string> = {
      'go-sql-injection': 'Use parameterized queries:\nrows, err := db.Query("SELECT * FROM users WHERE id = ?", userId)',
      'go-sql-injection-prepare': 'Use parameterized prepared statements:\nstmt, err := db.Prepare("SELECT * FROM users WHERE id = ?")\nrows, err := stmt.Query(userId)',
      'command-injection': 'Validate and sanitize input, or use safe alternatives that don\'t invoke shell',
      'path-traversal': 'Use filepath.Clean() and validate paths against allowed directories',
      'hardcoded-credentials': 'Use environment variables or a secrets management service',
      'insecure-random': 'Use crypto/rand for security-sensitive random number generation',
      'tls-skip-verify': 'Remove InsecureSkipVerify or properly configure TLS certificates',
    };

    for (const [key, suggestion] of Object.entries(suggestions)) {
      if (finding.check_id.includes(key)) {
        return suggestion;
      }
    }

    if (finding.metadata.references && finding.metadata.references.length > 0) {
      const description = finding.extra.metadata.subcategory?.join(', ') || '';
      return `Review the security best practices for ${description}. See references for detailed guidance.`;
    }

    return '';
  }

  private getDangerExplanation(finding: Finding): string {
    const explanations: Record<string, string> = {
      'sql-injection': 'Attackers can manipulate SQL queries to access, modify, or delete unauthorized data, potentially compromising the entire database.',
      'command-injection': 'Attackers can execute arbitrary system commands, leading to complete system compromise, data theft, or service disruption.',
      'path-traversal': 'Attackers can access files outside the intended directory, potentially exposing sensitive configuration files, credentials, or source code.',
      'hardcoded-credentials': 'Credentials in source code can be easily discovered by anyone with code access, leading to unauthorized system access.',
      'insecure-random': 'Predictable random numbers can be exploited to bypass security controls, guess tokens, or break cryptographic operations.',
      'tls-skip-verify': 'Disabling certificate verification allows man-in-the-middle attacks, exposing sensitive data during transmission.',
      'xxe': 'XML External Entity attacks can lead to file disclosure, server-side request forgery, or denial of service.',
      'deserialization': 'Unsafe deserialization can allow attackers to execute arbitrary code by crafting malicious serialized objects.',
    };

    for (const [key, explanation] of Object.entries(explanations)) {
      if (finding.check_id.toLowerCase().includes(key) ||
          finding.message.toLowerCase().includes(key) ||
          finding.category.toLowerCase().includes(key)) {
        return explanation;
      }
    }

    if (finding.metadata.impact === 'CRITICAL' || finding.severity === 'ERROR') {
      return `This ${finding.category} vulnerability has ${finding.metadata.impact || 'HIGH'} impact and should be addressed immediately to prevent security breaches.`;
    }

    return '';
  }

  private getLanguageFromPath(path: string): string {
    const ext = path.split('.').pop()?.toLowerCase();
    const langMap: Record<string, string> = {
      'go': 'go',
      'js': 'javascript',
      'ts': 'typescript',
      'py': 'python',
      'java': 'java',
      'rs': 'rust',
      'rb': 'ruby',
      'php': 'php',
      'cs': 'csharp',
      'cpp': 'cpp',
      'c': 'c',
      'yaml': 'yaml',
      'yml': 'yaml',
      'json': 'json',
      'xml': 'xml',
      'sh': 'bash',
    };
    return langMap[ext || ''] || 'plaintext';
  }

  private getSeverityClass(severity: string): string {
    const classes: Record<string, string> = {
      'ERROR': 'bg-red-500 text-white',
      'WARNING': 'bg-yellow-500 text-white',
      'INFO': 'bg-blue-500 text-white',
    };
    return classes[severity] || 'bg-gray-500 text-white';
  }

  private getRiskColor(score: number): string {
    if (score >= 80) return '#ef4444';
    if (score >= 50) return '#f59e0b';
    if (score >= 30) return '#eab308';
    return '#10b981';
  }

  /**
   * Safely embed a value as JSON inside a <script> block.
   *
   * Standard JSON.stringify does not escape `</script>`, `<!--`, or `-->`,
   * all of which the HTML parser interprets before the JS engine sees them.
   * Replacing `<` and `>` with their Unicode escapes produces valid JSON that
   * the JS engine will parse identically.
   */
  private safeJsonEmbed(value: unknown): string {
    return JSON.stringify(value)
      .replace(/</g, '\\u003c')
      .replace(/>/g, '\\u003e')
      .replace(/&/g, '\\u0026');
  }

  private escapeHtml(text: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
  }

  private compareWithBaseline(current: ScanResult, baseline: ScanResult): {
    newFindings: number;
    fixedFindings: number;
    riskTrend: number;
  } {
    const currentIds = new Set(current.findings.map(f => f.id));
    const baselineIds = new Set(baseline.findings.map(f => f.id));

    const newFindings = current.findings.filter(f => !baselineIds.has(f.id)).length;
    const fixedFindings = baseline.findings.filter(f => !currentIds.has(f.id)).length;
    const riskTrend = current.summary.riskScore - baseline.summary.riskScore;

    return { newFindings, fixedFindings, riskTrend };
  }

  private formatJson(result: ScanResult): string {
    return JSON.stringify(result, null, 2);
  }

  private formatText(result: ScanResult): string {
    const lines: string[] = [];
    const riskLevel = this.scorer.getRiskLevel(result.summary.riskScore);

    lines.push('='.repeat(80));
    lines.push('MCP-Safeguard Security Scan Report');
    lines.push('='.repeat(80));
    lines.push('');
    lines.push(`Target: ${result.metadata.targetPath}`);
    lines.push(`Scanned: ${result.metadata.timestamp}`);
    lines.push(`Duration: ${result.metadata.duration}ms`);
    lines.push('');
    lines.push(`Risk Score: ${result.summary.riskScore}/100 (${riskLevel})`);
    lines.push(`Total Findings: ${result.summary.total}`);
    lines.push('');
    lines.push('By Severity:');
    lines.push(`  ERROR:   ${result.summary.bySeverity.ERROR}`);
    lines.push(`  WARNING: ${result.summary.bySeverity.WARNING}`);
    lines.push(`  INFO:    ${result.summary.bySeverity.INFO}`);
    lines.push('');

    if (Object.keys(result.summary.byCategory).length > 0) {
      lines.push('By Category:');
      for (const [category, count] of Object.entries(result.summary.byCategory)) {
        lines.push(`  ${category}: ${count}`);
      }
      lines.push('');
    }

    if (result.findings.length > 0) {
      lines.push('Findings:');
      lines.push('-'.repeat(80));

      for (const finding of result.findings) {
        lines.push('');
        lines.push(`[${finding.severity}] ${finding.check_id}`);
        lines.push(`File: ${finding.path}:${finding.start.line}`);
        lines.push(`Category: ${finding.category}`);
        lines.push(`Message: ${finding.message}`);
        if (finding.metadata.cwe && finding.metadata.cwe.length > 0) {
          lines.push(`CWE: ${finding.metadata.cwe.join(', ')}`);
        }
        lines.push('-'.repeat(80));
      }
    } else {
      lines.push('No security findings detected.');
    }

    lines.push('');
    return lines.join('\n');
  }

  private formatSarif(result: ScanResult): string {
    const sarif = {
      version: '2.1.0',
      $schema: 'https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json',
      runs: [
        {
          tool: {
            driver: {
              name: 'MCP-Safeguard',
              version: result.metadata.version,
              informationUri: 'https://github.com/Li-Bailiang/mcp-safeguard',
              rules: this.extractRules(result)
            }
          },
          results: result.findings.map(finding => ({
            ruleId: finding.check_id,
            level: this.severityToSarifLevel(finding.severity),
            message: {
              text: finding.message
            },
            locations: [
              {
                physicalLocation: {
                  artifactLocation: {
                    uri: finding.path
                  },
                  region: {
                    startLine: finding.start.line,
                    startColumn: finding.start.col,
                    endLine: finding.end.line,
                    endColumn: finding.end.col
                  }
                }
              }
            ]
          }))
        }
      ]
    };

    return JSON.stringify(sarif, null, 2);
  }

  private extractRules(result: ScanResult): any[] {
    const rulesMap = new Map();

    for (const finding of result.findings) {
      if (!rulesMap.has(finding.check_id)) {
        rulesMap.set(finding.check_id, {
          id: finding.check_id,
          shortDescription: {
            text: finding.message
          },
          properties: {
            ...finding.metadata
          }
        });
      }
    }

    return Array.from(rulesMap.values());
  }

  private severityToSarifLevel(severity: string): string {
    switch (severity) {
      case 'ERROR':
        return 'error';
      case 'WARNING':
        return 'warning';
      case 'INFO':
        return 'note';
      default:
        return 'warning';
    }
  }
}
