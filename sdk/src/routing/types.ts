/**
 * GSD-X Model Routing Types
 */

export type TaskCategory =
  | 'trivial'
  | 'summarization'
  | 'research'
  | 'coding'
  | 'debugging'
  | 'architecture'
  | 'security'
  | 'verification';

export interface ModelTierConfig {
  cheapModel?: string;      // e.g. for summarization/trivial
  fastModel?: string;       // e.g. for simple coding
  strongCodingModel?: string; // e.g. for implementation
  reasoningModel?: string;  // e.g. for architecture/planning
  auditModel?: string;      // e.g. for security/verification
}

export interface RoutingRule {
  category: TaskCategory;
  recommendedTier: keyof ModelTierConfig;
  reason: string;
}

export interface ModelRecommendation {
  category: TaskCategory;
  recommendedModel: string;
  tier: keyof ModelTierConfig;
  reason: string;
}

export interface RouterConfig {
  enabled: boolean;
  defaultModel: string;
  tiers: ModelTierConfig;
  overrides?: Partial<Record<TaskCategory, string>>;
}
