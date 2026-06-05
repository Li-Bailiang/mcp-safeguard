import { ValidationResult } from './types.js';

/**
 * Prompt injection detection using heuristics
 */

// Known jailbreak and injection patterns
const INJECTION_PATTERNS = [
  /ignore\s+(?:(?:previous|all|above|prior)\s+)+(instructions|prompts)/i,
  /disregard\s+(?:(?:previous|all|above|prior)\s+)+(instructions|prompts)/i,
  /forget\s+(?:(?:previous|all|above|prior)\s+)+(instructions|prompts)/i,
  /new\s+instructions:/i,
  /system\s*:\s*ignore/i,
  /\[SYSTEM\]/i,
  /\<\|im_start\|\>/i,
  /\<\|im_end\|\>/i,
  /roleplay\s+as/i,
  /pretend\s+(you\s+are|to\s+be)/i,
  /act\s+as\s+(if|a)/i,
  /you\s+are\s+now/i,
  /from\s+now\s+on/i,
  /sudo\s+mode/i,
  /developer\s+mode/i,
  /jailbreak/i,
  /ADMIN_MODE/i,
  /OVERRIDE/i,
  /\\x[0-9a-f]{2}/i, // Hex encoding attempts
  /base64.*decode/i,
  /eval\s*\(/i,
  /execute\s+code/i,
];

// Suspicious command patterns
const COMMAND_PATTERNS = [
  /rm\s+-rf/i,
  /del\s+\/[sf]/i,
  /format\s+[c-z]:/i,
  /DROP\s+TABLE/i,
  /DELETE\s+FROM/i,
  /curl\s+.*\|\s*bash/i,
  /wget\s+.*\|\s*sh/i,
  /;.*rm/i,
  /&&.*rm/i,
  /\|\|.*rm/i,
];

export class PromptValidator {
  /**
   * Validate a prompt for injection attempts
   */
  validate(prompt: string): ValidationResult {
    const detectedPatterns: string[] = [];
    let maxConfidence = 0;

    // Check for injection patterns
    for (const pattern of INJECTION_PATTERNS) {
      if (pattern.test(prompt)) {
        detectedPatterns.push(pattern.source);
        maxConfidence = Math.max(maxConfidence, 0.8);
      }
    }

    // Check for dangerous command patterns
    for (const pattern of COMMAND_PATTERNS) {
      if (pattern.test(prompt)) {
        detectedPatterns.push(pattern.source);
        maxConfidence = Math.max(maxConfidence, 0.9);
      }
    }

    // Check for excessive special characters (potential obfuscation)
    const specialCharRatio = (prompt.match(/[^\w\s]/g) || []).length / prompt.length;
    if (specialCharRatio > 0.3) {
      detectedPatterns.push('high_special_char_ratio');
      maxConfidence = Math.max(maxConfidence, 0.6);
    }

    // Check for repeated escape sequences
    if (/(?:\\[nrt"'\\]){10,}/.test(prompt)) {
      detectedPatterns.push('excessive_escape_sequences');
      maxConfidence = Math.max(maxConfidence, 0.7);
    }

    // Check for base64-like patterns
    if (/[A-Za-z0-9+\/]{50,}={0,2}/.test(prompt)) {
      detectedPatterns.push('potential_base64_encoding');
      maxConfidence = Math.max(maxConfidence, 0.5);
    }

    const allowed = detectedPatterns.length === 0;

    return {
      allowed,
      reason: allowed ? undefined : 'Potential prompt injection detected',
      confidence: maxConfidence,
      detectedPatterns: detectedPatterns.length > 0 ? detectedPatterns : undefined,
    };
  }

  /**
   * Add custom pattern to detection
   */
  static addCustomPattern(pattern: RegExp): void {
    INJECTION_PATTERNS.push(pattern);
  }
}
