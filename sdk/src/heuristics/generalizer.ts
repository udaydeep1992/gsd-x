/**
 * GSD-X Heuristics Generalizer
 *
 * Automatically extracts generalized engineering heuristics from completed phase
 * summaries, ADRs, post-mortems, and architectural decision records while stripping
 * project-specific semantics.
 */

import { HeuristicCandidate, HeuristicCategory } from './types';
import { HeuristicSanitizer } from './sanitizer';

export class HeuristicsGeneralizer {
  /**
   * Extracts candidate engineering heuristics from markdown text (e.g. SUMMARY.md, ADR, LEARNINGS.md).
   */
  public static extractFromText(
    markdownText: string,
    inferredLanguage?: string,
    knownProjectNames: string[] = []
  ): HeuristicCandidate[] {
    if (!markdownText || typeof markdownText !== 'string') return [];

    const candidates: HeuristicCandidate[] = [];
    const lines = markdownText.split('\n');

    let currentSection = '';
    let buffer: string[] = [];

    const flushBuffer = () => {
      if (buffer.length === 0) return;
      const block = buffer.join('\n').trim();
      buffer = [];

      const candidate = this.parseCandidateFromBlock(block, currentSection, inferredLanguage, knownProjectNames);
      if (candidate) {
        candidates.push(candidate);
      }
    };

    for (const line of lines) {
      if (line.startsWith('#')) {
        flushBuffer();
        currentSection = line.replace(/^#+\s*/, '').trim().toLowerCase();
      } else if (line.trim().startsWith('- ') || line.trim().startsWith('* ') || /^\d+\.\s/.test(line.trim())) {
        if (this.isHeuristicSection(currentSection)) {
          flushBuffer();
          buffer.push(line);
        }
      } else if (buffer.length > 0) {
        buffer.push(line);
      }
    }
    flushBuffer();

    return candidates;
  }

  private static isHeuristicSection(sectionTitle: string): boolean {
    const keywords = [
      'learning',
      'decision',
      'pattern',
      'gotcha',
      'pitfall',
      'architecture',
      'lesson',
      'takeaway',
      'guideline',
      'heuristic',
      'surprise',
    ];
    return keywords.some((kw) => sectionTitle.includes(kw));
  }

  private static parseCandidateFromBlock(
    block: string,
    section: string,
    inferredLanguage?: string,
    knownProjectNames: string[] = []
  ): HeuristicCandidate | null {
    const clean = block.replace(/^[-*0-9.]+\s*/, '').trim();
    if (clean.length < 30) return null;

    // Detect Category
    let category: HeuristicCategory = 'architecture';
    const lower = clean.toLowerCase();
    if (lower.startsWith('architecture') || lower.includes('architectur')) {
      category = 'architecture';
    } else if (lower.includes('deadlock') || lower.includes('crash') || lower.includes('leak') || lower.includes('race') || lower.includes('gotcha')) {
      category = 'reliability';
    } else if (lower.includes('performance') || lower.includes('slow') || lower.includes('latency') || lower.includes('throughput') || lower.includes('cache')) {
      category = 'performance';
    } else if (lower.includes('security') || lower.includes('token') || lower.includes('injection') || lower.includes('sanitize')) {
      category = 'security';
    } else if (lower.includes('quirk') || lower.includes('compiler') || lower.includes('lifetime') || lower.includes('type')) {
      category = 'language_quirk';
    }

    // Try splitting by colon (Title / Rule: Description / Rationale)
    let title = '';
    let recommendation = '';
    let rationale = '';

    if (clean.includes(':')) {
      const parts = clean.split(':');
      title = parts[0].trim();
      const body = parts.slice(1).join(':').trim();
      recommendation = body;
      rationale = `Derived from engineering observation: ${body}`;
    } else {
      title = clean.slice(0, 60).replace(/\.$/, '');
      recommendation = clean;
      rationale = `Established practice observed in development workflow.`;
    }

    // Sanitize
    const sanTitle = HeuristicSanitizer.sanitize(title, knownProjectNames);
    const sanRec = HeuristicSanitizer.sanitize(recommendation, knownProjectNames);
    const sanRat = HeuristicSanitizer.sanitize(rationale, knownProjectNames);

    if (!sanRec.isSafeForCrossProject) return null;

    return {
      title: sanTitle.sanitizedText,
      category,
      language: inferredLanguage || 'generic',
      triggerCondition: `When working with ${inferredLanguage || 'general systems'} concerning ${category}`,
      recommendation: sanRec.sanitizedText,
      rationale: sanRat.sanitizedText,
      rawSourceText: clean,
    };
  }
}
