// lib/sdk/toast.ts
// ------------------------------------------------------------
// Solana Game SDK v3.10 — Lightweight toast dispatcher
// Strict, minimal, SSR-safe. No emojis.
// ------------------------------------------------------------

export type ToastType = "success" | "error" | "info";

export interface ToastPayload {
  id: string;
  message: string;
  type: ToastType;
  link?: string;
}

type Listener = (payload: ToastPayload) => void;

const listeners = new Set<Listener>();

/* ------------------------------------------------------------
   Subscribe / Unsubscribe
------------------------------------------------------------ */
export function onToast(cb: Listener): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

/* ------------------------------------------------------------
   Core toast dispatcher
------------------------------------------------------------ */
let counter = 0;

function nextToastId(): string {
  // ts + counter → отсутствие коллизий при hot reload / RSC / StrictMode
  counter++;
  return `t${Date.now()}-${counter}`;
}

function baseToast(
  message: string,
  type: ToastType = "info",
  link?: string
): string {
  if (typeof message !== "string") {
    console.warn("[toast] invalid message:", message);
    message = String(message ?? "");
  }

  const id = nextToastId();
  const payload: ToastPayload = { id, message, type, link };

  // Debug logging
  console.log("[toast] dispatching:", { message, type, listenersCount: listeners.size });

  // Рассылка всем подписчикам
  for (const cb of listeners) {
    try {
      cb(payload);
    } catch (e) {
      console.warn("[toast] listener failed:", e);
    }
  }

  return id;
}

/* ------------------------------------------------------------
   Public API
------------------------------------------------------------ */
export const toast = Object.assign(baseToast, {
  success: (msg: string, link?: string) => baseToast(msg, "success", link),
  error: (msg: string, link?: string) => baseToast(msg, "error", link),
  info: (msg: string, link?: string) => baseToast(msg, "info", link),
});
