/**
 * GSD-X Memory Store Abstraction & JSONL File Implementation
 *
 * Provides a resilient, local-first store implementation with persistence
 * and export/import support.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  MemoryAuthority,
  MemoryConfig,
  MemoryEntry,
  MemoryQuery,
  MemoryResult,
  MemoryScope,
  MemoryStats,
  MemoryStore,
  MemoryType,
} from './types';
import { filterCandidates, scoreMemoryCandidate } from './search';
import { rerankCandidates } from './rerank';
import { calculateEffectiveImportance, isMemoryStale } from './decay';
import { EmbeddingProvider, LocalHashEmbeddingProvider } from './embeddings';

export abstract class AbstractMemoryStore implements MemoryStore {
  protected embedder: EmbeddingProvider;

  constructor(embedder?: EmbeddingProvider) {
    this.embedder = embedder ?? new LocalHashEmbeddingProvider();
  }

  abstract initialize(): Promise<void>;
  abstract add(memory: MemoryEntry): Promise<string>;
  abstract addMany(memories: MemoryEntry[]): Promise<string[]>;
  abstract search(query: MemoryQuery): Promise<MemoryResult[]>;
  abstract get(id: string): Promise<MemoryEntry | null>;
  abstract update(id: string, patch: Partial<MemoryEntry>): Promise<void>;
  abstract delete(id: string): Promise<void>;
  abstract stats(projectId?: string): Promise<MemoryStats>;
  abstract clear(scope?: MemoryScope, projectId?: string): Promise<void>;
  public async close(): Promise<void> {}
}

/**
 * High-performance JSONL File Memory Store.
 * Used as primary lightweight store or seamless fallback if LanceDB native bindings are unavailable.
 */
export class JsonMemoryStore extends AbstractMemoryStore {
  private projectDir: string;
  private globalDir: string;
  private projectFile: string;
  private globalFile: string;
  private entries: Map<string, MemoryEntry> = new Map();
  private initialized = false;

  constructor(projectDir: string, globalDir?: string, embedder?: EmbeddingProvider) {
    super(embedder);
    this.projectDir = path.resolve(projectDir);
    this.globalDir = globalDir ? path.resolve(globalDir) : path.join(os.homedir(), '.gsd-x', 'memory');
    this.projectFile = path.join(this.projectDir, '.gsd', 'memory', 'store.jsonl');
    this.globalFile = path.join(this.globalDir, 'store.jsonl');
  }

  public async initialize(): Promise<void> {
    if (this.initialized) return;

    fs.mkdirSync(path.dirname(this.projectFile), { recursive: true });
    fs.mkdirSync(path.dirname(this.globalFile), { recursive: true });

    await this.loadFromFile(this.globalFile);
    await this.loadFromFile(this.projectFile);

    this.initialized = true;
  }

  private async loadFromFile(filePath: string): Promise<void> {
    if (!fs.existsSync(filePath)) return;

    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        try {
          const entry = JSON.parse(trimmed) as MemoryEntry;
          this.entries.set(entry.id, entry);
        } catch {
          // ignore corrupted line
        }
      }
    } catch {
      // ignore read error
    }
  }

  private async persist(): Promise<void> {
    const projectEntries: MemoryEntry[] = [];
    const globalEntries: MemoryEntry[] = [];

    for (const entry of this.entries.values()) {
      if (entry.scope === 'global') {
        globalEntries.push(entry);
      } else {
        projectEntries.push(entry);
      }
    }

    fs.mkdirSync(path.dirname(this.projectFile), { recursive: true });
    fs.writeFileSync(
      this.projectFile,
      projectEntries.map((e) => JSON.stringify(e)).join('\n') + (projectEntries.length > 0 ? '\n' : ''),
      'utf-8'
    );

    fs.mkdirSync(path.dirname(this.globalFile), { recursive: true });
    fs.writeFileSync(
      this.globalFile,
      globalEntries.map((e) => JSON.stringify(e)).join('\n') + (globalEntries.length > 0 ? '\n' : ''),
      'utf-8'
    );
  }

  public async add(memory: MemoryEntry): Promise<string> {
    await this.initialize();
    if (!memory.embedding || memory.embedding.length === 0) {
      memory.embedding = await this.embedder.embed(memory.content);
    }
    this.entries.set(memory.id, memory);
    await this.persist();
    return memory.id;
  }

  public async addMany(memories: MemoryEntry[]): Promise<string[]> {
    await this.initialize();
    const ids: string[] = [];
    for (const memory of memories) {
      if (!memory.embedding || memory.embedding.length === 0) {
        memory.embedding = await this.embedder.embed(memory.content);
      }
      this.entries.set(memory.id, memory);
      ids.push(memory.id);
    }
    await this.persist();
    return ids;
  }

  public async search(query: MemoryQuery): Promise<MemoryResult[]> {
    await this.initialize();
    const all = Array.from(this.entries.values());
    const filtered = filterCandidates(all, query);

    const queryEmbedding = query.text ? await this.embedder.embed(query.text) : undefined;
    const scored: MemoryResult[] = [];

    for (const entry of filtered) {
      // Check decay
      const effectiveImportance = calculateEffectiveImportance(entry);
      const entryCopy = { ...entry, importance: effectiveImportance };

      const result = scoreMemoryCandidate(entryCopy, query, queryEmbedding);
      scored.push(result);
    }

    const reranked = rerankCandidates(scored, {
      topK: query.limit ?? 10,
      minScore: query.minScore ?? 0.2,
    });

    // Update retrieval stats for top hits
    const now = new Date().toISOString();
    for (const r of reranked) {
      const original = this.entries.get(r.memory.id);
      if (original) {
        original.retrievalCount = (original.retrievalCount || 0) + 1;
        original.lastRetrievedAt = now;
      }
    }
    await this.persist();

    return reranked;
  }

  public async get(id: string): Promise<MemoryEntry | null> {
    await this.initialize();
    const entry = this.entries.get(id);
    return entry ? { ...entry } : null;
  }

  public async update(id: string, patch: Partial<MemoryEntry>): Promise<void> {
    await this.initialize();
    const existing = this.entries.get(id);
    if (!existing) {
      throw new Error(`Memory entry not found: ${id}`);
    }

    const updated: MemoryEntry = {
      ...existing,
      ...patch,
      updatedAt: new Date().toISOString(),
    };

    if (patch.content && patch.content !== existing.content) {
      updated.embedding = await this.embedder.embed(patch.content);
    }

    this.entries.set(id, updated);
    await this.persist();
  }

  public async delete(id: string): Promise<void> {
    await this.initialize();
    this.entries.delete(id);
    await this.persist();
  }

  public async stats(projectId?: string): Promise<MemoryStats> {
    await this.initialize();
    let projectCount = 0;
    let globalCount = 0;
    let phaseCount = 0;
    let totalRetrievals = 0;
    let staleCount = 0;

    const byType: Record<MemoryType, number> = {
      decision: 0,
      pattern: 0,
      solution: 0,
      bug: 0,
      architecture: 0,
      convention: 0,
      research: 0,
      constraint: 0,
      preference: 0,
      experience: 0,
    };

    const byAuthority: Record<MemoryAuthority, number> = {
      authoritative: 0,
      verified: 0,
      'high-confidence': 0,
      learned: 0,
      inferred: 0,
      experimental: 0,
    };

    const targetEntries = Array.from(this.entries.values()).filter((e) => {
      if (!projectId) return true;
      return e.scope === 'global' || e.projectId === projectId;
    });

    for (const e of targetEntries) {
      if (e.scope === 'global') globalCount++;
      else if (e.scope === 'project') projectCount++;
      else if (e.scope === 'phase') phaseCount++;

      if (e.type in byType) byType[e.type]++;
      if (e.authority in byAuthority) byAuthority[e.authority]++;

      totalRetrievals += e.retrievalCount || 0;
      if (isMemoryStale(e)) staleCount++;
    }

    return {
      totalCount: targetEntries.length,
      projectCount,
      globalCount,
      phaseCount,
      byType,
      byAuthority,
      averageRetrievalCount: targetEntries.length > 0 ? totalRetrievals / targetEntries.length : 0,
      staleCount,
    };
  }

  public async clear(scope?: MemoryScope, projectId?: string): Promise<void> {
    await this.initialize();
    if (!scope && !projectId) {
      this.entries.clear();
    } else {
      for (const [id, entry] of this.entries.entries()) {
        if (scope && entry.scope !== scope) continue;
        if (projectId && entry.projectId !== projectId) continue;
        this.entries.delete(id);
      }
    }
    await this.persist();
  }

  public async exportToFile(exportPath: string): Promise<number> {
    await this.initialize();
    const cleanEntries = Array.from(this.entries.values()).map((e) => {
      // Export without raw embedding vectors for compact, portable JSONL
      const { embedding, ...rest } = e;
      return rest;
    });

    fs.mkdirSync(path.dirname(exportPath), { recursive: true });
    fs.writeFileSync(exportPath, cleanEntries.map((e) => JSON.stringify(e)).join('\n') + '\n', 'utf-8');
    return cleanEntries.length;
  }

  public async importFromFile(importPath: string): Promise<number> {
    await this.initialize();
    if (!fs.existsSync(importPath)) {
      throw new Error(`Export file not found: ${importPath}`);
    }

    const content = fs.readFileSync(importPath, 'utf-8');
    const lines = content.split('\n');
    let imported = 0;

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        const raw = JSON.parse(trimmed) as MemoryEntry;
        if (raw.id && raw.content) {
          raw.embedding = await this.embedder.embed(raw.content);
          this.entries.set(raw.id, raw);
          imported++;
        }
      } catch {
        // ignore malformed
      }
    }

    await this.persist();
    return imported;
  }
}
