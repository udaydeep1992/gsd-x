/**
 * GSD-X Context Manifest & Observability
 *
 * Generates transparent JSON manifests and diagnostic summaries explaining
 * context compilation, token budgeting, deduplication, and omissions.
 */

import { ContextManifest, ContextItem, ContextOmission, CodeContext } from './types';
import { MemoryResult } from '../memory/types';
import { estimateTokenCount } from '../memory/rerank';

export interface BuildManifestInput {
  task: string;
  taskCategory: string;
  budget: number;
  items: readonly ContextItem[];
  memories: readonly MemoryResult[];
  code: readonly CodeContext[];
  omitted: readonly ContextOmission[];
  deduplicatedCount: number;
  deduplicatedTokensSaved: number;
}

export function buildContextManifest(input: BuildManifestInput): ContextManifest {
  const sources = input.items.map((item) => ({
    path: item.sourcePath,
    reason: item.reason,
    priority: item.priority,
    tokens: item.estimatedTokens,
  }));

  const memories = input.memories.map((m) => ({
    id: m.memory.id,
    reason: m.reason || `Score: ${(m.score * 100).toFixed(0)}%`,
    authority: m.memory.authority,
    tokens: estimateTokenCount(m.memory.content),
  }));

  const code = input.code.map((c) => ({
    filePath: c.filePath,
    symbol: c.symbol,
    tokens: c.estimatedTokens,
  }));

  let estimatedTokens = 0;
  sources.forEach((s) => (estimatedTokens += s.tokens));
  memories.forEach((m) => (estimatedTokens += m.tokens));
  code.forEach((c) => (estimatedTokens += c.tokens));

  return {
    task: input.task,
    taskCategory: input.taskCategory,
    budget: input.budget,
    estimatedTokens,
    sources,
    memories,
    code,
    omitted: [...input.omitted],
    deduplicatedCount: input.deduplicatedCount,
    deduplicatedTokensSaved: input.deduplicatedTokensSaved,
    compiledAt: new Date().toISOString(),
  };
}

/**
 * Formats a user-readable diagnostic report for /gsd-context-stats.
 */
export function formatContextStats(manifest: ContextManifest): string {
  let planningTokens = 0;
  manifest.sources.forEach((s) => (planningTokens += s.tokens));

  let memoryTokens = 0;
  manifest.memories.forEach((m) => (memoryTokens += m.tokens));

  let codeTokens = 0;
  manifest.code.forEach((c) => (codeTokens += c.tokens));

  const lines = [
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    ` GSD-X ► CONTEXT COMPILER OBSERVABILITY`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `Task:              ${manifest.task.slice(0, 60)}`,
    `Complexity:        ${manifest.taskCategory}`,
    `Context Budget:    ${manifest.budget.toLocaleString()} tokens`,
    `Estimated Context: ${manifest.estimatedTokens.toLocaleString()} tokens (${((manifest.estimatedTokens / Math.max(1, manifest.budget)) * 100).toFixed(1)}% of budget)`,
    ``,
    `── Breakdown by Source ──────────────────────────────`,
    `Planning context:  ${planningTokens.toLocaleString()} tokens (${manifest.sources.length} sources)`,
    `Memory context:    ${memoryTokens.toLocaleString()} tokens (${manifest.memories.length} memories)`,
    `Code context:      ${codeTokens.toLocaleString()} tokens (${manifest.code.length} symbol extracts)`,
    ``,
    `── Optimization Impact ──────────────────────────────`,
    `Deduplicated:      ${manifest.deduplicatedTokensSaved.toLocaleString()} tokens saved (${manifest.deduplicatedCount} redundant facts collapsed)`,
    `Omitted:           ${manifest.omitted.length} documents filtered for low relevance`,
    `Memory Used:       ${manifest.memories.length} entries`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
  ];

  return lines.join('\n');
}
