/**
 * GSD-X Heuristic Feedback Recorder
 *
 * Records task execution outcomes (success/failure) for applied heuristics,
 * dynamically updating empirical confidence and retiring ineffective rules.
 */

import { GlobalHeuristicsStore } from './store';
import { HeuristicConfidenceModel } from './confidence';

export class HeuristicFeedbackRecorder {
  private store: GlobalHeuristicsStore;

  constructor(store?: GlobalHeuristicsStore) {
    this.store = store || new GlobalHeuristicsStore();
  }

  /**
   * Records whether an applied heuristic led to successful execution or regression.
   */
  public async recordOutcome(
    heuristicId: string,
    success: boolean
  ): Promise<{ updated: boolean; newConfidence?: number; error?: string }> {
    const heuristic = await this.store.getById(heuristicId);
    if (!heuristic) {
      return { updated: false, error: `Heuristic not found: ${heuristicId}` };
    }

    const updated = HeuristicConfidenceModel.applyOutcome(heuristic, success);
    await this.store.update(updated);

    return {
      updated: true,
      newConfidence: updated.confidence,
    };
  }
}
