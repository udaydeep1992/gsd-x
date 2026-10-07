/**
 * GSD-X Visual Context Inspector Types
 *
 * Data contracts for context observability, token flow tracing,
 * retrieval explanation ("Why selected?"), rejection logs, and context diffs.
 */

export interface CompilationStageMetrics {
  stageName: 'raw_candidates' | 'ast_filtering' | 'semantic_ranking' | 'memory_selection' | 'context_compilation';
  displayName: string;
  inputTokens: number;
  outputTokens: number;
  removedTokens: number;
  reductionPercent: number;
  durationMs: number;
}

export interface RetrievedArtifactExplanation {
  sourceType: 'code' | 'memory' | 'planning' | 'ast' | 'heuristic';
  sourceId: string;
  filePath: string;
  symbolName?: string;
  qualifiedName?: string;
  relevanceScore: number;
  reasons: string[]; // e.g. ["Exact symbol match: authenticate_user", "Called by target function", "Semantic similarity: 0.91"]
  originalTokens: number;
  selectedTokens: number;
  tokensSaved: number;
  originalSnippet?: string;
  selectedSnippet: string;
}

export interface RejectedArtifactLog {
  sourceType: 'code' | 'planning' | 'memory';
  sourcePath: string;
  symbolName?: string;
  rejectionReason: string; // e.g. "Low relevance score: 0.18", "Budget exceeded", "Dependency distance too high"
  estimatedTokens: number;
  score?: number;
}

export interface ContextSourceBreakdown {
  codeTokens: number;
  codePercentage: number;
  memoryTokens: number;
  memoryPercentage: number;
  astTokens: number;
  astPercentage: number;
  planningTokens: number;
  planningPercentage: number;
  heuristicTokens: number;
  heuristicPercentage: number;
}

export interface ContextCompilationRecord {
  requestId: string;
  timestamp: string;
  task: string;
  model: string;
  contextBudget: number;
  originalTokens: number;
  finalTokens: number;
  tokensSaved: number;
  reductionPercent: number;
  retrievalLatencyMs: number;
  compilationLatencyMs: number;
  totalLatencyMs: number;
  stages: CompilationStageMetrics[];
  selectedArtifacts: RetrievedArtifactExplanation[];
  rejectedArtifacts: RejectedArtifactLog[];
  sourceBreakdown: ContextSourceBreakdown;
  compilerDecisions: string[];
}
