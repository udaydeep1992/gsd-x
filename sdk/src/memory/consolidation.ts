/**
 * GSD-X Memory Consolidation
 *
 * Identifies clusters of duplicate/overlapping memories and consolidates them
 * into authoritative, concise canonical entries while preserving source provenance.
 */

import { MemoryEntry } from './types';
import { cosineSimilarity } from './embeddings';
import * as crypto from 'crypto';

export interface ConsolidationResult {
  consolidated: MemoryEntry[];
  supersededIds: string[];
}

/**
 * Groups memories into clusters of high semantic similarity (> 0.85).
 */
export function clusterSimilarMemories(
  memories: readonly MemoryEntry[],
  similarityThreshold = 0.85
): MemoryEntry[][] {
  const visited = new Set<string>();
  const clusters: MemoryEntry[][] = [];

  for (let i = 0; i < memories.length; i++) {
    const entryA = memories[i];
    if (visited.has(entryA.id)) continue;

    const cluster: MemoryEntry[] = [entryA];
    visited.add(entryA.id);

    for (let j = i + 1; j < memories.length; j++) {
      const entryB = memories[j];
      if (visited.has(entryB.id)) continue;

      // Must share scope and type to consolidate
      if (entryA.scope !== entryB.scope || entryA.type !== entryB.type) {
        continue;
      }

      let isSimilar = false;
      if (entryA.embedding && entryB.embedding && entryA.embedding.length > 0) {
        const sim = cosineSimilarity(entryA.embedding, entryB.embedding);
        if (sim >= similarityThreshold) {
          isSimilar = true;
        }
      }

      // Check concept overlap as complementary check
      const stopWords = new Set(['the', 'and', 'for', 'with', 'that', 'this', 'from', 'into', 'have', 'all', 'main']);
      const wordsA = new Set(entryA.content.toLowerCase().split(/\s+/).filter((w) => w.length > 2 && !stopWords.has(w)));
      const wordsB = new Set(entryB.content.toLowerCase().split(/\s+/).filter((w) => w.length > 2 && !stopWords.has(w)));
      let shared = 0;
      for (const w of wordsB) {
        if (wordsA.has(w)) shared++;
      }
      const overlap = wordsA.size > 0 && wordsB.size > 0 ? shared / Math.min(wordsA.size, wordsB.size) : 0;
      if (overlap >= 0.4) {
        isSimilar = true;
      }

      if (isSimilar) {
        cluster.push(entryB);
        visited.add(entryB.id);
      }
    }

    clusters.push(cluster);
  }

  return clusters;
}

/**
 * Consolidates a cluster of similar memories into a single canonical entry.
 */
export function consolidateCluster(cluster: readonly MemoryEntry[]): MemoryEntry {
  if (cluster.length === 1) {
    return { ...cluster[0] };
  }

  // Find the entry with highest authority, or highest importance/retrievalCount
  let bestEntry = cluster[0];
  const allTags = new Set<string>();
  const allSources = new Set<string>();
  let totalRetrievals = 0;

  for (const entry of cluster) {
    if (entry.importance > bestEntry.importance) {
      bestEntry = entry;
    }
    entry.tags.forEach((t) => allTags.add(t));
    if (entry.source) allSources.add(entry.source);
    totalRetrievals += entry.retrievalCount;
  }

  const consolidatedId = `mem-c-${crypto.randomBytes(4).toString('hex')}`;
  const now = new Date().toISOString();

  return {
    id: consolidatedId,
    content: bestEntry.content,
    type: bestEntry.type,
    scope: bestEntry.scope,
    projectId: bestEntry.projectId,
    phaseId: bestEntry.phaseId,
    authority: bestEntry.authority,
    source: Array.from(allSources).join('; ') || bestEntry.source,
    importance: Math.min(1.0, bestEntry.importance + 0.05 * (cluster.length - 1)),
    confidence: Math.min(1.0, bestEntry.confidence + 0.02 * (cluster.length - 1)),
    createdAt: bestEntry.createdAt,
    updatedAt: now,
    retrievalCount: totalRetrievals,
    tags: Array.from(allTags),
    supersedes: cluster
      .map((e) => e.id)
      .filter((id) => id !== consolidatedId)
      .join(','),
    embedding: bestEntry.embedding ? [...bestEntry.embedding] : undefined,
    metadata: {
      consolidatedFromCount: cluster.length,
      originalIds: cluster.map((e) => e.id),
    },
  };
}

/**
 * Runs consolidation over a list of memories.
 */
export function consolidateMemories(
  memories: readonly MemoryEntry[],
  similarityThreshold = 0.85
): ConsolidationResult {
  const clusters = clusterSimilarMemories(memories, similarityThreshold);
  const consolidated: MemoryEntry[] = [];
  const supersededIds: string[] = [];

  for (const cluster of clusters) {
    if (cluster.length > 1) {
      const canonical = consolidateCluster(cluster);
      consolidated.push(canonical);
      for (const m of cluster) {
        supersededIds.push(m.id);
      }
    } else {
      consolidated.push(cluster[0]);
    }
  }

  return { consolidated, supersededIds };
}
