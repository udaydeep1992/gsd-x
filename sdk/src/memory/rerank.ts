/**
 * GSD-X Memory Reranking and Budget Trimming
 */

import { MemoryResult } from './types';
import { cosineSimilarity } from './embeddings';

export interface RerankOptions {
  topK?: number;
  maxTokens?: number;
  similarityThreshold?: number; // threshold to consider two memories duplicate (e.g. 0.88)
  minScore?: number;
}

/**
 * Estimates token count from text using standard chars/4 heuristic.
 */
export function estimateTokenCount(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}

/**
 * Reranks scored candidates:
 * 1. Filters below minScore
 * 2. Sorts by score descending
 * 3. Removes near-duplicate memories (diversity check)
 * 4. Trims to fit within maxTokens budget and topK count
 */
export function rerankCandidates(
  candidates: MemoryResult[],
  options: RerankOptions = {}
): MemoryResult[] {
  const topK = options.topK ?? 8;
  const maxTokens = options.maxTokens ?? 3500;
  const similarityThreshold = options.similarityThreshold ?? 0.88;
  const minScore = options.minScore ?? 0.25;

  // 1. Filter by minimum score
  const validCandidates = candidates.filter((c) => c.score >= minScore);

  // 2. Sort descending by score
  validCandidates.sort((a, b) => b.score - a.score);

  // 3. Deduplicate semantically similar candidates
  const selected: MemoryResult[] = [];
  let totalTokens = 0;

  for (const candidate of validCandidates) {
    if (selected.length >= topK) break;

    const candidateTokens = estimateTokenCount(candidate.memory.content);
    if (totalTokens + candidateTokens > maxTokens && selected.length > 0) {
      // Over budget
      continue;
    }

    // Check similarity against already selected memories
    let isDuplicate = false;
    for (const existing of selected) {
      if (
        candidate.memory.embedding &&
        existing.memory.embedding &&
        candidate.memory.embedding.length > 0
      ) {
        const sim = cosineSimilarity(candidate.memory.embedding, existing.memory.embedding);
        if (sim >= similarityThreshold) {
          isDuplicate = true;
          break;
        }
      } else {
        // Fallback exact text or high overlap
        if (
          candidate.memory.content.toLowerCase().trim() ===
          existing.memory.content.toLowerCase().trim()
        ) {
          isDuplicate = true;
          break;
        }
      }
    }

    if (!isDuplicate) {
      selected.push(candidate);
      totalTokens += candidateTokens;
    }
  }

  return selected;
}
