// lib/sdk/pda.ts
// ------------------------------------------------------------
// Solana Game v3.10 — CLEAN SDK PDA module (MAINNET SAFE)
// Централизованные PROGRAM_ID, CLUSTER и PDA-дериверы
// Строго согласовано с Rust v3.10
// ------------------------------------------------------------

import { PublicKey } from "@solana/web3.js";
import { MAX_LEVELS } from "./prices";

/* ------------------------------------------------------------
   CLUSTER (env → normalized)
------------------------------------------------------------ */

export type ClusterKind = "mainnet-beta" | "devnet" | "testnet";

function parseCluster(): ClusterKind {
  const raw = process.env.NEXT_PUBLIC_SOLANA_CLUSTER?.trim() as
    | ClusterKind
    | "localnet"
    | string
    | undefined;

  if (raw === "mainnet-beta" || raw === "testnet" || raw === "devnet") {
    return raw;
  }

  // localnet -> devnet (dev only)
  if (raw === "localnet") {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        `[sdk/pda] NEXT_PUBLIC_SOLANA_CLUSTER="localnet" → treating as "devnet".`
      );
      return "devnet";
    }
    // В production просто используем devnet как fallback
    return "devnet";
  }

  // missing/unknown - SSR-SAFE: всегда возвращаем devnet как fallback
  // Это безопаснее чем throw при SSR/build
  if (typeof window === 'undefined' || process.env.NODE_ENV !== "production") {
    // Логируем только в development и не при каждом SSR запросе
    if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
      console.warn(
        `[sdk/pda] Unknown or missing NEXT_PUBLIC_SOLANA_CLUSTER="${raw}", fallback to "devnet".`
      );
    }
    return "devnet";
  }

  // В production на клиенте - используем mainnet-beta как дефолт
  // (большинство production приложений на mainnet)
  return "mainnet-beta";
}

export const CLUSTER: ClusterKind = parseCluster();

/* ------------------------------------------------------------
   PROGRAM ID (env строго обязателен)
   
   SSR-SAFE + FALLBACK: При отсутствии NEXT_PUBLIC_PROGRAM_ID 
   используется fallback из Anchor.toml. Это позволяет работать
   даже если .env.local не настроен.
------------------------------------------------------------ */

// Fallback Program IDs из Anchor.toml (для случаев когда env не загружен)
const FALLBACK_PROGRAM_IDS: Record<ClusterKind, string> = {
  'mainnet-beta': 'Bk5wQdDbfe2UGrrjBsDUJFPjH9mqB5JHZymrp4u95458',
  'devnet': '4dWfqrMh8irJFT4pSDbNyQzH3MRzVakcJYYNNyLZZ6V6',
  'testnet': '4dWfqrMh8irJFT4pSDbNyQzH3MRzVakcJYYNNyLZZ6V6', // same as devnet
};

function parseProgramId(): PublicKey {
  const raw = process.env.NEXT_PUBLIC_PROGRAM_ID?.trim();

  // Если env установлен - используем его
  if (raw) {
    try {
      const pid = new PublicKey(raw);

      if (process.env.NODE_ENV !== "production") {
        console.log(`[sdk/pda] Program ID from env (${CLUSTER}): ${pid.toBase58()}`);
      }

      return pid;
    } catch (e) {
      console.error(`[sdk/pda] Invalid NEXT_PUBLIC_PROGRAM_ID="${raw}". Using fallback.`);
    }
  }

  // Используем fallback на основе CLUSTER
  const fallbackId = FALLBACK_PROGRAM_IDS[CLUSTER];
  
  if (process.env.NODE_ENV !== "production") {
    console.warn(
      `[sdk/pda] NEXT_PUBLIC_PROGRAM_ID not set, using fallback for ${CLUSTER}: ${fallbackId}`
    );
  }

  return new PublicKey(fallbackId);
}

export const PROGRAM_ID: PublicKey = parseProgramId();

/**
 * Проверка что PROGRAM_ID взят из env (не fallback)
 */
export function isProgramIdFromEnv(): boolean {
  const envId = process.env.NEXT_PUBLIC_PROGRAM_ID?.trim();
  return !!envId && PROGRAM_ID.toBase58() === envId;
}

/* ------------------------------------------------------------
   PDA SEEDS (Rust v3.10)
------------------------------------------------------------ */

export const PLAYER_SEED = "player";
export const CONFIG_SEED = "config_v3_new";
export const GLOBAL_STATS_SEED = "global_stats_v1";

export const LEVEL_STATE_SEED = "lvl";
export const LEVEL_POOL_SEED = "level_pool_v1";
export const QUEUE_PAGE_SEED = "queue_page_v1";

export const TX_SEED = "tx";

/* ------------------------------------------------------------
   INTERNAL ENCODERS
------------------------------------------------------------ */

function encodeSeed(seed: string): Uint8Array {
  // Seeds here are small constants. Truncation would hide bugs.
  const bytes = new TextEncoder().encode(seed);
  if (bytes.length > 32) {
    throw new Error(`[sdk/pda] seed too long (>32): "${seed}"`);
  }
  return bytes;
}

function u32le(n: number): Uint8Array {
  if (!Number.isInteger(n) || n < 0 || n > 0xffff_ffff) {
    throw new RangeError(`u32le(): value out of range: ${n}`);
  }
  const arr = new Uint8Array(4);
  new DataView(arr.buffer).setUint32(0, n >>> 0, true);
  return arr;
}

function u64le(n: bigint | number): Uint8Array {
  const b = BigInt(n);
  if (b < 0n || b > 0xffff_ffff_ffff_ffffn) {
    throw new RangeError(`u64le(): value out of u64 range: ${b}`);
  }
  const arr = new Uint8Array(8);
  new DataView(arr.buffer).setBigUint64(0, b, true);
  return arr;
}

/* ------------------------------------------------------------
   PLAYER PDA: ["player", authority]
   Cache key includes PROGRAM_ID to avoid cross-env leakage.
------------------------------------------------------------ */

const playerCache = new Map<string, [PublicKey, number]>();

export function derivePlayerPda(authority: PublicKey): [PublicKey, number] {
  const key = `${PROGRAM_ID.toBase58()}:${authority.toBase58()}`;
  const cached = playerCache.get(key);
  if (cached) return cached;

  const pda = PublicKey.findProgramAddressSync(
    [encodeSeed(PLAYER_SEED), authority.toBuffer()],
    PROGRAM_ID
  );

  playerCache.set(key, pda);
  return pda;
}

/* ------------------------------------------------------------
   CONFIG PDA: ["config_v3_new"]
------------------------------------------------------------ */

let cachedConfig: [PublicKey, number] | null = null;

export function deriveConfigPda(): [PublicKey, number] {
  if (cachedConfig) return cachedConfig;

  cachedConfig = PublicKey.findProgramAddressSync(
    [encodeSeed(CONFIG_SEED)],
    PROGRAM_ID
  );

  return cachedConfig;
}

/* ------------------------------------------------------------
   GLOBAL STATS PDA: ["global_stats_v1"]
------------------------------------------------------------ */

let cachedStats: [PublicKey, number] | null = null;

export function deriveGlobalStatsPda(): [PublicKey, number] {
  if (cachedStats) return cachedStats;

  cachedStats = PublicKey.findProgramAddressSync(
    [encodeSeed(GLOBAL_STATS_SEED)],
    PROGRAM_ID
  );

  return cachedStats;
}

/* ------------------------------------------------------------
   LEVEL STATE PDA: ["lvl", player_pda, [level]]
------------------------------------------------------------ */

export function deriveLevelStatePda(
  playerPda: PublicKey,
  level: number
): [PublicKey, number] {
  if (!Number.isInteger(level) || level < 1 || level > MAX_LEVELS) {
    throw new RangeError(
      `deriveLevelStatePda: level=${level} invalid, expected 1..${MAX_LEVELS}`
    );
  }

  return PublicKey.findProgramAddressSync(
    [encodeSeed(LEVEL_STATE_SEED), playerPda.toBuffer(), Uint8Array.of(level)],
    PROGRAM_ID
  );
}

/* ------------------------------------------------------------
   LEVEL POOL PDA: ["level_pool_v1", config, [level]]
------------------------------------------------------------ */

export function deriveLevelPoolPda(
  configPda: PublicKey,
  level: number
): [PublicKey, number] {
  if (!Number.isInteger(level) || level < 1 || level > MAX_LEVELS) {
    throw new RangeError(
      `deriveLevelPoolPda: level=${level} invalid, expected 1..${MAX_LEVELS}`
    );
  }

  return PublicKey.findProgramAddressSync(
    [encodeSeed(LEVEL_POOL_SEED), configPda.toBuffer(), Uint8Array.of(level)],
    PROGRAM_ID
  );
}

/* ------------------------------------------------------------
   QUEUE PAGE PDA: ["queue_page_v1", level_pool, u32le(index)]
------------------------------------------------------------ */

export function deriveQueuePagePda(
  levelPoolPda: PublicKey,
  pageIndex: number
): [PublicKey, number] {
  if (!Number.isInteger(pageIndex) || pageIndex < 0) {
    throw new RangeError(
      `deriveQueuePagePda: pageIndex=${pageIndex} invalid, expected >= 0`
    );
  }

  return PublicKey.findProgramAddressSync(
    [encodeSeed(QUEUE_PAGE_SEED), levelPoolPda.toBuffer(), u32le(pageIndex)],
    PROGRAM_ID
  );
}

/* ------------------------------------------------------------
   TX GUARDS
   NOTE: Must match on-chain seeds (v3.10 scripts alignment).
------------------------------------------------------------ */

export function deriveTxGuardActivate(
  playerPda: PublicKey,
  level: number,
  nonce: bigint | number
): [PublicKey, number] {
  if (!Number.isInteger(level) || level < 1 || level > MAX_LEVELS) {
    throw new RangeError(
      `deriveTxGuardActivate: level=${level} invalid, expected 1..${MAX_LEVELS}`
    );
  }

  return PublicKey.findProgramAddressSync(
    [
      encodeSeed(TX_SEED),
      playerPda.toBuffer(),
      Uint8Array.of(0x01),
      Uint8Array.of(level),
      u64le(nonce),
    ],
    PROGRAM_ID
  );
}

export function deriveTxGuardRecycle(
  playerPda: PublicKey,
  level: number,
  nonce: bigint | number
): [PublicKey, number] {
  if (!Number.isInteger(level) || level < 1 || level > MAX_LEVELS) {
    throw new RangeError(
      `deriveTxGuardRecycle: level=${level} invalid, expected 1..${MAX_LEVELS}`
    );
  }

  return PublicKey.findProgramAddressSync(
    [
      encodeSeed(TX_SEED),
      playerPda.toBuffer(),
      Uint8Array.of(0x02),
      Uint8Array.of(level),
      u64le(nonce),
    ],
    PROGRAM_ID
  );
}

export function deriveTxGuardRegister(
  authority: PublicKey,
  nonce: bigint | number
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [encodeSeed(TX_SEED), encodeSeed("register"), authority.toBuffer(), u64le(nonce)],
    PROGRAM_ID
  );
}

/* ------------------------------------------------------------
   CACHE RESET
------------------------------------------------------------ */

export function resetPdaCache() {
  playerCache.clear();
  cachedConfig = null;
  cachedStats = null;
}
