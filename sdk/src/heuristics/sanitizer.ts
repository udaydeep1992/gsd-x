/**
 * GSD-X Privacy Guard & Heuristics Sanitizer
 *
 * Enforces strict multi-project boundary isolation.
 * Scrubs proprietary code snippets, paths, credentials, URLs, IPs,
 * database tables, and project identifiers before any heuristic
 * is admitted to the global cross-project store.
 */

import { SanitizationResult } from './types';

export class HeuristicSanitizer {
  // Regex patterns for secrets, credentials, and API keys
  private static readonly SECRET_PATTERNS: Array<{ name: string; pattern: RegExp }> = [
    { name: 'API Key', pattern: /(?:api[_-]?key|access[_-]?token|secret[_-]?key|auth[_-]?token|bearer)\s*[:=]\s*['"]?[a-zA-Z0-9_\-.~+/=]{16,}['"]?/gi },
    { name: 'Generic Hex Token', pattern: /\b[a-f0-9]{32,64}\b/gi },
    { name: 'Private Key Header', pattern: /-----BEGIN\s+[A-Z\s]+PRIVATE\s+KEY-----[\s\S]*?-----END\s+[A-Z\s]+PRIVATE\s+KEY-----/gi },
    { name: 'JWT Token', pattern: /\beyJ[a-zA-Z0-9_-]+\.eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\b/g },
    { name: 'Password / Secret Field', pattern: /(?:password|passwd|pwd|client_secret)\s*[:=]\s*['"]?[^\s'"]{6,}['"]?/gi },
  ];

  // Regex patterns for network addresses, URLs, and domains
  private static readonly NETWORK_PATTERNS: Array<{ name: string; pattern: RegExp }> = [
    { name: 'URL', pattern: /https?:\/\/[^\s'")]+/gi },
    { name: 'IPv4 Address', pattern: /\b(?:\d{1,3}\.){3}\d{1,3}(?::\d+)?\b/g },
    { name: 'Email Address', pattern: /\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/g },
  ];

  // Regex patterns for file system paths
  private static readonly PATH_PATTERNS: Array<{ name: string; pattern: RegExp }> = [
    { name: 'Windows Absolute Path', pattern: /\b[a-zA-Z]:\\[^\s"':;,>]+\b/gi },
    { name: 'Windows Drive Notation', pattern: /\b[a-zA-Z]:\/[^\s"':;,>]+\b/gi },
    { name: 'Unix Absolute Path', pattern: /(?:^|[\s"'])(\/(?:usr|home|etc|var|tmp|opt|root|Users)\/[^\s"':;,>]+)/gi },
    { name: 'Relative Project Path', pattern: /(?:^|[\s"'])(\.\.?\/[a-zA-Z0-9_.-]+(?:\/[a-zA-Z0-9_.-]+)+)/g },
  ];

  // Regex patterns for schema, table names, and user identifiers
  private static readonly IDENTIFIER_PATTERNS: Array<{ name: string; pattern: RegExp }> = [
    { name: 'SQL Table Ref', pattern: /(?:from|join|into|update)\s+`?[a-zA-Z0-9_]+\.`?[a-zA-Z0-9_]+`?/gi },
  ];

  /**
   * Sanitizes candidate text by scrubbing sensitive and project-specific entities.
   * If an unscrubbable high-risk token is detected, rejects the candidate completely.
   */
  public static sanitize(text: string, knownProjectNames: string[] = []): SanitizationResult {
    if (!text || typeof text !== 'string') {
      return {
        sanitizedText: '',
        redactedItemCount: 0,
        redactionTypes: [],
        isSafeForCrossProject: true,
      };
    }

    let sanitized = text;
    let redactedCount = 0;
    const redactionTypes = new Set<string>();

    // 1. Check for hard-blocking private keys
    for (const sec of this.SECRET_PATTERNS) {
      if (sec.pattern.test(sanitized)) {
        redactedCount++;
        redactionTypes.add(sec.name);
        sanitized = sanitized.replace(sec.pattern, '[REDACTED_SECRET]');
      }
    }

    // 2. Scrub network patterns (URLs, IPs, Emails)
    for (const net of this.NETWORK_PATTERNS) {
      if (net.pattern.test(sanitized)) {
        redactedCount++;
        redactionTypes.add(net.name);
        sanitized = sanitized.replace(net.pattern, '[REDACTED_ENDPOINT]');
      }
    }

    // 3. Scrub file paths
    for (const p of this.PATH_PATTERNS) {
      if (p.pattern.test(sanitized)) {
        redactedCount++;
        redactionTypes.add(p.name);
        sanitized = sanitized.replace(p.pattern, ' [PATH] ');
      }
    }

    // 4. Scrub SQL table / column references
    for (const idPattern of this.IDENTIFIER_PATTERNS) {
      if (idPattern.pattern.test(sanitized)) {
        redactedCount++;
        redactionTypes.add(idPattern.name);
        sanitized = sanitized.replace(idPattern.pattern, '[DATABASE_ENTITY]');
      }
    }

    // 5. Scrub known project identifiers
    for (const proj of knownProjectNames) {
      if (!proj || proj.length < 3) continue;
      const re = new RegExp(`\\b${escapeRegExp(proj)}\\b`, 'gi');
      if (re.test(sanitized)) {
        redactedCount++;
        redactionTypes.add('Project Identifier');
        sanitized = sanitized.replace(re, '[PROJECT_NAME]');
      }
    }

    // 6. Cleanup formatting
    sanitized = sanitized.replace(/\s{2,}/g, ' ').trim();

    // 7. Safety Validation
    if (redactionTypes.has('Private Key Header') || text.includes('PRIVATE KEY')) {
      return {
        sanitizedText: '',
        redactedItemCount: redactedCount,
        redactionTypes: Array.from(redactionTypes),
        isSafeForCrossProject: false,
        rejectionReason: 'Candidate contains raw cryptographic private key material.',
      };
    }

    // If sanitized text is too short, mark unsafe
    if (sanitized.length < 15) {
      return {
        sanitizedText: sanitized,
        redactedItemCount: redactedCount,
        redactionTypes: Array.from(redactionTypes),
        isSafeForCrossProject: false,
        rejectionReason: 'Sanitized text too short or uninformative.',
      };
    }

    return {
      sanitizedText: sanitized,
      redactedItemCount: redactedCount,
      redactionTypes: Array.from(redactionTypes),
      isSafeForCrossProject: true,
    };
  }

  /**
   * Evaluates whether a heuristic candidate is generalizable vs overly project-specific.
   */
  public static isGeneralizable(candidate: {
    title: string;
    triggerCondition: string;
    recommendation: string;
    rationale: string;
  }): { generalizable: boolean; reason?: string } {
    const combined = `${candidate.title} ${candidate.triggerCondition} ${candidate.recommendation} ${candidate.rationale}`.toLowerCase();

    // Project-specific file extensions or paths
    if (combined.includes('c:\\') || combined.includes('/home/') || combined.includes('.planning/')) {
      return { generalizable: false, reason: 'Contains unredacted specific filesystem path.' };
    }

    // Check for domain buzzwords that belong strictly inside a proprietary app
    const proprietaryKeywords = ['customer_id', 'stripe_key', 'auth0_client', 'aws_secret', 'db_password'];
    for (const kw of proprietaryKeywords) {
      if (combined.includes(kw)) {
        return { generalizable: false, reason: `Contains proprietary entity reference: ${kw}` };
      }
    }

    // Must have substantive recommendation
    if (candidate.recommendation.trim().split(/\s+/).length < 5) {
      return { generalizable: false, reason: 'Recommendation is too brief or vague.' };
    }

    return { generalizable: true };
  }
}

function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
