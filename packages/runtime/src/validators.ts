/**
 * Prompt injection detection and validation
 */

import { ValidationResult } from './types';

const INJECTION_PATTERNS = [
  // Direct instruction override attempts (one or more qualifier words)
  /ignore\s+(?:(?:previous|all|above|prior)\s+)+instructions?/i,
  /disregard\s+(?:(?:previous|all|above|prior)\s+)+instructions?/i,
  /forget\s+(?:(?:previous|all|above|prior)\s+)+instructions?/i,

  // System prompt / control token injection
  /\[SYSTEM\]/i,
  /<\|im_start\|>/i,
  /<\|im_end\|>/i,
  /override\s+(security|settings|system|safety|restrictions?)/i,

  // Jailbreak attempts
  /jailbreak/i,
  /you\s+are\s+now\s+in\s+developer\s+mode/i,
  /dan\s+mode/i,

  // Role manipulation
  /you\s+are\s+no\s+longer\s+(an?\s+)?AI/i,
  /pretend\s+you\s+are/i,
  /act\s+as\s+if/i,
  /from\s+now\s+on/i,

  // System prompt extraction
  /show\s+me\s+your\s+(system\s+)?prompt/i,
  /what\s+are\s+your\s+instructions/i,
  /repeat\s+your\s+instructions/i,
  /print\s+your\s+prompt/i,

  // Encoding/obfuscation attempts
  /base64/i,
  /rot13/i,
  /\\x[0-9a-f]{2}/i,

  // Privilege escalation
  /sudo/i,
  /run\s+as\s+admin/i,
  /with\s+elevated\s+privileges/i,
];

const HIGH_RISK_KEYWORDS = [
  'ignore',
  'override',
  'bypass',
  'disable',
  'jailbreak',
  'unrestricted',
  'unlimited',
  'root',
  'admin',
  'system prompt',
];

export class PromptValidator {
  /**
   * Validate a prompt for potential injection attempts
   */
  static validatePrompt(prompt: string): ValidationResult {
    const threats: string[] = [];

    // Check against known patterns
    for (const pattern of INJECTION_PATTERNS) {
      if (pattern.test(prompt)) {
        threats.push(`Matched injection pattern: ${pattern.source}`);
      }
    }

    // Check for high-risk keyword density
    const keywordCount = HIGH_RISK_KEYWORDS.filter(keyword =>
      prompt.toLowerCase().includes(keyword)
    ).length;

    if (keywordCount >= 3) {
      threats.push(`High density of risk keywords detected (${keywordCount})`);
    }

    // Check for suspicious repetition (common in injection attacks)
    const words = prompt.toLowerCase().split(/\s+/);
    const wordFreq = new Map<string, number>();
    for (const word of words) {
      if (word.length > 4) {
        wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
      }
    }

    for (const [word, count] of wordFreq.entries()) {
      if (count > 5) {
        threats.push(`Suspicious repetition detected: "${word}" appears ${count} times`);
      }
    }

    const valid = threats.length === 0;

    return {
      allowed: valid,
      valid,
      reason: valid ? undefined : 'Potential prompt injection detected',
      threats: threats.length > 0 ? threats : undefined,
    };
  }

  /**
   * Check if a specific string contains potential injection
   */
  static containsInjection(text: string): boolean {
    return !this.validatePrompt(text).valid;
  }
}
