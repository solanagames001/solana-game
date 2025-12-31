// lib/sdk/helius/rpc-tracker.ts
// ------------------------------------------------------------
// Solana Game v3.10 — RPC USAGE TRACKER
// Monitors and tracks RPC usage for optimization
// ------------------------------------------------------------

import { PublicKey, Connection } from "@solana/web3.js";
import { HELIUS_CONFIG } from "./config";
import { HeliusRPCOptimizer } from "./rpc-optimizer";

/* ------------------------------------------------------------
   RPC TRACKER
   Tracks RPC usage and provides alerts/fallback
------------------------------------------------------------ */

class RPCTracker {
  private static requests = 0;
  private static resetInterval = 60000; // 1 minute
  private static lastReset = Date.now();
  private static intervalId: ReturnType<typeof setInterval> | null = null;

  /* ------------------------------------------------------------
     INITIALIZATION
  ------------------------------------------------------------ */

  static init(): void {
    if (this.intervalId) return;

    // Reset counter every minute
    this.intervalId = setInterval(() => {
      if (HELIUS_CONFIG.features.logRpcWarnings && this.requests > 0) {
        console.log(`[RPCTracker] Requests in last minute: ${this.requests}`);
      }
      this.requests = 0;
      this.lastReset = Date.now();
    }, this.resetInterval);
  }

  static destroy(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /* ------------------------------------------------------------
     TRACKING
  ------------------------------------------------------------ */

  static trackRequest(method: string): void {
    this.requests++;

    // Warning at 80% of limit
    if (this.requests === Math.floor(HELIUS_CONFIG.limits.maxRequestsPerMinute * 0.8)) {
      console.warn(`⚠️ [RPCTracker] High RPC usage: ${this.requests} requests/min`);
    }

    // Switch to fallback at limit
    if (this.requests >= HELIUS_CONFIG.limits.maxRequestsPerMinute) {
      console.error(`🚨 [RPCTracker] RPC limit exceeded, switching to fallback`);
      HeliusRPCOptimizer.switchToFallback();
    }

    if (HELIUS_CONFIG.features.logRpcWarnings && process.env.NODE_ENV !== 'production') {
      console.debug(`[RPCTracker] ${method} (${this.requests}/${HELIUS_CONFIG.limits.maxRequestsPerMinute})`);
    }
  }

  /* ------------------------------------------------------------
     OPTIMIZED BALANCE GETTER (with cache)
  ------------------------------------------------------------ */

  static async getBalanceWithCache(
    connection: Connection,
    publicKey: PublicKey
  ): Promise<number> {
    this.trackRequest('getBalance');
    return HeliusRPCOptimizer.getBalance(connection, publicKey);
  }

  /* ------------------------------------------------------------
     OPTIMIZED ACCOUNT INFO (with cache)
  ------------------------------------------------------------ */

  static async getAccountInfoWithCache(
    connection: Connection,
    publicKey: PublicKey
  ): Promise<unknown> {
    this.trackRequest('getAccountInfo');
    return HeliusRPCOptimizer.getAccountInfo(connection, publicKey);
  }

  /* ------------------------------------------------------------
     STATISTICS
  ------------------------------------------------------------ */

  static getStats(): {
    requests: number;
    limit: number;
    percentage: number;
    resetIn: number;
  } {
    const now = Date.now();
    return {
      requests: this.requests,
      limit: HELIUS_CONFIG.limits.maxRequestsPerMinute,
      percentage: (this.requests / HELIUS_CONFIG.limits.maxRequestsPerMinute) * 100,
      resetIn: this.resetInterval - (now - this.lastReset),
    };
  }

  static logStats(): void {
    const stats = this.getStats();
    console.log(`[RPCTracker] ${stats.requests}/${stats.limit} (${stats.percentage.toFixed(1)}%), reset in ${(stats.resetIn / 1000).toFixed(0)}s`);
  }
}

// Auto-initialize in client context
if (typeof window !== 'undefined') {
  RPCTracker.init();
}

export { RPCTracker };

