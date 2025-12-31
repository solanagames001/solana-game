// lib/sdk/helpers/matrix.ts
// ------------------------------------------------------------
// Matrix builder (SDK v3.10)
// Source of truth: LevelStateLite (cycles + slots_filled)
// ------------------------------------------------------------

import type { MatrixState } from "../types/matrix";

export type LevelStateLite = {
  cycles: number;
  slots_filled: number;
};

/**
 * Build MatrixState from on-chain LevelStateLite.
 * Источник истины — аккаунт LevelState, а не история.
 */
export function buildMatrixState(
  levelId: number,
  levelState: LevelStateLite
): MatrixState {
  const filled = Math.min(3, Math.max(0, levelState.slots_filled));

  return {
    levelId,
    cycle: {
      index: levelState.cycles,
      filled,
      closed: filled === 3,
    },
    slots: [
      { index: 1, state: filled >= 1 ? "FILLED" : "EMPTY" },
      { index: 2, state: filled >= 2 ? "FILLED" : "EMPTY" },
      { index: 3, state: filled >= 3 ? "FILLED" : "EMPTY" },
    ],
  };
}
