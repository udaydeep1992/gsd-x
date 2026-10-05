/**
 * GSD-X Complexity Analyzer
 */

import { TaskCategory } from './types';

export interface ComplexityAnalysis {
  category: TaskCategory;
  score: number; // 1 to 10
  expectedCodeSurface: 'none' | 'isolated' | 'moderate' | 'cross-cutting';
  recommendedTimeoutSeconds: number;
}

export function analyzeComplexity(task: string, category: TaskCategory): ComplexityAnalysis {
  let score = 5;
  let expectedCodeSurface: ComplexityAnalysis['expectedCodeSurface'] = 'moderate';
  let recommendedTimeoutSeconds = 300;

  switch (category) {
    case 'trivial':
      score = 2;
      expectedCodeSurface = 'none';
      recommendedTimeoutSeconds = 60;
      break;
    case 'summarization':
      score = 3;
      expectedCodeSurface = 'none';
      recommendedTimeoutSeconds = 120;
      break;
    case 'debugging':
      score = 6;
      expectedCodeSurface = 'isolated';
      recommendedTimeoutSeconds = 300;
      break;
    case 'coding':
      score = 6;
      expectedCodeSurface = 'moderate';
      recommendedTimeoutSeconds = 450;
      break;
    case 'verification':
      score = 5;
      expectedCodeSurface = 'moderate';
      recommendedTimeoutSeconds = 300;
      break;
    case 'research':
      score = 7;
      expectedCodeSurface = 'none';
      recommendedTimeoutSeconds = 600;
      break;
    case 'security':
      score = 8;
      expectedCodeSurface = 'cross-cutting';
      recommendedTimeoutSeconds = 600;
      break;
    case 'architecture':
      score = 9;
      expectedCodeSurface = 'cross-cutting';
      recommendedTimeoutSeconds = 900;
      break;
  }

  // Adjust for length/depth of task description
  if (task.length > 200) {
    score = Math.min(10, score + 1);
  }

  return {
    category,
    score,
    expectedCodeSurface,
    recommendedTimeoutSeconds,
  };
}
