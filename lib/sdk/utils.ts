// lib/sdk/utils.ts
// ------------------------------------------------------------
// Solana Game SDK — Universal Helpers (v3.10 FINAL, MAINNET SAFE)
// ------------------------------------------------------------
// Автономные утилиты без legacy, полностью SSR-safe:
// • cn()
// • byte helpers (u8, u64le)
// • sha256 universal (browser + node + edge)
// • sleep()
// • lamports formatting
// • explorerTxUrl() — source of truth: CLUSTER (from pda.ts)
// ------------------------------------------------------------

import { LAMPORTS_PER_SOL } from "./prices";
import { CLUSTER } from "./pda";

/* ------------------------------------------------------------
   CLASSNAMES (Tailwind-style)
------------------------------------------------------------ */
export function cn(
  ...classes: Array<string | undefined | null | false>
): string {
  return classes.filter(Boolean).join(" ");
}

/* ------------------------------------------------------------
   BYTE HELPERS
------------------------------------------------------------ */
export function u8(
  ...parts: Array<Uint8Array | undefined | null>
): Uint8Array {
  const valid = parts.filter((x): x is Uint8Array => !!x);
  const total = valid.reduce((sum, arr) => sum + arr.length, 0);

  const out = new Uint8Array(total);
  let offset = 0;

  for (const arr of valid) {
    out.set(arr, offset);
    offset += arr.length;
  }
  return out;
}

export function u64le(n: number | bigint): Uint8Array {
  let value = typeof n === "bigint" ? n : BigInt(Math.floor(n));
  const buf = new Uint8Array(8);

  for (let i = 0; i < 8; i++) {
    buf[i] = Number(value & 0xffn);
    value >>= 8n;
  }
  return buf;
}

/* ------------------------------------------------------------
   SAFE ARRAYBUFFER NORMALIZER
------------------------------------------------------------ */
function normalizeToArrayBuffer(
  input: Uint8Array | ArrayBuffer | SharedArrayBuffer
): ArrayBuffer {
  if (input instanceof Uint8Array) return input.slice().buffer;
  if (input instanceof ArrayBuffer) return input;

  // SharedArrayBuffer (edge / modern runtimes)
  if (typeof SharedArrayBuffer !== "undefined" && input instanceof SharedArrayBuffer) {
    const tmp = new Uint8Array(input.byteLength);
    tmp.set(new Uint8Array(input));
    return tmp.buffer;
  }

  throw new Error("normalizeToArrayBuffer: unsupported input");
}

/* ------------------------------------------------------------
   UNIVERSAL SHA-256 (browser + node + edge)
------------------------------------------------------------ */
export async function sha256(
  input: Uint8Array | ArrayBuffer | SharedArrayBuffer
): Promise<Uint8Array> {
  const buf = normalizeToArrayBuffer(input);

  // WebCrypto (browser + node >=18 + edge)
  if (globalThis.crypto?.subtle) {
    const hash = await globalThis.crypto.subtle.digest("SHA-256", buf);
    return new Uint8Array(hash);
  }

  // Node fallback (older runtimes)
  try {
    const crypto = await import("crypto");
    const h = crypto.createHash("sha256");
    h.update(new Uint8Array(buf));
    const out = h.digest();
    return out instanceof Uint8Array ? out : new Uint8Array(out);
  } catch {
    throw new Error("sha256: both WebCrypto and node fallback failed");
  }
}

/* ------------------------------------------------------------
   MISC HELPERS
------------------------------------------------------------ */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function formatLamports(
  lamports: number | bigint,
  decimals = 4
): string {
  const raw = typeof lamports === "bigint" ? Number(lamports) : lamports;
  const safe = Number.isFinite(raw) ? raw : 0;

  return `${(safe / Number(LAMPORTS_PER_SOL)).toFixed(decimals)} SOL`;
}

/* ------------------------------------------------------------
   EXPLORER URL BUILDER (source of truth: CLUSTER)
   - mainnet-beta: clean URL without cluster param
   - devnet/testnet: explicit cluster param
------------------------------------------------------------ */
export function explorerTxUrl(sig: string): string {
  const base = `https://explorer.solana.com/tx/${sig}`;

  if (CLUSTER === "mainnet-beta") return base;
  return `${base}?cluster=${encodeURIComponent(CLUSTER)}`;
}

export function explorerAddressUrl(address: string): string {
  const base = `https://explorer.solana.com/address/${address}`;

  if (CLUSTER === "mainnet-beta") return base;
  return `${base}?cluster=${encodeURIComponent(CLUSTER)}`;
}
