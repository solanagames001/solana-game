// lib/sdk/prices.ts
// ------------------------------------------------------------
// Solana Game SDK v3.10 — FIXED LEVEL PRICES (1:1 with on-chain)
// Полная синхронизация с Rust-массивом LEVEL_PRICES_LAMPORTS.
// Эта версия — эталонная. Используется SDK, фронтом и скриптами.
// ------------------------------------------------------------

/**
 * Количество лампортов в 1 SOL.
 * bigint — обязателен (точность денежных расчётов).
 */
export const LAMPORTS_PER_SOL = 1_000_000_000n;

/* ------------------------------------------------------------
   FIXED LEVEL PRICES
   L1..L16 — полностью соответствуют Rust v3.10.
------------------------------------------------------------ */

export const LEVEL_PRICES_LAMPORTS: readonly bigint[] = [
  50_000_000n,     // L1
  180_000_000n,    // L2
  360_000_000n,    // L3
  680_000_000n,    // L4
  1_100_000_000n,  // L5
  1_550_000_000n,  // L6
  2_100_000_000n,  // L7
  2_650_000_000n,  // L8
  3_250_000_000n,  // L9
  3_900_000_000n,  // L10
  4_650_000_000n,  // L11
  5_450_000_000n,  // L12
  6_400_000_000n,  // L13
  7_350_000_000n,  // L14
  8_000_000_000n,  // L15
  8_700_000_000n   // L16
];

/**
 * Максимальный номер уровня.
 */
export const MAX_LEVELS = LEVEL_PRICES_LAMPORTS.length;

/* ------------------------------------------------------------
   STRICT PRICE GETTER
------------------------------------------------------------ */

export function priceLamportsForLevel(level: number): bigint {
  if (!Number.isInteger(level) || level < 1 || level > MAX_LEVELS) {
    throw new RangeError(
      `priceLamportsForLevel(): invalid level=${level}, expected 1..${MAX_LEVELS}`
    );
  }
  return LEVEL_PRICES_LAMPORTS[level - 1];
}

/* ------------------------------------------------------------
   CONVERSION HELPERS
------------------------------------------------------------ */

export function lamportsToSol(lamports: bigint | number): number {
  if (lamports == null) return 0;
  const v = typeof lamports === "bigint" ? Number(lamports) : lamports;
  return Number.isFinite(v) ? v / Number(LAMPORTS_PER_SOL) : 0;
}

export function solToLamports(sol: number): bigint {
  if (!Number.isFinite(sol) || sol < 0) {
    throw new Error(`solToLamports(): invalid SOL value: ${sol}`);
  }
  return BigInt(Math.floor(sol * Number(LAMPORTS_PER_SOL)));
}
