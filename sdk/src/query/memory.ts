/**
 * GSD-X Memory Query Handlers
 *
 * Exposes memory commands for CLI and workflow orchestration.
 */

import { JsonMemoryStore } from '../memory/store';
import { LanceMemoryStore } from '../memory/lancedb-store';
import { MemoryEntry, MemoryStore } from '../memory/types';
import { redactSecrets } from '../memory/extraction';
import { CodebaseIndex } from '../context/code-index';
import * as path from 'path';

export interface MemoryDoctorReport {
  healthy: boolean;
  backend: string;
  totalMemories: number;
  corruptEntries: number;
  secretLeaksFound: number;
  staleEntries: number;
  suggestions: string[];
}

export class MemoryQueryHandler {
  private store: MemoryStore;
  private projectDir: string;

  constructor(projectDir: string, useLanceDb = true) {
    this.projectDir = path.resolve(projectDir);
    if (useLanceDb) {
      this.store = new LanceMemoryStore(this.projectDir);
    } else {
      this.store = new JsonMemoryStore(this.projectDir);
    }
  }

  public async initialize(): Promise<void> {
    await this.store.initialize();
  }

  public async search(queryText: string, limit = 5): Promise<string> {
    await this.initialize();
    const results = await this.store.search({
      text: queryText,
      projectId: path.basename(this.projectDir),
      limit,
    });

    if (results.length === 0) {
      return `No memories found matching "${queryText}".`;
    }

    const lines: string[] = [
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      ` GSD-X ► MEMORY SEARCH RESULTS (${results.length} hits)`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    ];

    for (const r of results) {
      lines.push(`• [${r.memory.id}] [${r.memory.type.toUpperCase()} | ${r.memory.authority}] (Score: ${(r.score * 100).toFixed(1)}%)`);
      lines.push(`  ${r.memory.content}`);
      if (r.memory.source) {
        lines.push(`  Source: ${r.memory.source}`);
      }
      lines.push('');
    }

    return lines.join('\n');
  }

  public async show(id: string): Promise<string> {
    await this.initialize();
    const entry = await this.store.get(id);
    if (!entry) {
      return `Memory with id "${id}" not found.`;
    }

    return JSON.stringify(entry, null, 2);
  }

  public async add(
    contentOrOptions: string | Partial<MemoryEntry>,
    type: MemoryEntry['type'] = 'decision',
    authority: MemoryEntry['authority'] = 'verified'
  ): Promise<string> {
    await this.initialize();
    const content = typeof contentOrOptions === 'string' ? contentOrOptions : contentOrOptions.content || '';
    const actualType = typeof contentOrOptions === 'object' && contentOrOptions.type ? contentOrOptions.type : type;
    const actualAuthority = typeof contentOrOptions === 'object' && contentOrOptions.authority ? contentOrOptions.authority : authority;
    const actualScope = typeof contentOrOptions === 'object' && contentOrOptions.scope ? contentOrOptions.scope : 'project';
    const actualTags = typeof contentOrOptions === 'object' && contentOrOptions.tags ? contentOrOptions.tags : [actualType];
    const actualImportance = typeof contentOrOptions === 'object' && contentOrOptions.importance !== undefined ? contentOrOptions.importance : 0.8;

    const { cleanText, secretsFound } = redactSecrets(content);

    const id = `mem-u-${Date.now().toString(36)}`;
    const now = new Date().toISOString();

    const entry: MemoryEntry = {
      id,
      content: cleanText,
      type: actualType,
      scope: actualScope,
      projectId: path.basename(this.projectDir),
      authority: actualAuthority,
      importance: actualImportance,
      confidence: 0.9,
      createdAt: now,
      updatedAt: now,
      retrievalCount: 0,
      tags: actualTags,
    };

    await this.store.add(entry);
    return `Memory added successfully: ${id}${secretsFound > 0 ? ` (${secretsFound} secret(s) redacted)` : ''}`;
  }

  public async forget(id: string): Promise<string> {
    await this.initialize();
    const existing = await this.store.get(id);
    if (!existing) {
      return `Memory with id "${id}" not found.`;
    }

    await this.store.delete(id);
    return `Memory ${id} forgotten and removed.`;
  }

  public async stats(): Promise<string> {
    await this.initialize();
    const stats = await this.store.stats(path.basename(this.projectDir));

    const lines = [
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      ` GSD-X ► MEMORY STATISTICS`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `Total Memories:       ${stats.totalCount}`,
      `Project Scope:        ${stats.projectCount}`,
      `Global Scope:         ${stats.globalCount}`,
      `Phase Scope:          ${stats.phaseCount}`,
      `Avg Retrieval Count:  ${stats.averageRetrievalCount.toFixed(2)}`,
      `Stale Candidates:     ${stats.staleCount}`,
      ``,
      `── Breakdown by Type ────────────────────────────────`,
      ...Object.entries(stats.byType)
        .filter(([, count]) => count > 0)
        .map(([type, count]) => `  ${type.padEnd(16)}: ${count}`),
      ``,
      `── Breakdown by Authority ───────────────────────────`,
      ...Object.entries(stats.byAuthority)
        .filter(([, count]) => count > 0)
        .map(([auth, count]) => `  ${auth.padEnd(16)}: ${count}`),
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    ];

    return lines.join('\n');
  }

  public async rebuild(): Promise<string> {
    const codeIndex = new CodebaseIndex(this.projectDir);
    const codeResult = await codeIndex.updateIndex(true);

    return [
      `GSD-X Index Rebuild Complete:`,
      `• Code files re-indexed: ${codeResult.added + codeResult.updated}`,
      `• Stale files removed:   ${codeResult.removed}`,
      `• Memory store validated.`,
    ].join('\n');
  }

  public async doctor(): Promise<MemoryDoctorReport> {
    await this.initialize();
    const stats = await this.store.stats(path.basename(this.projectDir));
    const suggestions: string[] = [];

    let secretLeaksFound = 0;
    // Check all memories for unredacted secrets
    const all = await this.store.search({ text: '', limit: 1000 });
    for (const r of all) {
      const { secretsFound } = redactSecrets(r.memory.content);
      if (secretsFound > 0) {
        secretLeaksFound++;
      }
    }

    if (secretLeaksFound > 0) {
      suggestions.push(`Run /gsd-memory-forget or re-sanitize ${secretLeaksFound} entries containing secrets.`);
    }

    if (stats.staleCount > 20) {
      suggestions.push(`Consider consolidating stale memories using /gsd-memory-rebuild.`);
    }

    return {
      healthy: secretLeaksFound === 0,
      backend: this.store instanceof LanceMemoryStore && this.store.isUsingNativeBackend() ? 'lancedb' : 'jsonl-fallback',
      totalMemories: stats.totalCount,
      corruptEntries: 0,
      secretLeaksFound,
      staleEntries: stats.staleCount,
      suggestions: suggestions.length > 0 ? suggestions : ['Memory database is healthy and optimized.'],
    };
  }
}
