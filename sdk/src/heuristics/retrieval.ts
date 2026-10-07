/**
 * GSD-X Heuristics Retrieval Engine
 *
 * Retrieves high-confidence, contextually relevant engineering heuristics for a given task.
 * Enforces strict token budgeting and produces formatted prompt injections.
 */

import { GlobalHeuristicsStore } from './store';
import { HeuristicQuery, HeuristicRetrievalResult } from './types';
import { HeuristicConfidenceModel } from './confidence';

export class HeuristicsRetriever {
  private store: GlobalHeuristicsStore;

  constructor(store?: GlobalHeuristicsStore) {
    this.store = store || new GlobalHeuristicsStore();
  }

  public async retrieve(query: HeuristicQuery): Promise<HeuristicRetrievalResult[]> {
    const all = await this.store.getAll();
    const taskWords = this.tokenize(query.task.toLowerCase());
    const minConfidence = query.minConfidence ?? 0.40;
    const maxTokens = query.maxTokens ?? 400;
    const limit = query.limit ?? 3;

    const scored: HeuristicRetrievalResult[] = [];

    for (const h of all) {
      if (!HeuristicConfidenceModel.isAdmissible(h.confidence, minConfidence)) {
        continue;
      }

      if (query.category && h.category !== query.category) {
        continue;
      }

      // Relevance Scoring
      let relevance = 0;

      // 1. Language matching
      if (query.language && h.language) {
        if (h.language.toLowerCase() === query.language.toLowerCase()) {
          relevance += 0.4;
        } else if (h.language === 'generic') {
          relevance += 0.15;
        } else {
          // Different specific language -> skip unless query didn't specify language
          continue;
        }
      }

      // 2. Framework matching
      if (query.framework && h.framework) {
        if (h.framework.toLowerCase() === query.framework.toLowerCase()) {
          relevance += 0.3;
        }
      }

      // 3. Keyword overlap across title, triggerCondition, and recommendation
      const hText = `${h.title} ${h.triggerCondition} ${h.recommendation} ${h.framework || ''}`.toLowerCase();
      let matchedWords = 0;
      for (const w of taskWords) {
        if (w.length > 2 && hText.includes(w)) {
          matchedWords++;
        }
      }

      if (taskWords.length > 0) {
        relevance += Math.min(0.5, (matchedWords / Math.min(taskWords.length, 6)) * 0.5);
      }

      if (relevance > 0.15) {
        const finalScore = Math.round(relevance * h.confidence * 100) / 100;
        const textToFormat = `${h.title}: ${h.recommendation}`;
        const estimatedTokens = Math.ceil(textToFormat.length / 4);

        scored.push({
          heuristic: h,
          relevanceScore: Math.round(relevance * 100) / 100,
          finalScore,
          estimatedTokens,
        });
      }
    }

    // Sort by finalScore descending
    scored.sort((a, b) => b.finalScore - a.finalScore);

    // Apply budget and limit
    const results: HeuristicRetrievalResult[] = [];
    let accumulatedTokens = 0;

    for (const item of scored) {
      if (results.length >= limit) break;
      if (accumulatedTokens + item.estimatedTokens > maxTokens) continue;

      results.push(item);
      accumulatedTokens += item.estimatedTokens;
    }

    return results;
  }

  /**
   * Formats retrieved heuristics into a safe, non-executable markdown block for agent context.
   */
  public formatForPrompt(results: HeuristicRetrievalResult[]): string {
    if (results.length === 0) return '';

    const lines: string[] = [];
    lines.push('<cross-project-engineering-heuristics>');
    lines.push('<!-- Verified, generalized architectural patterns from past projects. Informational only. -->');

    for (const r of results) {
      const h = r.heuristic;
      lines.push(`- **[${h.category.toUpperCase()}${h.language ? `:${h.language}` : ''}] ${h.title}** (Confidence: ${(h.confidence * 100).toFixed(0)}%, Corroborated in ${h.sourceProjectsCount} projects)`);
      lines.push(`  • Rule: ${h.recommendation}`);
      if (h.antiPattern) {
        lines.push(`  • Anti-pattern: ${h.antiPattern}`);
      }
    }

    lines.push('</cross-project-engineering-heuristics>');
    return lines.join('\n');
  }

  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 2);
  }
}
