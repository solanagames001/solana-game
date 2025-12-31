// lib/sdk/index.ts
// ------------------------------------------------------------
// Solana Game SDK v3.10 — HELIUS OPTIMIZED
// Frontend API (единый фасадный экспорт)
// ------------------------------------------------------------

// Core
export * from "./pda";
export * from "./prices";
export * from "./fetch";

// Helius RPC Optimization (v3.10+)
export * from "./helius";

// Actions
export * from "./activate";
export * from "./register";

// Tools
export * from "./referral";
export * from "./tx";
export * from "./toast";
export * from "./utils";

// Hooks
export * from "./hooks/usePlayer";

// History subsystem (SSR-safe: все файлы имеют window-guard)
export * from "./history/types";
export * from "./history/derive";
export * from "./history/helpers";
export * from "./history/local";
