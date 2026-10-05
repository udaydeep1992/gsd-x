/**
 * GSD-X Memory Decay Algorithm
 *
 * Implements graceful temporal decay for ephemeral experience memories
 * while protecting authoritative architecture, decision, and constraint facts.
 */

import { MemoryEntry, MemoryType } from './types';

// Types exempt from temporal decay
export const PROTECTED_MEMORY_TYPES: readonly MemoryType[] = [
  'architecture',
  'decision',
  'constraint',
  'convention',
] as const;

export interface DecayOptions {
  halfLifeDays?: number; // default: 30 days
  now?: number; // epoch ms
  minImportanceFloor?: number; // default: 0.1
}

/**
 * Calculates effective importance after applying temporal decay.
 */
export function calculateEffectiveImportance(
  entry: MemoryEntry,
  options: DecayOptions = {}
): number {
  // Authoritative & verified architecture/decisions never decay
  if (
    PROTECTED_MEMORY_TYPES.includes(entry.type) ||
    entry.authority === 'authoritative' ||
    entry.authority === 'verified'
  ) {
    return entry.importance;
  }

  const halfLifeDays = options.halfLifeDays ?? 30;
  const now = options.now ?? Date.now();
  const floor = options.minImportanceFloor ?? 0.1;

  // Use lastRetrievedAt if available, otherwise updatedAt or createdAt
  const referenceDateStr = entry.lastRetrievedAt || entry.updatedAt || entry.createdAt;
  const referenceTime = new Date(referenceDateStr).getTime();
  const ageDays = Math.max(0, (now - referenceTime) / (1000 * 60 * 60 * 24));

  // Decay factor = 0.5 ^ (ageDays / halfLifeDays)
  const decayFactor = Math.pow(0.5, ageDays / halfLifeDays);

  // Boost slightly if frequently retrieved
  const retrievalBoost = Math.min(0.25, Math.log10(1 + (entry.retrievalCount || 0)) * 0.1);

  const decayedImportance = entry.importance * decayFactor + retrievalBoost;
  return Math.max(floor, Math.min(1.0, decayedImportance));
}

/**
 * Checks if a memory is considered stale (candidate for consolidation or archival, never deletion for protected types).
 */
export function isMemoryStale(entry: MemoryEntry, options: DecayOptions = {}): boolean {
  if (
    PROTECTED_MEMORY_TYPES.includes(entry.type) ||
    entry.authority === 'authoritative' ||
    entry.authority === 'verified'
  ) {
    return false;
  }

  const effectiveImportance = calculateEffectiveImportance(entry, options);
  return effectiveImportance <= (options.minImportanceFloor ?? 0.1) * 1.5;
}
