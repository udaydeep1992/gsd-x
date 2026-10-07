/**
 * GSD-X Engineering Heuristics Types
 *
 * Data contracts for cross-project persistent engineering intelligence,
 * privacy isolation, confidence calibration, and feedback loops.
 */

export type HeuristicCategory =
  | 'architecture'
  | 'performance'
  | 'reliability'
  | 'security'
  | 'workflow'
  | 'language_quirk';

export interface HeuristicProvenance {
  firstSeenAt: string;
  lastUpdated: string;
  sourceProjectIdHash: string; // Anonymous one-way salt-hashed project identifier (cannot be reversed)
}

export interface EngineeringHeuristic {
  id: string; // Unique deterministic ID (sha256 hash or slug)
  title: string;
  category: HeuristicCategory;
  language?: string; // e.g. "rust", "go", "cpp", "typescript", "generic"
  framework?: string; // e.g. "tokio", "tree-sitter", "sqlite"
  triggerCondition: string; // Context/pattern that activates this heuristic
  recommendation: string; // Actionable rule
  rationale: string; // Why this recommendation works
  antiPattern?: string; // What not to do
  confidence: number; // Calibrated score [0.0 - 1.0]
  evidenceCount: number; // Total observations across projects
  successCount: number; // Successful task outcomes where applied
  failureCount: number; // Regressions or reverted usages
  sourceProjectsCount: number; // Number of unique anonymous projects corroborating
  lastValidatedAt: string;
  provenance: HeuristicProvenance;
}

export interface HeuristicCandidate {
  title: string;
  category: HeuristicCategory;
  language?: string;
  framework?: string;
  triggerCondition: string;
  recommendation: string;
  rationale: string;
  antiPattern?: string;
  rawSourceText?: string;
}

export interface SanitizationResult {
  sanitizedText: string;
  redactedItemCount: number;
  redactionTypes: string[];
  isSafeForCrossProject: boolean;
  rejectionReason?: string;
}

export interface HeuristicQuery {
  task: string;
  language?: string;
  framework?: string;
  category?: HeuristicCategory;
  minConfidence?: number;
  maxTokens?: number;
  limit?: number;
}

export interface HeuristicRetrievalResult {
  heuristic: EngineeringHeuristic;
  relevanceScore: number;
  finalScore: number;
  estimatedTokens: number;
}

export interface HeuristicsStoreStats {
  totalHeuristics: number;
  byCategory: Record<HeuristicCategory, number>;
  byLanguage: Record<string, number>;
  averageConfidence: number;
  storePath: string;
}
