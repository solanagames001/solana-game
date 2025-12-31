// lib/sdk/history/helpers.ts
// ------------------------------------------------------------
// Solana Game SDK v3.10 — History & Active Levels Helpers
// ------------------------------------------------------------
// • Полностью SSR-safe
// • Wallet-scoped
// • Без legacy
// • Mainnet-safe notifications
// ------------------------------------------------------------

import { PublicKey } from "@solana/web3.js";
import { derivePlayerPda, CLUSTER } from "../pda";
import { MAX_LEVELS } from "../prices";
import type { TxEvent, TxKind } from "./types";

/* ------------------------------------------------------------
   CONSTANTS
------------------------------------------------------------ */

export const FEE_BUFFER_SOL = 0.003;

const ACTIVE_KEY_PREFIX = "levels-active";
const NO_WALLET = "no-wallet";

const DUMMY_PK: PublicKey = new PublicKey(
  "11111111111111111111111111111111"
);

/* ------------------------------------------------------------
   ENV / SSR HELPERS
------------------------------------------------------------ */

function isClient(): boolean {
  return typeof window !== "undefined" && !!window.localStorage;
}

function isRealWallet(addr?: string | null): boolean {
  return !!addr && addr !== NO_WALLET;
}

/* ------------------------------------------------------------
   EVENT TYPE GUARD
------------------------------------------------------------ */

const VALID_KINDS: ReadonlySet<TxKind> = new Set<TxKind>([
  "ACTIVATE",
  "RECYCLE",
  "RECYCLE_OPEN",
  "CYCLE_CLOSE",
  "REWARD_60",
  "REF_T1_13",
  "REF_T2_8",
  "REF_T3_5",
  "REFERRAL_ACTIVATION",
  "REFERRAL_REGISTERED",
  "TREASURY_14",
]);

export function isTxEvent(ev: unknown): ev is TxEvent {
  if (!ev || typeof ev !== "object") return false;

  const anyEv = ev as Partial<TxEvent>;

  if (!anyEv.id || typeof anyEv.id !== "string") return false;
  if (!anyEv.sig || typeof anyEv.sig !== "string") return false;

  if (
    !Number.isInteger(anyEv.levelId) ||
    anyEv.levelId! < 1 ||
    anyEv.levelId! > MAX_LEVELS
  ) {
    return false;
  }

  if (!VALID_KINDS.has(anyEv.kind as TxKind)) return false;

  if (
    typeof anyEv.ts !== "number" ||
    !Number.isFinite(anyEv.ts)
  ) {
    return false;
  }

  if (
    "synthetic" in anyEv &&
    anyEv.synthetic != null &&
    typeof anyEv.synthetic !== "boolean"
  ) {
    return false;
  }

  return true;
}

/* ------------------------------------------------------------
   PDA HELPERS
------------------------------------------------------------ */

export function safePlayerPda(authority: PublicKey): PublicKey {
  try {
    const [pda] = derivePlayerPda(authority);
    return pda;
  } catch (e) {
    console.error("[safePlayerPda] failed:", e);
    return DUMMY_PK;
  }
}

/* ------------------------------------------------------------
   LOCAL STORAGE — ACTIVE LEVELS
------------------------------------------------------------ */

function lsKey(address: string): string {
  return `${ACTIVE_KEY_PREFIX}:${CLUSTER}:${address}`;
}

export function loadActiveFromLS(
  address: string | null | undefined
): Set<number> {
  if (!isClient() || !isRealWallet(address)) return new Set();

  try {
    const raw = localStorage.getItem(lsKey(address));
    if (!raw) return new Set();

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();

    const valid = parsed.filter(
      (x) =>
        Number.isInteger(x) &&
        x >= 1 &&
        x <= MAX_LEVELS
    );

    return new Set(valid);
  } catch (e) {
    console.warn("[loadActiveFromLS] corrupted JSON:", e);
    return new Set();
  }
}

export function saveActiveToLS(
  address: string | null | undefined,
  set: Set<number>
): void {
  if (!isClient() || !isRealWallet(address)) return;

  try {
    const sorted = [...set.values()].sort((a, b) => a - b);
    localStorage.setItem(lsKey(address), JSON.stringify(sorted));
  } catch (e) {
    console.warn("[saveActiveToLS] write failed:", e);
  }
}

/* ------------------------------------------------------------
   LOCAL STORAGE — LEVEL STATES
------------------------------------------------------------ */

function levelStatesKey(address: string): string {
  return `levels-states:${CLUSTER}:${address}`;
}

export function loadLevelStatesFromLS(
  address: string | null | undefined
): Map<number, { slots_filled: number; cycles: number; ts: number }> {
  if (!isClient() || !isRealWallet(address)) return new Map();

  try {
    const raw = localStorage.getItem(levelStatesKey(address));
    if (!raw) return new Map();

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return new Map();

    const result = new Map<number, { slots_filled: number; cycles: number; ts: number }>();
    
    for (const [key, value] of Object.entries(parsed)) {
      const levelId = Number(key);
      if (
        !Number.isInteger(levelId) ||
        levelId < 1 ||
        levelId > MAX_LEVELS
      ) continue;

      const state = value as any;
      if (
        state &&
        typeof state === "object" &&
        Number.isInteger(state.slots_filled) &&
        Number.isInteger(state.cycles) &&
        typeof state.ts === "number"
      ) {
        result.set(levelId, {
          slots_filled: state.slots_filled,
          cycles: state.cycles,
          ts: state.ts,
        });
      }
    }

    return result;
  } catch (e) {
    console.warn("[loadLevelStatesFromLS] corrupted JSON:", e);
    return new Map();
  }
}

export function saveLevelStatesToLS(
  address: string | null | undefined,
  states: Map<number, { slots_filled: number; cycles: number; ts: number }>
): void {
  if (!isClient() || !isRealWallet(address)) return;

  try {
    const obj: Record<string, { slots_filled: number; cycles: number; ts: number }> = {};
    for (const [levelId, state] of states.entries()) {
      obj[String(levelId)] = state;
    }
    localStorage.setItem(levelStatesKey(address), JSON.stringify(obj));
  } catch (e) {
    console.warn("[saveLevelStatesToLS] write failed:", e);
  }
}

/* ------------------------------------------------------------
   UI EVENT NOTIFIERS (wallet-scoped)
------------------------------------------------------------ */

export function notifyHistoryUpdated(addr?: string | null): void {
  if (!isClient() || !isRealWallet(addr)) return;

  try {
    window.dispatchEvent(
      new CustomEvent("history-updated", {
        detail: {
          addr,
          ts: Date.now(),
        },
      })
    );
  } catch (e) {
    console.warn("[notifyHistoryUpdated] dispatch failed:", e);
  }
}

export function notifyLevelStateChanged(
  levelId: number,
  wallet?: string | null
): void {
  if (!isClient() || !isRealWallet(wallet)) return;

  const valid =
    levelId === -1 ||
    (Number.isInteger(levelId) &&
      levelId >= 1 &&
      levelId <= MAX_LEVELS);

  if (!valid) return;

  try {
    window.dispatchEvent(
      new CustomEvent("levels-state-changed", {
        detail: {
          levelId,
          wallet,
          ts: Date.now(),
        },
      })
    );
  } catch (e) {
    console.warn("[notifyLevelStateChanged] dispatch failed:", e);
  }
}
