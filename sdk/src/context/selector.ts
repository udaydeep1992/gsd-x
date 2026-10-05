/**
 * GSD-X Task-Aware Context Selector
 *
 * Filters out unrelated documentation, extraneous modules, and stale research,
 * selecting only the high-value context required for the specific task.
 */

import { ContextItem, ContextOmission } from './types';

export interface SelectionResult {
  selected: ContextItem[];
  omitted: ContextOmission[];
}

export function extractTaskKeywords(task: string): string[] {
  const stopWords = new Set([
    'the', 'and', 'for', 'with', 'that', 'this', 'from', 'into', 'have',
    'has', 'are', 'was', 'were', 'will', 'should', 'could', 'would',
    'add', 'create', 'implement', 'update', 'fix', 'make', 'support',
  ]);

  return task
    .toLowerCase()
    .replace(/[^\w\s-]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !stopWords.has(w));
}

/**
 * Evaluates context items against task keywords and priorities.
 */
export function selectTaskContext(
  items: readonly ContextItem[],
  task: string,
  agentRole?: string
): SelectionResult {
  const keywords = extractTaskKeywords(task);
  const selected: ContextItem[] = [];
  const omitted: ContextOmission[] = [];

  for (const item of items) {
    // 1. Required items (active PLAN.md, STATE.md) are always preserved
    if (item.priority === 'required') {
      selected.push(item);
      continue;
    }

    const contentLower = item.content.toLowerCase();
    const pathLower = item.sourcePath.toLowerCase();

    // Check domain relevance
    let matchCount = 0;
    for (const kw of keywords) {
      if (pathLower.includes(kw) || contentLower.includes(kw)) {
        matchCount++;
      }
    }

    // Agent role specific boosts
    let roleRelevant = false;
    if (agentRole === 'gsd-verifier' && (pathLower.includes('test') || pathLower.includes('verification'))) {
      roleRelevant = true;
    } else if (agentRole === 'gsd-planner' && (pathLower.includes('roadmap') || pathLower.includes('requirements'))) {
      roleRelevant = true;
    } else if (item.category === 'convention') {
      // Conventions are generally important for implementers
      roleRelevant = true;
    }

    if (matchCount > 0 || roleRelevant) {
      selected.push(item);
    } else {
      omitted.push({
        source: item.sourcePath,
        reason: `Low relevance to task "${task.slice(0, 40)}..." (no keyword matches in ${item.sourcePath})`,
        priority: item.priority,
        estimatedTokens: item.estimatedTokens,
      });
    }
  }

  return { selected, omitted };
}
