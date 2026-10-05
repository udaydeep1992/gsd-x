/**
 * GSD-X Multi-Factor Memory Search and Scoring Engine
 */

import {
  MemoryEntry,
  MemoryQuery,
  MemoryResult,
  ScoringFactors,
  ScoringWeights,
  DEFAULT_SCORING_WEIGHTS,
} from './types';
import { getAuthorityWeight } from './authority';
import { matchesScope, getScopePriorityMultiplier } from './scope';
import { cosineSimilarity } from './embeddings';

/**
 * Computes multi-factor score for a candidate memory entry against a query.
 */
export function scoreMemoryCandidate(
  entry: MemoryEntry,
  query: MemoryQuery,
  queryEmbedding?: number[],
  weights: ScoringWeights = DEFAULT_SCORING_WEIGHTS
): MemoryResult {
  // 1. Semantic similarity
  let semanticSimilarity = 0.5; // fallback neutral score
  if (queryEmbedding && entry.embedding && entry.embedding.length > 0) {
    const rawSim = cosineSimilarity(queryEmbedding, entry.embedding);
    // Normalize cosine similarity from [-1, 1] to [0, 1]
    semanticSimilarity = Math.max(0, (rawSim + 1) / 2);
  } else {
    // Keyword overlap fallback
    const queryWords = new Set(query.text.toLowerCase().split(/\s+/).filter((w) => w.length > 2));
    const entryWords = entry.content.toLowerCase().split(/\s+/);
    if (queryWords.size > 0 && entryWords.length > 0) {
      let matches = 0;
      for (const w of entryWords) {
        if (queryWords.has(w)) matches++;
      }
      semanticSimilarity = Math.min(1.0, matches / Math.max(queryWords.size, 5));
    }
  }

  // 2. Project relevance
  let projectRelevance = 0.5;
  if (entry.scope === 'project' && query.projectId) {
    projectRelevance = entry.projectId === query.projectId ? 1.0 : 0.0;
  } else if (entry.scope === 'global') {
    projectRelevance = 0.6; // Global memory is useful but lower than exact project match
  }

  // 3. Phase relevance
  let phaseRelevance = 0.5;
  if (entry.scope === 'phase' && query.phaseId) {
    phaseRelevance = entry.phaseId === query.phaseId ? 1.0 : 0.0;
  } else if (entry.scope === 'project') {
    phaseRelevance = 0.8;
  }

  // 4. Task relevance (tag and keyword matching)
  let taskRelevance = 0.5;
  if (query.tags && query.tags.length > 0) {
    const tagMatches = entry.tags.filter((t) => query.tags?.includes(t)).length;
    taskRelevance = Math.min(1.0, tagMatches / query.tags.length);
  } else {
    taskRelevance = semanticSimilarity;
  }

  // 5. Importance & Confidence
  const importance = Math.max(0, Math.min(1, entry.importance));
  const confidence = Math.max(0, Math.min(1, entry.confidence));

  // 6. Recency (exponential decay based on age in days)
  const now = Date.now();
  const createdTime = new Date(entry.createdAt).getTime();
  const ageDays = Math.max(0, (now - createdTime) / (1000 * 60 * 60 * 24));
  // Half-life of 30 days for recency factor
  const recency = Math.exp(-ageDays / 30);

  // 7. Authority
  const authority = getAuthorityWeight(entry.authority);

  // 8. Retrieval frequency (log scale boost)
  const frequency = Math.min(1.0, Math.log10(1 + (entry.retrievalCount || 0)) / 2);

  const factors: ScoringFactors = {
    semanticSimilarity,
    projectRelevance,
    phaseRelevance,
    taskRelevance,
    importance,
    confidence,
    recency,
    authority,
    frequency,
  };

  // Weighted sum
  let score =
    factors.semanticSimilarity * weights.semanticSimilarity +
    factors.projectRelevance * weights.projectRelevance +
    factors.phaseRelevance * weights.phaseRelevance +
    factors.taskRelevance * weights.taskRelevance +
    factors.importance * weights.importance +
    factors.confidence * weights.confidence +
    factors.recency * weights.recency +
    factors.authority * weights.authority;

  // Apply scope multiplier
  score *= getScopePriorityMultiplier(entry.scope);

  return {
    memory: entry,
    score: Math.max(0, Math.min(1.0, score)),
    factors,
    reason: `Multi-factor score: ${(score * 100).toFixed(1)}% (similarity: ${(semanticSimilarity * 100).toFixed(0)}%, authority: ${entry.authority}, scope: ${entry.scope})`,
  };
}

/**
 * Filters candidates based on query criteria (scope, types, authorities, tags).
 */
export function filterCandidates(entries: readonly MemoryEntry[], query: MemoryQuery): MemoryEntry[] {
  return entries.filter((entry) => {
    // Scope filter
    if (query.scope) {
      const allowedScopes = Array.isArray(query.scope) ? query.scope : [query.scope];
      if (!allowedScopes.includes(entry.scope)) return false;
    }

    if (!matchesScope(entry.scope, entry.projectId, entry.phaseId, query.projectId, query.phaseId)) {
      if (entry.scope !== 'global' || query.includeGlobal === false) {
        return false;
      }
    }

    // Type filter
    if (query.types && query.types.length > 0) {
      if (!query.types.includes(entry.type)) return false;
    }

    // Authority filter
    if (query.authorities && query.authorities.length > 0) {
      if (!query.authorities.includes(entry.authority)) return false;
    }

    // Tag filter
    if (query.tags && query.tags.length > 0) {
      const hasTag = entry.tags.some((t) => query.tags?.includes(t));
      if (!hasTag) return false;
    }

    return true;
  });
}
