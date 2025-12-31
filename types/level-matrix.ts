// types/level-matrix.ts

export type MatrixSlotState = "EMPTY" | "FILLED";

export type MatrixSlot = {
  index: 1 | 2 | 3;     // порядковый номер слота
  state: MatrixSlotState;
  // будущие поля: wallet/pubkey, ts, txSig и т.д.
};

export type MatrixCycle = {
  index: number;        // 1..N (номер цикла)
  filled: number;       // сколько занято (0..3)
  closed: boolean;      // true, если filled === 3
};

export type MatrixState = {
  levelId: number;
  slots: [MatrixSlot, MatrixSlot, MatrixSlot]; // текущий цикл
  cycle: MatrixCycle;                           // инфо по текущему циклу
  cyclesClosed: number;                         // сколько уже закрыто
  nextSlotIndex: 1 | 2 | 3 | null;              // куда встанет следующий
};
