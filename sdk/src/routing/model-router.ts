/**
 * GSD-X Model Router
 *
 * Configurable model recommendations based on task category and model tiers.
 */

import { ModelRecommendation, ModelTierConfig, RouterConfig, TaskCategory } from './types';
import { classifyTaskCategory } from './task-classifier';

export class ModelRouter {
  private config: RouterConfig;

  constructor(config?: Partial<RouterConfig>) {
    this.config = {
      enabled: config?.enabled ?? false,
      defaultModel: config?.defaultModel ?? 'inherit',
      tiers: config?.tiers ?? {},
      overrides: config?.overrides ?? {},
    };
  }

  public route(task: string, agentRole?: string): ModelRecommendation {
    const category = classifyTaskCategory(task, agentRole);

    // If router is disabled, return default
    if (!this.config.enabled) {
      return {
        category,
        recommendedModel: this.config.defaultModel,
        tier: 'fastModel',
        reason: 'Model router disabled; using default/inherited model',
      };
    }

    // Check specific task overrides
    if (this.config.overrides && this.config.overrides[category]) {
      const model = this.config.overrides[category]!;
      return {
        category,
        recommendedModel: model,
        tier: 'strongCodingModel',
        reason: `Explicit override configured for ${category}`,
      };
    }

    // Map category to tier
    let tier: keyof ModelTierConfig = 'fastModel';
    let reason = '';

    switch (category) {
      case 'trivial':
      case 'summarization':
        tier = 'cheapModel';
        reason = `Selected cheapModel tier for ${category} efficiency`;
        break;
      case 'coding':
        tier = 'strongCodingModel';
        reason = `Selected strongCodingModel tier for high-precision implementation`;
        break;
      case 'debugging':
        tier = 'strongCodingModel';
        reason = `Selected strongCodingModel tier for hypothesis-driven debugging`;
        break;
      case 'architecture':
        tier = 'reasoningModel';
        reason = `Selected reasoningModel tier for high-order architectural planning`;
        break;
      case 'security':
      case 'verification':
        tier = 'auditModel';
        reason = `Selected auditModel tier for rigorous validation`;
        break;
      case 'research':
        tier = 'fastModel';
        reason = `Selected fastModel tier for exploratory breadth`;
        break;
    }

    const model = this.config.tiers[tier] || this.config.defaultModel;

    return {
      category,
      recommendedModel: model,
      tier,
      reason,
    };
  }
}
