/**
 * GSD-X Semantic Memory System Types
 *
 * Implements the memory schema, query contracts, scoring factors,
 * authority hierarchies, and store interfaces.
 */

export type MemoryType =
  | 'decision'
  | 'pattern'
  | 'solution'
  | 'bug'
  | 'architecture'
  | 'convention'
  | 'research'
  | 'constraint'
  | 'preference'
  | 'experience';

export type MemoryScope = 'global' | 'project' | 'phase';

export type MemoryAuthority =
  | 'authoritative'
  | 'verified'
  | 'high-confidence'
  | 'learned'
  | 'inferred'
  | 'experimental';

export interface MemoryEntry {
  id: string;
  content: string;
  type: MemoryType;
  scope: MemoryScope;
  projectId?: string;
  phaseId?: string;
  source?: string;
  authority: MemoryAuthority;
  importance: number; // 0.0 to 1.0
  confidence: number; // 0.0 to 1.0
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
  lastRetrievedAt?: string;
  retrievalCount: number;
  tags: string[];
  supersedes?: string;
  embedding?: number[];
  metadata?: Record<string, unknown>;
}

export interface MemoryQuery {
  text: string;
  projectId?: string;
  phaseId?: string;
  scope?: MemoryScope | MemoryScope[];
  types?: MemoryType[];
  authorities?: MemoryAuthority[];
  tags?: string[];
  limit?: number;
  minScore?: number;
  includeGlobal?: boolean;
}

export interface ScoringFactors {
  semanticSimilarity: number;
  projectRelevance: number;
  phaseRelevance: number;
  taskRelevance: number;
  importance: number;
  confidence: number;
  recency: number;
  authority: number;
  frequency: number;
}

export interface MemoryResult {
  memory: MemoryEntry;
  score: number;
  factors: ScoringFactors;
  reason?: string;
}

export interface MemoryStats {
  totalCount: number;
  projectCount: number;
  globalCount: number;
  phaseCount: number;
  byType: Record<MemoryType, number>;
  byAuthority: Record<MemoryAuthority, number>;
  averageRetrievalCount: number;
  staleCount: number;
  lastConsolidatedAt?: string;
}

export interface ScoringWeights {
  semanticSimilarity: number; // default: 0.40
  projectRelevance: number;   // default: 0.15
  phaseRelevance: number;     // default: 0.10
  taskRelevance: number;      // default: 0.10
  importance: number;         // default: 0.10
  confidence: number;         // default: 0.05
  recency: number;            // default: 0.05
  authority: number;          // default: 0.05
}

export const DEFAULT_SCORING_WEIGHTS: ScoringWeights = Object.freeze({
  semanticSimilarity: 0.40,
  projectRelevance: 0.15,
  phaseRelevance: 0.10,
  taskRelevance: 0.10,
  importance: 0.10,
  confidence: 0.05,
  recency: 0.05,
  authority: 0.05,
});

export interface MemoryStore {
  initialize(): Promise<void>;
  add(memory: MemoryEntry): Promise<string>;
  addMany(memories: MemoryEntry[]): Promise<string[]>;
  search(query: MemoryQuery): Promise<MemoryResult[]>;
  get(id: string): Promise<MemoryEntry | null>;
  update(id: string, patch: Partial<MemoryEntry>): Promise<void>;
  delete(id: string): Promise<void>;
  stats(projectId?: string): Promise<MemoryStats>;
  clear(scope?: MemoryScope, projectId?: string): Promise<void>;
  close?(): Promise<void>;
}

export interface MemoryConfig {
  enabled: boolean;
  backend: 'lancedb' | 'sqlite' | 'json';
  storagePath?: string;
  globalPath?: string;
  scope: 'project' | 'global' | 'project+global';
  embedding: {
    provider: 'local' | 'custom';
    dimensions?: number;
  };
  retrieval: {
    topK: number;
    rerank: boolean;
    maxTokens: number;
    weights?: Partial<ScoringWeights>;
  };
  autoExtract: boolean;
  autoConsolidate: boolean;
  decay: boolean;
  decayHalfLifeDays?: number;
}
