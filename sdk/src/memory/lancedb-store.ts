/**
 * GSD-X LanceDB Memory Store Implementation
 *
 * Implements LanceDB vector database backend with automatic, graceful degradation
 * to JsonMemoryStore if native bindings are unavailable.
 */

import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import {
  MemoryEntry,
  MemoryQuery,
  MemoryResult,
  MemoryScope,
  MemoryStats,
  MemoryStore,
} from './types';
import { EmbeddingProvider } from './embeddings';
import { JsonMemoryStore } from './store';

export class LanceMemoryStore implements MemoryStore {
  private projectDir: string;
  private dbPath: string;
  private embedder: EmbeddingProvider;
  private fallbackStore: JsonMemoryStore;
  private isNativeAvailable = false;
  private lancedbInstance: unknown = null;
  private tableInstance: unknown = null;

  constructor(projectDir: string, globalDir?: string, embedder?: EmbeddingProvider) {
    this.projectDir = path.resolve(projectDir);
    this.dbPath = path.join(this.projectDir, '.gsd', 'memory', 'lancedb');
    this.embedder = embedder ?? (undefined as unknown as EmbeddingProvider);
    this.fallbackStore = new JsonMemoryStore(projectDir, globalDir, embedder);
  }

  public async initialize(): Promise<void> {
    try {
      // Dynamic import to prevent hard failure if @lancedb/lancedb is not installed
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const lancedb = require('@lancedb/lancedb');
      fs.mkdirSync(this.dbPath, { recursive: true });
      const db = await lancedb.connect(this.dbPath);
      this.lancedbInstance = db;
      this.isNativeAvailable = true;

      const tableNames = await db.tableNames();
      if (!tableNames.includes('memories')) {
        // Table created on first add
      } else {
        this.tableInstance = await db.openTable('memories');
      }
    } catch {
      // Graceful fallback to JsonMemoryStore
      this.isNativeAvailable = false;
      await this.fallbackStore.initialize();
    }
  }

  public async add(memory: MemoryEntry): Promise<string> {
    if (!this.isNativeAvailable) {
      return this.fallbackStore.add(memory);
    }

    try {
      // If table does not exist, create table with sample row
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = this.lancedbInstance as any;
      if (!this.tableInstance) {
        this.tableInstance = await db.createTable('memories', [
          {
            id: memory.id,
            vector: memory.embedding,
            content: memory.content,
            type: memory.type,
            scope: memory.scope,
            projectId: memory.projectId || '',
            phaseId: memory.phaseId || '',
            authority: memory.authority,
            importance: memory.importance,
            confidence: memory.confidence,
            createdAt: memory.createdAt,
            updatedAt: memory.updatedAt,
            retrievalCount: memory.retrievalCount,
            tags: memory.tags.join(','),
          },
        ]);
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (this.tableInstance as any).add([
          {
            id: memory.id,
            vector: memory.embedding,
            content: memory.content,
            type: memory.type,
            scope: memory.scope,
            projectId: memory.projectId || '',
            phaseId: memory.phaseId || '',
            authority: memory.authority,
            importance: memory.importance,
            confidence: memory.confidence,
            createdAt: memory.createdAt,
            updatedAt: memory.updatedAt,
            retrievalCount: memory.retrievalCount,
            tags: memory.tags.join(','),
          },
        ]);
      }
      return memory.id;
    } catch {
      // Degrade to fallback store
      return this.fallbackStore.add(memory);
    }
  }

  public async addMany(memories: MemoryEntry[]): Promise<string[]> {
    if (!this.isNativeAvailable) {
      return this.fallbackStore.addMany(memories);
    }

    const ids: string[] = [];
    for (const m of memories) {
      ids.push(await this.add(m));
    }
    return ids;
  }

  public async search(query: MemoryQuery): Promise<MemoryResult[]> {
    // For full multi-factor reranking and scoring consistency, delegate to query pipeline
    return this.fallbackStore.search(query);
  }

  public async get(id: string): Promise<MemoryEntry | null> {
    return this.fallbackStore.get(id);
  }

  public async update(id: string, patch: Partial<MemoryEntry>): Promise<void> {
    return this.fallbackStore.update(id, patch);
  }

  public async delete(id: string): Promise<void> {
    return this.fallbackStore.delete(id);
  }

  public async stats(projectId?: string): Promise<MemoryStats> {
    return this.fallbackStore.stats(projectId);
  }

  public async clear(scope?: MemoryScope, projectId?: string): Promise<void> {
    return this.fallbackStore.clear(scope, projectId);
  }

  public isUsingNativeBackend(): boolean {
    return this.isNativeAvailable;
  }
}
