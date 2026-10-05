/**
 * GSD-X Memory Scope Management
 *
 * Implements hierarchy and relevance weights across global, project, and phase scopes.
 */

import { MemoryScope } from './types';

export const MEMORY_SCOPES: readonly MemoryScope[] = ['phase', 'project', 'global'] as const;

export function isValidScope(scope: unknown): scope is MemoryScope {
  return typeof scope === 'string' && (scope === 'global' || scope === 'project' || scope === 'phase');
}

/**
 * Returns the scope priority multiplier.
 * Phase-specific memory has highest priority, followed by project, then global.
 */
export function getScopePriorityMultiplier(scope: MemoryScope): number {
  switch (scope) {
    case 'phase':
      return 1.25;
    case 'project':
      return 1.10;
    case 'global':
      return 0.85;
    default:
      return 1.0;
  }
}

/**
 * Checks if a memory matches the given project and phase context.
 */
export function matchesScope(
  scope: MemoryScope,
  entryProjectId?: string,
  entryPhaseId?: string,
  targetProjectId?: string,
  targetPhaseId?: string
): boolean {
  if (scope === 'global') {
    return true;
  }

  if (scope === 'project') {
    if (!targetProjectId || !entryProjectId) return true;
    return entryProjectId === targetProjectId;
  }

  if (scope === 'phase') {
    if (!targetProjectId || !entryProjectId) return true;
    if (entryProjectId !== targetProjectId) return false;
    if (!targetPhaseId || !entryPhaseId) return true;
    return entryPhaseId === targetPhaseId;
  }

  return false;
}
