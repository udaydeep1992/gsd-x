/**
 * GSD-X Semantic Deduplication Engine
 *
 * Identifies and collapses semantically redundant facts across multiple documents,
 * preserving authoritative phrasing and source citations.
 */

import { ContextItem } from './types';
import { estimateTokenCount } from '../memory/rerank';

export interface DeduplicationFact {
  canonicalText: string;
  sources: string[];
  tokensSaved: number;
}

export interface DeduplicationResult {
  deduplicatedItems: ContextItem[];
  factsExtracted: DeduplicationFact[];
  totalTokensSaved: number;
}

/**
 * Normalizes a sentence for similarity comparison.
 */
function normalizeFact(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter((w) => w.length > 2)
    .sort()
    .join(' ');
}

/**
 * Computes Jaccard word similarity between two sentences.
 */
function sentenceSimilarity(a: string, b: string): number {
  const wordsA = new Set(a.toLowerCase().split(/\s+/).filter((w) => w.length > 2));
  const wordsB = new Set(b.toLowerCase().split(/\s+/).filter((w) => w.length > 2));

  if (wordsA.size === 0 || wordsB.size === 0) return 0;

  let intersection = 0;
  for (const w of wordsA) {
    if (wordsB.has(w)) intersection++;
  }

  const union = new Set([...wordsA, ...wordsB]).size;
  return intersection / union;
}

/**
 * Deduplicates facts across context items.
 */
export function deduplicateContextItems(items: readonly ContextItem[]): DeduplicationResult {
  const seenFacts: Array<{ text: string; source: string; itemIndex: number; norm: string }> = [];
  const factsExtracted: DeduplicationFact[] = [];
  let totalTokensSaved = 0;

  const modifiedItems: ContextItem[] = items.map((item) => ({ ...item }));

  for (let i = 0; i < modifiedItems.length; i++) {
    const item = modifiedItems[i];
    // Split into sentences / bullet points
    const lines = item.content.split('\n');
    const survivingLines: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) {
        // Keep headings and structural lines
        survivingLines.push(line);
        continue;
      }

      // Extract statement
      const cleanStatement = trimmed.replace(/^[-*+]\s+|^[0-9]+\.\s+/, '');
      if (cleanStatement.length < 15) {
        survivingLines.push(line);
        continue;
      }

      const norm = normalizeFact(cleanStatement);

      // Check if semantically duplicate with an already seen fact
      let matchFound = false;
      for (const existing of seenFacts) {
        if (sentenceSimilarity(norm, existing.norm) > 0.75) {
          // Redundant fact found!
          matchFound = true;
          const tokens = estimateTokenCount(line);
          totalTokensSaved += tokens;

          factsExtracted.push({
            canonicalText: existing.text,
            sources: [existing.source, item.sourcePath],
            tokensSaved: tokens,
          });
          break;
        }
      }

      if (!matchFound) {
        seenFacts.push({
          text: cleanStatement,
          source: item.sourcePath,
          itemIndex: i,
          norm,
        });
        survivingLines.push(line);
      }
    }

    const updatedContent = survivingLines.join('\n');
    item.content = updatedContent;
    item.estimatedTokens = estimateTokenCount(updatedContent);
  }

  return {
    deduplicatedItems: modifiedItems,
    factsExtracted,
    totalTokensSaved,
  };
}
