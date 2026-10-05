/**
 * GSD-X Adaptive Token Budget Calculator
 *
 * Dynamically computes optimal context size based on task complexity,
 * agent role, and model parameters.
 */

export type TaskComplexity = 'trivial' | 'small' | 'medium' | 'large' | 'architectural';

export interface BudgetCalculationInput {
  task: string;
  agentRole?: string;
  taskComplexity?: TaskComplexity;
  modelContextLimit?: number;
  requestedBudget?: number;
}

export interface BudgetAllocation {
  totalBudget: number;
  planningBudget: number;
  memoryBudget: number;
  codeBudget: number;
  instructionBudget: number;
  complexity: TaskComplexity;
}

export function classifyTaskComplexity(task: string, agentRole?: string): TaskComplexity {
  const lower = task.toLowerCase();

  // Architectural / Spec
  if (
    lower.includes('architecture') ||
    lower.includes('roadmap') ||
    lower.includes('redesign') ||
    lower.includes('spec') ||
    agentRole === 'gsd-architect' ||
    agentRole === 'gsd-planner'
  ) {
    return 'architectural';
  }

  // Large Feature
  if (
    lower.includes('refactor') ||
    lower.includes('migration') ||
    lower.includes('pipeline') ||
    lower.includes('integration') ||
    lower.includes('sync') ||
    lower.includes('multi-')
  ) {
    return 'large';
  }

  // Small Bug / Diagnostics
  if (
    lower.includes('fix') ||
    lower.includes('bug') ||
    lower.includes('error') ||
    lower.includes('crash') ||
    lower.includes('failing') ||
    agentRole === 'gsd-debugger'
  ) {
    return 'small';
  }

  // Simple query / status
  if (
    lower.includes('status') ||
    lower.includes('check') ||
    lower.includes('show') ||
    lower.includes('list') ||
    lower.includes('view') ||
    lower.includes('stats')
  ) {
    return 'trivial';
  }

  // Default: medium (normal feature / execution)
  return 'medium';
}

/**
 * Calculates adaptive token budget and sub-allocations.
 */
export function calculateAdaptiveBudget(input: BudgetCalculationInput): BudgetAllocation {
  const complexity = input.taskComplexity ?? classifyTaskComplexity(input.task, input.agentRole);

  let baselineBudget: number;
  switch (complexity) {
    case 'trivial':
      baselineBudget = 3500;
      break;
    case 'small':
      baselineBudget = 8000;
      break;
    case 'medium':
      baselineBudget = 14000;
      break;
    case 'large':
      baselineBudget = 24000;
      break;
    case 'architectural':
      baselineBudget = 32000;
      break;
    default:
      baselineBudget = 12000;
  }

  // If user or workflow explicitly requested a budget, honor it
  let totalBudget = input.requestedBudget ?? baselineBudget;

  // If model context limit is known, cap total budget to 60% of model window (Smart Zone)
  if (input.modelContextLimit && input.modelContextLimit > 0) {
    const smartZoneCap = Math.floor(input.modelContextLimit * 0.6);
    totalBudget = Math.min(totalBudget, smartZoneCap);
  }

  // Proportional sub-allocations
  // Planning artifacts: 30%, Code symbols/extracts: 40%, Semantic Memory: 20%, Instructions: 10%
  const planningBudget = Math.floor(totalBudget * 0.3);
  const codeBudget = Math.floor(totalBudget * 0.4);
  const memoryBudget = Math.floor(totalBudget * 0.2);
  const instructionBudget = Math.floor(totalBudget * 0.1);

  return {
    totalBudget,
    planningBudget,
    memoryBudget,
    codeBudget,
    instructionBudget,
    complexity,
  };
}
