// lib/sdk/history/local.ts
// ------------------------------------------------------------
// Solana Game SDK v3.10 — Local History Cache (Frontend)
// ------------------------------------------------------------
// • SSR-safe
// • Wallet + Cluster scoped
// • Без legacy
// • Жёсткая валидация событий
// ------------------------------------------------------------

import type { TxEvent } from "./types";
import { isTxEvent } from "./helpers";
import { CLUSTER } from "../pda";

/* ------------------------------------------------------------
   STORAGE KEY
------------------------------------------------------------ */

/**
 * Формат ключа:
 *   sg-history.v1:<cluster>:<wallet>
 *
 * Это КРИТИЧНО для devnet → mainnet миграции
 */
function historyKey(wallet: string): string {
  return `sg-history.v1:${CLUSTER}:${wallet}`;
}

/* ------------------------------------------------------------
   SSR / RUNTIME CHECK
------------------------------------------------------------ */

function isClient(): boolean {
  return typeof window !== "undefined" && !!window.localStorage;
}

/* ------------------------------------------------------------
   LOAD LOCAL HISTORY
   • SSR-safe
   • Только валидные TxEvent
   • Без сортировки (UI решает)
------------------------------------------------------------ */

export function loadLocalHistory(wallet: string): TxEvent[] {
  if (!isClient() || !wallet) return [];

  try {
    const raw = window.localStorage.getItem(historyKey(wallet));
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed.filter((ev: unknown) => isTxEvent(ev)) as TxEvent[];
  } catch (err) {
    console.warn("[sdk/history/local] load failed:", err);
    return [];
  }
}

/* ------------------------------------------------------------
   SAVE LOCAL HISTORY
   • SSR-safe
   • Wallet + Cluster scoped
   • Только валидные события
------------------------------------------------------------ */

export function saveLocalHistory(
  wallet: string,
  events: TxEvent[]
): void {
  if (!isClient() || !wallet) return;

  try {
    const valid = events.filter((ev) => isTxEvent(ev));
    window.localStorage.setItem(
      historyKey(wallet),
      JSON.stringify(valid)
    );
  } catch (err) {
    console.warn("[sdk/history/local] save failed:", err);
  }
}

/* ------------------------------------------------------------
   CLEAR (optional, for dev / reset)
------------------------------------------------------------ */

export function clearLocalHistory(wallet: string): void {
  if (!isClient() || !wallet) return;
  window.localStorage.removeItem(historyKey(wallet));
}

/* ------------------------------------------------------------
   CLEAR REFERRAL EVENTS
   Удаляет все события REFERRAL_REGISTERED.
   Используется для очистки старых "рандомных" рефералов.
------------------------------------------------------------ */

export function clearReferralEvents(wallet: string): void {
  if (!isClient() || !wallet) return;

  try {
    const all = loadLocalHistory(wallet);
    const filtered = all.filter((ev) => ev.kind !== "REFERRAL_REGISTERED");
    
    if (filtered.length < all.length) {
      saveLocalHistory(wallet, filtered);
      console.log(`[sdk/history/local] Cleared ${all.length - filtered.length} referral events for ${wallet}`);
    }
  } catch (err) {
    console.warn("[sdk/history/local] clearReferralEvents failed:", err);
  }
}
