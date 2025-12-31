// lib/sdk/types/matrix.ts
// ------------------------------------------------------------
// CLEAN SDK v3.10 — Derived Matrix View (client-side only)
// ------------------------------------------------------------
// Поскольку on-chain LevelState не содержит структуры слотов,
// мы выводим slots[] исключительно из slots_filled.
// ------------------------------------------------------------

export type MatrixSlot = {
  index: number;                    // 1..3
  state: "EMPTY" | "FILLED";
};

export type MatrixCycleState = {
  index: number;                    // = cycles
  filled: number;                   // = slots_filled
  closed: boolean;                  // filled === 3
};

export type MatrixState = {
  levelId: number;
  cycle: MatrixCycleState;
  slots: MatrixSlot[];
};
