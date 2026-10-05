/**
 * GSD-X Conservative Memory Extraction & Secret Redaction
 *
 * Extracts high-signal, reusable architectural and procedural knowledge
 * while strictly filtering out implementation noise and redacting sensitive data.
 */

import { MemoryAuthority, MemoryEntry, MemoryType } from './types';
import * as crypto from 'crypto';

/**
 * Patterns matching sensitive secrets, API keys, tokens, and credentials.
 */
const SECRET_PATTERNS: readonly RegExp[] = [
  // Generic API Keys / Tokens with prefix labels
  /(?:api[_-]?key|key|secret|token|password|passwd|pwd|auth[_-]?token|bearer)\s*[:=]\s*['"]?([a-zA-Z0-9_\-.~+/=]{8,})['"]?/gi,
  // Anthropic API Keys
  /sk-ant-[a-zA-Z0-9_\-]{20,}/g,
  // OpenAI API Keys
  /sk-[a-zA-Z0-9]{20,}/g,
  // Google API Keys
  /AIzaSy[a-zA-Z0-9_\-]{33}/g,
  // AWS Keys
  /(?:A3T[A-Z0-9]|AKIA|AGPA|AIDA|AROA|AIPA|ANPA|ANVA|ASIA)[A-Z0-9]{16}/g,
  // GitHub Tokens
  /gh[pousr]_[A-Za-z0-9_]{36,255}/g,
  // Slack Tokens
  /xox[baprs]-[0-9a-zA-Z]{10,48}/g,
  // Private Keys
  /-----BEGIN [A-Z ]+PRIVATE KEY-----[\s\S]*?-----END [A-Z ]+PRIVATE KEY-----/g,
  // JWT Tokens
  /eyJ[a-zA-Z0-9_-]{10,}\.eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}/g,
  // Basic Auth Credentials
  /https?:\/\/[a-zA-Z0-9_-]+:[a-zA-Z0-9_-]+@[a-zA-Z0-9.-]+/g,
];

/**
 * Redacts any detected secrets from text with `[REDACTED_SECRET]`.
 */
export function redactSecrets(text: string): { cleanText: string; secretsFound: number } {
  let cleanText = text;
  let secretsFound = 0;

  for (const pattern of SECRET_PATTERNS) {
    const matches = cleanText.match(pattern);
    if (matches) {
      secretsFound += matches.length;
      cleanText = cleanText.replace(pattern, (match) => {
        // If it was key=val, redact only the val if captured, or replace whole token
        if (match.includes('=') || match.includes(':')) {
          const parts = match.split(/[:=]/);
          return `${parts[0]}: [REDACTED_SECRET]`;
        }
        return '[REDACTED_SECRET]';
      });
    }
  }

  return { cleanText, secretsFound };
}

/**
 * Filters out low-value implementation noise.
 * Returns true if the sentence/fact represents reusable knowledge.
 */
export function isReusableKnowledge(statement: string): boolean {
  const trimmed = statement.trim();
  if (trimmed.length < 20 || trimmed.length > 600) {
    return false; // too short or too long
  }

  const lower = trimmed.toLowerCase();

  // Noise reject list: line edits, minor git commits, temporary files, mechanical steps
  const noiseMarkers = [
    'changed line',
    'modified line',
    'edited line',
    'fixed typo',
    'bumped version',
    'updated package.json',
    'npm install',
    'added test file',
    'renamed file',
    'console.log',
    'debugging print',
    'temporary fix',
    'work in progress',
    'wip',
    'todo:',
  ];

  for (const marker of noiseMarkers) {
    if (lower.includes(marker)) {
      return false;
    }
  }

  // Value indicators: architectural rationale, decisions, constraints, patterns
  const valueMarkers = [
    'because',
    'rationale',
    'decision',
    'pattern',
    'architecture',
    'convention',
    'must use',
    'requires',
    'dependency',
    'tradeoff',
    'chosen over',
    'root cause',
    'solution',
    'protocol',
    'schema',
    'invariant',
    'contract',
  ];

  return valueMarkers.some((marker) => lower.includes(marker));
}

export interface ExtractionInput {
  text: string;
  source: string;
  projectId?: string;
  phaseId?: string;
  defaultType?: MemoryType;
  defaultAuthority?: MemoryAuthority;
}

/**
 * Extracts candidate memories from a Markdown document (e.g. SUMMARY.md, RESEARCH.md, VERIFICATION.md).
 */
export function extractMemoriesFromDocument(input: ExtractionInput): MemoryEntry[] {
  const { cleanText } = redactSecrets(input.text);
  const lines = cleanText.split('\n');
  const memories: MemoryEntry[] = [];

  let currentSection = '';
  let inKeyDecisions = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Track Markdown headings
    if (line.startsWith('#')) {
      currentSection = line.replace(/^#+\s*/, '').toLowerCase();
      inKeyDecisions =
        currentSection.includes('decision') ||
        currentSection.includes('learning') ||
        currentSection.includes('key takeaways') ||
        currentSection.includes('architecture') ||
        currentSection.includes('conclusions');
      continue;
    }

    // Bullet points or numbered items
    if (/^[-*+]\s+|^[0-9]+\.\s+/.test(line)) {
      const itemText = line.replace(/^[-*+]\s+|^[0-9]+\.\s+/, '').trim();

      // If we are in an explicit key decision / learnings section, or it matches reusable knowledge criteria
      if (inKeyDecisions || isReusableKnowledge(itemText)) {
        let type: MemoryType = input.defaultType || 'experience';
        let authority: MemoryAuthority = input.defaultAuthority || 'learned';

        if (currentSection.includes('decision')) {
          type = 'decision';
          authority = 'verified';
        } else if (currentSection.includes('architecture')) {
          type = 'architecture';
          authority = 'authoritative';
        } else if (currentSection.includes('convention')) {
          type = 'convention';
          authority = 'verified';
        } else if (currentSection.includes('bug') || currentSection.includes('root cause')) {
          type = 'bug';
          authority = 'verified';
        }

        const id = `mem-${crypto.randomBytes(6).toString('hex')}`;
        const now = new Date().toISOString();

        memories.push({
          id,
          content: itemText,
          type,
          scope: input.phaseId ? 'phase' : input.projectId ? 'project' : 'global',
          projectId: input.projectId,
          phaseId: input.phaseId,
          source: input.source,
          authority,
          importance: inKeyDecisions ? 0.8 : 0.6,
          confidence: 0.85,
          createdAt: now,
          updatedAt: now,
          retrievalCount: 0,
          tags: [type, currentSection].filter(Boolean),
        });
      }
    }
  }

  return memories;
}
