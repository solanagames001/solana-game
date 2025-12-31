// lib/sdk/referral.ts
// ------------------------------------------------------------
// Solana Game SDK v3.10 — Referral capture helper (CLEAN FINAL)
// ------------------------------------------------------------
// • referrer = будущий upline1 (структурный)
// • фиксируется ТОЛЬКО при register_player
// • выплаты определяются ОЧЕРЕДЬЮ OWNER (X3), а не фактом ref
// • SDK хранит referrer временно (UX only)
// • cluster-scoped (devnet / mainnet isolation)
// • TTL = 30 дней
// • SSR-safe
// ------------------------------------------------------------

import { PublicKey } from "@solana/web3.js";
import { CLUSTER } from "./pda";

/* ------------------------------------------------------------
   CONSTANTS
------------------------------------------------------------ */

const REF_KEY_PREFIX = "referrer.v1";
const REF_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

/* ------------------------------------------------------------
   SSR CHECK
------------------------------------------------------------ */

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

/* ------------------------------------------------------------
   STORAGE KEY (cluster-scoped)
------------------------------------------------------------ */

function refKey(): string {
  return `${REF_KEY_PREFIX}:${CLUSTER}`;
}

/* ------------------------------------------------------------
   INTERNAL HELPERS
------------------------------------------------------------ */

function save(pk: string): void {
  if (!isBrowser()) return;

  try {
    localStorage.setItem(
      refKey(),
      JSON.stringify({ pk, ts: Date.now() })
    );
  } catch (e) {
    console.warn("[sdk/referral.save] failed:", e);
  }
}

function load(): string | null {
  if (!isBrowser()) return null;

  try {
    const raw = localStorage.getItem(refKey());
    if (!raw) return null;

    const data = JSON.parse(raw) as { pk: string; ts: number };
    if (!data?.pk || !data.ts) return null;

    // TTL — UX only
    if (Date.now() - data.ts > REF_TTL_MS) {
      localStorage.removeItem(refKey());
      return null;
    }

    return data.pk;
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------
   PUBLIC API
------------------------------------------------------------ */

/**
 * Захватывает `?ref=<pubkey>` из URL.
 *
 * Правила:
 * • ref = будущий upline1
 * • self-referral запрещён
 * • применяется ТОЛЬКО при register_player
 */
export function captureRefFromUrl(
  currentWallet?: PublicKey | null
): boolean {
  if (!isBrowser()) return false;

  try {
    const url = new URL(window.location.href);
    const ref = url.searchParams.get("ref");
    if (!ref) return false;

    const pk = new PublicKey(ref);
    const ref58 = pk.toBase58();

    // self-referral guard
    if (currentWallet && currentWallet.toBase58() === ref58) {
      if (process.env.NODE_ENV !== "production") {
        console.debug("[sdk/referral] self-referral ignored");
      }
      return false;
    }

    save(ref58);

    if (process.env.NODE_ENV !== "production") {
      console.debug(`[sdk/referral] captured upline1 (${CLUSTER}):`, ref58);
    }

    return true;
  } catch (e) {
    console.warn("[sdk/referral.capture] failed:", e);
    return false;
  }
}

/**
 * Ручная установка referrer (для тестов).
 */
export function setReferrer(pk: string): boolean {
  if (!isBrowser()) return false;

  try {
    new PublicKey(pk); // validate
    save(pk);

    if (process.env.NODE_ENV !== "production") {
      console.debug(`[sdk/referral] set upline1 manually (${CLUSTER}):`, pk);
    }

    return true;
  } catch {
    console.warn("[sdk/referral] invalid pubkey, ignored");
    return false;
  }
}

/**
 * Возвращает сохранённый referrer (upline1) или null.
 */
export function getReferrer(): PublicKey | null {
  if (!isBrowser()) return null;

  try {
    const pk = load();
    return pk ? new PublicKey(pk) : null;
  } catch {
    return null;
  }
}

/**
 * Очистка referrer (UX only).
 * Вызывается ТОЛЬКО после finalized register_player.
 */
export function clearReferrer(): void {
  if (!isBrowser()) return;

  try {
    localStorage.removeItem(refKey());
  } catch (e) {
    console.warn("[sdk/referral.clear] failed:", e);
  }
}
