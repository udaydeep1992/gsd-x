/**
 * GSD-X Memory Authority Hierarchy
 *
 * Enforces strict precedence:
 * authoritative > verified > high-confidence > learned > inferred > experimental
 */

import { MemoryAuthority } from './types';

export const AUTHORITY_LEVELS: Record<MemoryAuthority, number> = {
  authoritative: 6,
  verified: 5,
  'high-confidence': 4,
  learned: 3,
  inferred: 2,
  experimental: 1,
};

export function getAuthorityWeight(authority?: MemoryAuthority): number {
  if (!authority || !AUTHORITY_LEVELS[authority]) {
    return AUTHORITY_LEVELS['learned'] / 6.0;
  }
  return AUTHORITY_LEVELS[authority] / 6.0;
}

export function compareAuthority(a: MemoryAuthority, b: MemoryAuthority): number {
  return AUTHORITY_LEVELS[b] - AUTHORITY_LEVELS[a];
}

export function isHigherAuthority(a: MemoryAuthority, b: MemoryAuthority): boolean {
  return AUTHORITY_LEVELS[a] > AUTHORITY_LEVELS[b];
}

export interface ConflictResolution {
  winnerId: string;
  loserId: string;
  reason: string;
}

/**
 * Resolves a conflict between two memories claiming contrary facts.
 * The memory with higher authority wins; on tie, more recent or higher confidence wins.
 */
export function resolveMemoryConflict(
  entryA: { id: string; authority: MemoryAuthority; confidence: number; updatedAt: string },
  entryB: { id: string; authority: MemoryAuthority; confidence: number; updatedAt: string }
): ConflictResolution {
  const diff = compareAuthority(entryA.authority, entryB.authority);
  if (diff < 0) {
    return {
      winnerId: entryA.id,
      loserId: entryB.id,
      reason: `Authority ${entryA.authority} outranks ${entryB.authority}`,
    };
  } else if (diff > 0) {
    return {
      winnerId: entryB.id,
      loserId: entryA.id,
      reason: `Authority ${entryB.authority} outranks ${entryA.authority}`,
    };
  }

  // Tie on authority level: check confidence
  if (entryA.confidence !== entryB.confidence) {
    const winner = entryA.confidence > entryB.confidence ? entryA : entryB;
    const loser = entryA.confidence > entryB.confidence ? entryB : entryA;
    return {
      winnerId: winner.id,
      loserId: loser.id,
      reason: `Confidence ${winner.confidence} exceeds ${loser.confidence} at authority ${winner.authority}`,
    };
  }

  // Tie on confidence: more recent update wins
  const timeA = new Date(entryA.updatedAt).getTime();
  const timeB = new Date(entryB.updatedAt).getTime();
  const winner = timeA >= timeB ? entryA : entryB;
  const loser = timeA >= timeB ? entryB : entryA;
  return {
    winnerId: winner.id,
    loserId: loser.id,
    reason: `Recent timestamp ${winner.updatedAt} preferred at equal authority and confidence`,
  };
}
