import { Finding, Severity } from './types.js';

export class RiskScorer {
  private severityWeights: Record<Severity, number> = {
    ERROR: 10,
    WARNING: 5,
    INFO: 1
  };

  private impactWeights: Record<string, number> = {
    HIGH: 3,
    MEDIUM: 2,
    LOW: 1
  };

  private likelihoodWeights: Record<string, number> = {
    HIGH: 3,
    MEDIUM: 2,
    LOW: 1
  };

  calculateScore(findings: Finding[]): number {
    if (findings.length === 0) return 0;

    let totalScore = 0;

    for (const finding of findings) {
      const severityScore = this.severityWeights[finding.severity] || 1;
      const impactScore = this.impactWeights[finding.metadata.impact?.toUpperCase()] || 1;
      const likelihoodScore = this.likelihoodWeights[finding.metadata.likelihood?.toUpperCase()] || 1;

      totalScore += severityScore * impactScore * likelihoodScore;
    }

    // Normalize to 0-100 scale
    const maxPossibleScore = findings.length * 10 * 3 * 3;
    return Math.min(100, Math.round((totalScore / maxPossibleScore) * 100));
  }

  getRiskLevel(score: number): string {
    if (score >= 75) return 'CRITICAL';
    if (score >= 50) return 'HIGH';
    if (score >= 25) return 'MEDIUM';
    return 'LOW';
  }
}
