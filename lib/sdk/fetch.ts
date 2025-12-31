// lib/sdk/fetch.ts
// ------------------------------------------------------------
// Solana Game SDK v3.10 — ON-CHAIN FETCHERS (HELIUS OPTIMIZED)
// ------------------------------------------------------------
// • Centralized RPC management via HeliusRPCOptimizer
// • Aggressive caching with LRU cache
// • Automatic batching and throttling
// • Fallback to public RPC on rate limits
// ------------------------------------------------------------

import {
  Connection,
  PublicKey,
  type Commitment,
} from "@solana/web3.js";

import {
  deriveConfigPda,
  deriveLevelStatePda,
  deriveGlobalStatsPda,
} from "./pda";

import { MAX_LEVELS } from "./prices";
import { HeliusRPCOptimizer, HELIUS_CONFIG } from "./helius";

const DEFAULT_COMMITMENT: Commitment = "confirmed";

/* ------------------------------------------------------------
   CTX → Connection
------------------------------------------------------------ */
function getConn(ctx: unknown): Connection {
  if (ctx instanceof Connection) return ctx;

  if (ctx && typeof ctx === "object" && "connection" in (ctx as any)) {
    return (ctx as any).connection as Connection;
  }

  throw new Error("[sdk/fetch] invalid ctx — expected Connection or { connection }");
}

/* ------------------------------------------------------------
   LEGACY THROTTLE (для обратной совместимости)
   Основная логика теперь в HeliusRPCOptimizer
------------------------------------------------------------ */
let lastCallTs = 0;
let globalBackoffUntil = 0;

async function throttle(minDelay = 100) {
  const now = Date.now();

  if (now < globalBackoffUntil) {
    const wait = globalBackoffUntil - now;
    if (wait > 0) {
      await new Promise((r) => setTimeout(r, wait));
    }
    return;
  }

  const diff = now - lastCallTs;
  if (diff < minDelay) {
    await new Promise((r) => setTimeout(r, minDelay - diff));
  }

  lastCallTs = Date.now();
}

/* ------------------------------------------------------------
   DETECT 429
------------------------------------------------------------ */
function is429Err(e: any): boolean {
  if (!e) return false;
  const msg = String(e?.message || e?.toString?.() || "");
  return msg.includes("429") || msg.includes("Too Many Requests") || msg.includes("rate limit");
}

/* ------------------------------------------------------------
   SAFE getAccountInfo (с использованием HeliusRPCOptimizer)
------------------------------------------------------------ */
async function safeGetAccountInfo(
  connection: Connection,
  pda: PublicKey,
  opts: { commitment?: Commitment }
) {
  // Используем оптимизированный метод с кэшированием
  try {
    return await HeliusRPCOptimizer.getAccountInfo(
      connection,
      pda,
      opts.commitment || DEFAULT_COMMITMENT
    );
  } catch (e) {
    if (is429Err(e)) {
      console.warn("[sdk/fetch] RPC 429 detected — HeliusRPCOptimizer handles backoff");
      return undefined;
    }
    throw e;
  }
}

/* ------------------------------------------------------------
   CONFIG PARSING
------------------------------------------------------------ */
export type ConfigV2Account = {
  version: 2;
  owner: PublicKey;
  treasury: PublicKey;
  perc_owner: number;
  perc_ref1: number;
  perc_ref2: number;
  perc_ref3: number;
  perc_treasury: number;
  bump: number;
};

export type ConfigV3Account = {
  version: 3;
  admin: PublicKey;
  treasury: PublicKey;

  perc_admin: number;
  perc_ref1: number;
  perc_ref2: number;
  perc_ref3: number;
  perc_treasury: number;

  base_price_lamports: bigint;
  price_ratio: number;

  min_entry_delay: number;
  auto_recycle: boolean;
  slots_to_recycle: number;
  max_levels: number;
  bump: number;

  version_minor: number;
};

export type ConfigAny = ConfigV2Account | ConfigV3Account;

const CONFIG_V3_MIN_LEN = 89;
const CONFIG_V2_MIN_LEN = 70;

/* ------------------------------------------------------------
   FETCH CONFIG (v2/v3)
------------------------------------------------------------ */
export async function fetchConfigNullable(
  ctx: unknown
): Promise<ConfigAny | null> {
  try {
    const connection = getConn(ctx);
    const [configPda] = deriveConfigPda();

    const info = await safeGetAccountInfo(connection, configPda, {
      commitment: DEFAULT_COMMITMENT,
    });
    if (!info?.data) return null;

    const data = new Uint8Array(info.data);
    const len = data.length;
    const off = 8;

    // Try v3
    if (len >= off + CONFIG_V3_MIN_LEN) {
      const dv = new DataView(data.buffer, data.byteOffset, data.byteLength);

      const admin = new PublicKey(data.slice(off, off + 32));
      const treasury = new PublicKey(data.slice(off + 32, off + 64));

      const perc_admin = data[off + 64];
      const perc_ref1 = data[off + 65];
      const perc_ref2 = data[off + 66];
      const perc_ref3 = data[off + 67];
      const perc_treasury = data[off + 68];

      const base_price_lamports = dv.getBigUint64(off + 69, true);
      const price_ratio = data[off + 77];
      const min_entry_delay = dv.getUint32(off + 78, true);

      const auto_recycle = data[off + 82] !== 0;
      const slots_to_recycle = data[off + 83];
      const max_levels = data[off + 84];
      const bump = data[off + 85];

      const version = data[off + 86];
      const version_minor = data[off + 87];

      if (version === 3) {
        return {
          version,
          admin,
          treasury,
          perc_admin,
          perc_ref1,
          perc_ref2,
          perc_ref3,
          perc_treasury,
          base_price_lamports,
          price_ratio,
          min_entry_delay,
          auto_recycle,
          slots_to_recycle,
          max_levels,
          bump,
          version_minor,
        };
      }
    }

    // Try v2
    if (len >= off + CONFIG_V2_MIN_LEN) {
      const owner = new PublicKey(data.slice(off, off + 32));
      const treasury = new PublicKey(data.slice(off + 32, off + 64));

      return {
        version: 2,
        owner,
        treasury,
        perc_owner: data[off + 64],
        perc_ref1: data[off + 65],
        perc_ref2: data[off + 66],
        perc_ref3: data[off + 67],
        perc_treasury: data[off + 68],
        bump: data[off + 69],
      };
    }

    return null;
  } catch (e) {
    if (is429Err(e)) return null;
    return null;
  }
}

export async function fetchConfigV3Nullable(ctx: unknown) {
  const cfg = await fetchConfigNullable(ctx);
  return cfg?.version === 3 ? (cfg as ConfigV3Account) : null;
}

/* ------------------------------------------------------------
   GLOBAL STATS
   
   Rust structure (processor.rs):
   pub struct GlobalStats {
       pub total_players: u64,    // 8 bytes, offset 0
       pub last_player: Pubkey,   // 32 bytes, offset 8
       pub bump: u8,              // 1 byte, offset 40
   }
   SIZE = 8 + 32 + 1 = 41 bytes (+ 8 discriminator = 49 total)
------------------------------------------------------------ */
export type GlobalStatsAccount = {
  total_players: bigint;
  last_player: PublicKey;
  bump: number;
};

const GLOBAL_STATS_MIN_LEN = 8 + 8 + 32 + 1; // discriminator + total_players + last_player + bump = 49

export async function fetchGlobalStatsNullable(
  ctx: unknown,
  commitment: Commitment = "finalized"
): Promise<GlobalStatsAccount | null> {
  try {
    const connection = getConn(ctx);
    const [statsPda] = deriveGlobalStatsPda();

    const info = await safeGetAccountInfo(connection, statsPda, { commitment });
    if (!info?.data) return null;

    const data = new Uint8Array(info.data);
    if (data.length < GLOBAL_STATS_MIN_LEN) return null;

    const off = 8; // after discriminator
    const dv = new DataView(data.buffer, data.byteOffset, data.byteLength);

    return {
      total_players: dv.getBigUint64(off, true),                      // offset 0, 8 bytes
      last_player: new PublicKey(data.slice(off + 8, off + 40)),      // offset 8, 32 bytes
      bump: data[off + 40],                                            // offset 40, 1 byte
    };
  } catch (e) {
    if (is429Err(e)) return null;
    return null;
  }
}

/* ------------------------------------------------------------
   PLAYER ACCOUNT
------------------------------------------------------------ */
export async function fetchPlayerNullable(ctx: unknown, pda: PublicKey) {
  try {
    const connection = getConn(ctx);

    const info = await safeGetAccountInfo(connection, pda, {
      commitment: DEFAULT_COMMITMENT,
    });
    if (!info?.data) return null;

    const data = new Uint8Array(info.data);
    const off = 8;

    if (data.length < off + 145) return null;

    const dv = new DataView(data.buffer, data.byteOffset, data.byteLength);

    return {
      authority: new PublicKey(data.slice(off, off + 32)),
      bump: data[off + 32],
      created_at: Number(dv.getBigInt64(off + 33, true)),
      games_played: Number(dv.getBigUint64(off + 41, true)),
      upline1: new PublicKey(data.slice(off + 49, off + 81)),
      upline2: new PublicKey(data.slice(off + 81, off + 113)),
      upline3: new PublicKey(data.slice(off + 113, off + 145)),
    };
  } catch (e) {
    if (is429Err(e)) return null;
    return null;
  }
}

/* ------------------------------------------------------------
   LEVEL STATE
------------------------------------------------------------ */
export async function fetchLevelStateNullable(
  ctx: unknown,
  playerPda: PublicKey,
  levelId: number,
  commitment: Commitment = "confirmed"
) {
  if (!Number.isInteger(levelId) || levelId < 1 || levelId > MAX_LEVELS) {
    return null;
  }

  try {
    const connection = getConn(ctx);
    const [pda] = deriveLevelStatePda(playerPda, levelId);

    const info = await safeGetAccountInfo(connection, pda, { commitment });
    if (!info?.data) return null;

    const data = new Uint8Array(info.data);
    const off = 8;
    const dv = new DataView(data.buffer, data.byteOffset, data.byteLength);

    const minLen = off + 32 + 32 + 1 + 1 + 8 + 8 + 8;
    if (data.length < minLen) return null;

    return {
      player: new PublicKey(data.slice(off, off + 32)),
      authority: new PublicKey(data.slice(off + 32, off + 64)),
      level: data[off + 64],
      bump: data[off + 65],
      activated_at: Number(dv.getBigInt64(off + 66, true)),
      cycles: Number(dv.getBigUint64(off + 74, true)),
      slots_filled: Number(dv.getBigUint64(off + 82, true)),
    };
  } catch (e) {
    if (is429Err(e)) return null;
    return null;
  }
}

/* ------------------------------------------------------------
   ACTIVE LEVELS — BATCHED (HELIUS OPTIMIZED)
   Использует getMultipleAccountsInfo для минимизации RPC запросов
------------------------------------------------------------ */
export async function fetchAllActiveLevels(
  ctx: unknown,
  playerPda: PublicKey
): Promise<number[]> {
  const connection = getConn(ctx);
  const active: number[] = [];

  // Derive all level state PDAs first (no RPC needed)
  const levelPdas: { level: number; pda: PublicKey }[] = [];
  for (let lvl = 1; lvl <= MAX_LEVELS; lvl++) {
    const [pda] = deriveLevelStatePda(playerPda, lvl);
    levelPdas.push({ level: lvl, pda });
  }

  // OPTIMIZATION: Batch fetch all level states in ONE request
  // Instead of 16 sequential requests, we make 1 batched request
  try {
    const pdaKeys = levelPdas.map((item) => item.pda);
    const accounts = await HeliusRPCOptimizer.getMultipleAccountsInfo(
      connection,
      pdaKeys,
      DEFAULT_COMMITMENT
    );

    // Parse each account
    accounts.forEach((info, index) => {
      if (!info?.data) return;

      const data = new Uint8Array(info.data);
      const off = 8;
      
      const minLen = off + 32 + 32 + 1 + 1 + 8 + 8 + 8;
      if (data.length < minLen) return;

      const dv = new DataView(data.buffer, data.byteOffset, data.byteLength);
      const activated_at = Number(dv.getBigInt64(off + 66, true));

      if (activated_at > 0) {
        active.push(levelPdas[index].level);
      }
    });
  } catch (e) {
    // Fallback to sequential fetch on error
    if (HELIUS_CONFIG.features.logRpcWarnings) {
      console.warn("[sdk/fetch] Batch fetch failed, falling back to sequential:", e);
    }
    
    for (let lvl = 1; lvl <= MAX_LEVELS; lvl++) {
      const st = await fetchLevelStateNullable(connection, playerPda, lvl);
      if (st && st.activated_at > 0) {
        active.push(lvl);
      }
      await throttle(100);
    }
  }

  return active;
}
