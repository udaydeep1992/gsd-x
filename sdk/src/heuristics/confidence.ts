/**
 * GSD-X Heuristic Confidence Scoring Model
 *
 * Mathematically calibrated confidence model combining Bayesian evidence accumulation,
 * multi-project corroboration weighting, success/failure feedback, and temporal validation decay.
 */

import { EngineeringHeuristic } from './types';

export class HeuristicConfidenceModel {
  private static readonly MIN_CONFIDENCE_THRESHOLD = 0.40;
  private static readonly CORROBORATION_WEIGHT = 0.15; // Bonus per corroborating independent project
  private static readonly MAX_EVIDENCE_CAP = 10;

  /**
   * Calculates calibrated confidence score in range [0.0, 1.0].
   */
  public static calculateConfidence(params: {
    evidenceCount: number;
    successCount: number;
    failureCount: number;
    sourceProjectsCount: number;
    lastValidatedAt?: string;
  }): number {
    const {
      evidenceCount = 1,
      successCount = 0,
      failureCount = 0,
      sourceProjectsCount = 1,
      lastValidatedAt,
    } = params;

    // 1. Bayesian Success Rate using Laplace smoothing: (S + 1) / (S + F + 2)
    const totalOutcomes = successCount + failureCount;
    const outcomeScore = totalOutcomes > 0
      ? (successCount + 1.0) / (totalOutcomes + 2.0)
      : 0.50; // Neutral prior when no trials yet

    // 2. Evidence Volume Multiplier: scales from 0.70 to 1.0 as evidenceCount increases
    const evidenceFactor = 0.70 + 0.30 * (1 - Math.exp(-0.4 * Math.min(evidenceCount, this.MAX_EVIDENCE_CAP)));

    // 3. Multi-Project Corroboration Bonus: multiple projects noticing same heuristic increases reliability
    const corroborationBonus = Math.min(0.20, Math.max(0, (sourceProjectsCount - 1) * this.CORROBORATION_WEIGHT));

    // 4. Temporal Decay: slight decay if unvalidated for > 90 days
    let decayFactor = 1.0;
    if (lastValidatedAt) {
      const daysSinceValidation = (Date.now() - new Date(lastValidatedAt).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceValidation > 90) {
        decayFactor = Math.max(0.75, 1.0 - (daysSinceValidation - 90) * 0.001);
      }
    }

    // Combined score
    let confidence = (outcomeScore * 0.7 + evidenceFactor * 0.3 + corroborationBonus) * decayFactor;

    // Bound between 0.10 and 0.99 (never absolute 1.0 or 0.0)
    confidence = Math.max(0.10, Math.min(0.99, confidence));

    return Math.round(confidence * 100) / 100;
  }

  /**
   * Applies task execution outcome (success/failure) to heuristic and returns updated heuristic.
   */
  public static applyOutcome(
    heuristic: EngineeringHeuristic,
    success: boolean
  ): EngineeringHeuristic {
    const successCount = heuristic.successCount + (success ? 1 : 0);
    const failureCount = heuristic.failureCount + (success ? 0 : 1);
    const evidenceCount = heuristic.evidenceCount + 1;
    const lastValidatedAt = new Date().toISOString();

    const newConfidence = this.calculateConfidence({
      evidenceCount,
      successCount,
      failureCount,
      sourceProjectsCount: heuristic.sourceProjectsCount,
      lastValidatedAt,
    });

    return {
      ...heuristic,
      successCount,
      failureCount,
      evidenceCount,
      confidence: newConfidence,
      lastValidatedAt,
      provenance: {
        ...heuristic.provenance,
        lastUpdated: lastValidatedAt,
      },
    };
  }

  /**
   * Checks whether a heuristic has high enough confidence to be retrieved into prompt context.
   */
  public static isAdmissible(confidence: number, minThreshold = this.MIN_CONFIDENCE_THRESHOLD): boolean {
    return confidence >= minThreshold;
  }
}
