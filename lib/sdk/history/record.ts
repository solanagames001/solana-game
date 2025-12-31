// lib/sdk/history/record.ts
// ------------------------------------------------------------
// Solana Game SDK v3.10 — History Recorder (LOCAL ONLY)
// ------------------------------------------------------------
// • Wallet-scoped
// • Dedup by id/sig
// • Sort DESC by ts
// • Notify UI listeners
// ------------------------------------------------------------

import type { TxEvent, TxKind } from "./types";
import { isTxEvent, notifyHistoryUpdated } from "./helpers";
import { loadLocalHistory, saveLocalHistory } from "./local";

/* ------------------------------------------------------------ */
/* ENV HELPER (SSR-safe)                                       */
/* ------------------------------------------------------------ */

function isClient(): boolean {
  return typeof window !== "undefined" && !!window.localStorage;
}

/* ------------------------------------------------------------ */
/* INTERNAL: append events -> LS (wallet scoped)               */
/* ------------------------------------------------------------ */

function appendHistory(wallet: string, newEvents: TxEvent[]): void {
  if (!isClient()) return;
  if (!wallet || wallet === "no-wallet") return;
  if (!Array.isArray(newEvents) || newEvents.length === 0) return;

  try {
    const current = loadLocalHistory(wallet);
    const merged = [...newEvents, ...current];

    const seen = new Set<string>();
    const final: TxEvent[] = [];

    for (const ev of merged) {
      if (!isTxEvent(ev)) continue;
      const key = ev.id || ev.sig;
      if (!key || seen.has(key)) continue;
      seen.add(key);
      final.push(ev);
    }

    // newest first
    final.sort((a, b) => b.ts - a.ts);

    saveLocalHistory(wallet, final);

    // New unified notification
    notifyHistoryUpdated(wallet);

    // Legacy compatibility - отправляем оба события для совместимости
    try {
      window.dispatchEvent(new CustomEvent("levels-history-changed", {
        detail: { wallet, ts: Date.now() }
      }));
    } catch (e) {
      // Fallback to simple event if CustomEvent fails
      window.dispatchEvent(new Event("levels-history-changed"));
    }
  } catch (e) {
    console.warn("[history/record] append failed:", e);
  }
}

/* ------------------------------------------------------------ */
/* PUBLIC: generic recorder                                    */
/* ------------------------------------------------------------ */

export function recordTxEvent(params: {
  wallet: string;
  levelId: number;
  kind: TxKind;
  sig: string;
  slot?: number | null;
  ts?: number;
}): void {
  if (!isClient()) return;

  const { wallet, levelId, kind, sig } = params;

  if (!wallet || wallet === "no-wallet") return;
  if (!sig || !Number.isInteger(levelId) || levelId < 1) return;

  const ts =
    typeof params.ts === "number" && Number.isFinite(params.ts)
      ? params.ts
      : Date.now();

  const ev: TxEvent = {
    id: sig,
    sig,
    levelId,
    kind,
    slot:
      typeof params.slot === "number"
        ? params.slot
        : params.slot ?? null,
    ts,
  };

  appendHistory(wallet, [ev]);
}

/* ------------------------------------------------------------ */
/* PUBLIC: shortcuts                                           */
/* ------------------------------------------------------------ */

export function recordActivate(
  wallet: string,
  levelId: number,
  sig: string
): void {
  recordTxEvent({
    wallet,
    levelId,
    kind: "ACTIVATE",
    sig,
    slot: null,
  });
}
