// lib/sdk/helius/rpc-optimizer.ts
// ------------------------------------------------------------
// Solana Game v3.10 — HELIUS RPC OPTIMIZER
// Centralized RPC manager with caching, batching, and throttling
// ALL Helius calls MUST pass through this module
// ------------------------------------------------------------

import { Connection, PublicKey } from "@solana/web3.js";
import type { Commitment } from "@solana/web3.js";

// AccountInfo type - inline definition to avoid import issues across web3.js versions
interface AccountInfoLike {
  data: Buffer;
  executable: boolean;
  lamports: number;
  owner: PublicKey;
  rentEpoch?: number;
}
import { HELIUS_CONFIG } from "./config";

/* ------------------------------------------------------------
   LRU CACHE IMPLEMENTATION
------------------------------------------------------------ */

// Type alias for compatibility
type AccountInfo<T> = AccountInfoLike & { data: T };

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class LRUCache<T> {
  private cache = new Map<string, CacheEntry<T>>();
  private maxSize: number;

  constructor(maxSize = 1000) {
    this.maxSize = maxSize;
  }

  get(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    // LRU: Move to end (most recently used)
    this.cache.delete(key);
    this.cache.set(key, entry);
    return entry.data;
  }

  set(key: string, data: T, ttl: number): void {
    // Evict oldest if at capacity
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

/* ------------------------------------------------------------
   BATCH REQUEST QUEUE
------------------------------------------------------------ */

interface PendingRequest {
  method: string;
  params: unknown[];
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
}

/* ------------------------------------------------------------
   RPC METRICS
------------------------------------------------------------ */

interface RPCMetrics {
  totalRequests: number;
  cachedHits: number;
  batchedRequests: number;
  throttledRequests: number;
  failedRequests: number;
  lastResetTime: number;
}

/* ------------------------------------------------------------
   HELIUS RPC OPTIMIZER CLASS
------------------------------------------------------------ */

class HeliusRPCOptimizer {
  // Caches for different data types
  private static accountCache = new LRUCache<AccountInfo<Buffer> | null>(500);
  private static balanceCache = new LRUCache<number>(200);
  private static signatureCache = new LRUCache<unknown>(100);
  private static transactionCache = new LRUCache<unknown>(100);

  // Batch queue
  private static pendingRequests: PendingRequest[] = [];
  private static batchTimeout: ReturnType<typeof setTimeout> | null = null;

  // Throttling state
  private static lastCallTs = 0;
  private static globalBackoffUntil = 0;
  private static consecutiveErrors = 0;

  // Connection management
  private static primaryConnection: Connection | null = null;
  private static fallbackConnection: Connection | null = null;
  private static usingFallback = false;

  // Metrics
  private static metrics: RPCMetrics = {
    totalRequests: 0,
    cachedHits: 0,
    batchedRequests: 0,
    throttledRequests: 0,
    failedRequests: 0,
    lastResetTime: Date.now(),
  };

  /* ------------------------------------------------------------
     CONNECTION MANAGEMENT
  ------------------------------------------------------------ */

  static getConnection(): Connection {
    if (this.usingFallback && this.fallbackConnection) {
      return this.fallbackConnection;
    }

    if (!this.primaryConnection) {
      this.primaryConnection = new Connection(
        HELIUS_CONFIG.endpoints.primary,
        { commitment: 'confirmed' }
      );
    }

    return this.primaryConnection;
  }

  static getFallbackConnection(): Connection {
    if (!this.fallbackConnection) {
      this.fallbackConnection = new Connection(
        HELIUS_CONFIG.endpoints.fallback,
        { commitment: 'confirmed' }
      );
    }
    return this.fallbackConnection;
  }

  static switchToFallback(): void {
    if (HELIUS_CONFIG.features.logRpcWarnings) {
      console.warn('[HeliusRPCOptimizer] Switching to fallback RPC');
    }
    this.usingFallback = true;
    
    // Auto-recover after backoff period
    setTimeout(() => {
      this.usingFallback = false;
      if (HELIUS_CONFIG.features.logRpcWarnings) {
        console.log('[HeliusRPCOptimizer] Recovered to primary RPC');
      }
    }, HELIUS_CONFIG.limits.throttle.maxBackoff);
  }

  static resetToHelius(): void {
    this.usingFallback = false;
    this.consecutiveErrors = 0;
    this.globalBackoffUntil = 0;
  }

  /* ------------------------------------------------------------
     THROTTLING
  ------------------------------------------------------------ */

  private static async throttle(): Promise<void> {
    const now = Date.now();
    const { minDelay } = HELIUS_CONFIG.limits.throttle;

    // Check backoff
    if (now < this.globalBackoffUntil) {
      const wait = this.globalBackoffUntil - now;
      this.metrics.throttledRequests++;
      if (HELIUS_CONFIG.features.logRpcWarnings) {
        console.warn(`[HeliusRPCOptimizer] In backoff, waiting ${wait}ms`);
      }
      await new Promise((r) => setTimeout(r, wait));
      return;
    }

    // Rate limiting
    const diff = now - this.lastCallTs;
    if (diff < minDelay) {
      await new Promise((r) => setTimeout(r, minDelay - diff));
    }

    this.lastCallTs = Date.now();
  }

  private static enterBackoff(): void {
    const { backoffDuration, maxBackoff } = HELIUS_CONFIG.limits.throttle;
    
    this.consecutiveErrors++;
    const backoff = Math.min(
      backoffDuration * Math.pow(2, this.consecutiveErrors - 1),
      maxBackoff
    );
    
    this.globalBackoffUntil = Date.now() + backoff;
    
    if (HELIUS_CONFIG.features.logRpcWarnings) {
      console.warn(`[HeliusRPCOptimizer] Entering ${backoff}ms backoff (error #${this.consecutiveErrors})`);
    }

    // Switch to fallback after 3 consecutive errors
    if (this.consecutiveErrors >= 3) {
      this.switchToFallback();
    }
  }

  private static is429Error(e: unknown): boolean {
    if (!e) return false;
    const msg = String((e as Error)?.message || e?.toString?.() || "");
    return msg.includes("429") || msg.includes("Too Many Requests") || msg.includes("rate limit");
  }

  /* ------------------------------------------------------------
     CACHED ACCOUNT INFO
  ------------------------------------------------------------ */

  static async getAccountInfo(
    connection: Connection,
    publicKey: PublicKey,
    commitment: Commitment = 'confirmed'
  ): Promise<AccountInfo<Buffer> | null> {
    const cacheKey = `account:${publicKey.toBase58()}:${commitment}`;
    
    // Check cache first
    if (HELIUS_CONFIG.features.aggressiveCaching) {
      const cached = this.accountCache.get(cacheKey);
      if (cached !== null) {
        this.metrics.cachedHits++;
        return cached;
      }
      // Special case: cached null means account doesn't exist
      if (this.accountCache.has(cacheKey)) {
        this.metrics.cachedHits++;
        return null;
      }
    }

    // Throttle
    await this.throttle();
    this.metrics.totalRequests++;

    try {
      const info = await connection.getAccountInfo(publicKey, { commitment });
      
      // Cache result
      this.accountCache.set(
        cacheKey,
        info,
        HELIUS_CONFIG.limits.cacheTTL.accountInfo
      );
      
      this.consecutiveErrors = 0;
      return info;
    } catch (e) {
      this.metrics.failedRequests++;
      
      if (this.is429Error(e)) {
        this.enterBackoff();
        return null;
      }
      throw e;
    }
  }

  /* ------------------------------------------------------------
     CACHED BALANCE
  ------------------------------------------------------------ */

  static async getBalance(
    connection: Connection,
    publicKey: PublicKey,
    commitment: Commitment = 'confirmed'
  ): Promise<number> {
    const cacheKey = `balance:${publicKey.toBase58()}:${commitment}`;
    
    // Check cache first
    if (HELIUS_CONFIG.features.aggressiveCaching) {
      const cached = this.balanceCache.get(cacheKey);
      if (cached !== null) {
        this.metrics.cachedHits++;
        return cached;
      }
    }

    // Throttle
    await this.throttle();
    this.metrics.totalRequests++;

    try {
      // getBalance accepts commitment as second arg or in config object depending on version
      const balance = await connection.getBalance(publicKey);
      
      // Cache result
      this.balanceCache.set(
        cacheKey,
        balance,
        HELIUS_CONFIG.limits.cacheTTL.balance
      );
      
      this.consecutiveErrors = 0;
      return balance;
    } catch (e) {
      this.metrics.failedRequests++;
      
      if (this.is429Error(e)) {
        this.enterBackoff();
        // Return 0 on error to prevent blocking
        return 0;
      }
      throw e;
    }
  }

  /* ------------------------------------------------------------
     BATCHED REQUESTS
  ------------------------------------------------------------ */

  static async batchRequest(method: string, params: unknown[]): Promise<unknown> {
    if (!HELIUS_CONFIG.features.enableBatching) {
      // Direct request without batching
      return this.directRequest(method, params);
    }

    return new Promise((resolve, reject) => {
      this.pendingRequests.push({ method, params, resolve, reject });
      this.metrics.batchedRequests++;

      // Start batch timer if this is the first request
      if (!this.batchTimeout) {
        this.batchTimeout = setTimeout(
          () => this.executeBatch(),
          HELIUS_CONFIG.limits.batch.interval
        );
      }

      // Execute immediately if batch is full
      if (this.pendingRequests.length >= HELIUS_CONFIG.limits.batch.maxSize) {
        if (this.batchTimeout) {
          clearTimeout(this.batchTimeout);
          this.batchTimeout = null;
        }
        this.executeBatch();
      }
    });
  }

  private static async directRequest(method: string, params: unknown[]): Promise<unknown> {
    await this.throttle();
    this.metrics.totalRequests++;

    const response = await fetch(HELIUS_CONFIG.endpoints.primary, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: Math.random().toString(36).slice(2),
        method,
        params,
      }),
    });

    const result = await response.json();
    
    if (result.error) {
      throw new Error(result.error.message || JSON.stringify(result.error));
    }
    
    return result.result;
  }

  private static async executeBatch(): Promise<void> {
    this.batchTimeout = null;
    
    if (this.pendingRequests.length === 0) return;

    const batch = this.pendingRequests.splice(0, HELIUS_CONFIG.limits.batch.maxSize);
    
    const requests = batch.map((req, index) => ({
      jsonrpc: '2.0',
      id: index,
      method: req.method,
      params: req.params,
    }));

    await this.throttle();
    this.metrics.totalRequests++;

    try {
      const response = await fetch(HELIUS_CONFIG.endpoints.primary, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requests),
      });

      const results = await response.json();

      // Handle both array and single response
      const resultsArray = Array.isArray(results) ? results : [results];
      
      resultsArray.forEach((result: { id: number; result?: unknown; error?: { message: string } }) => {
        const request = batch[result.id];
        if (!request) return;
        
        if (result.error) {
          request.reject(new Error(result.error.message));
        } else {
          request.resolve(result.result);
        }
      });

      this.consecutiveErrors = 0;
    } catch (e) {
      this.metrics.failedRequests++;
      
      if (this.is429Error(e)) {
        this.enterBackoff();
      }
      
      // Reject all pending requests
      batch.forEach((req) => req.reject(e as Error));
    }
  }

  /* ------------------------------------------------------------
     BATCH MULTIPLE ACCOUNTS
  ------------------------------------------------------------ */

  static async getMultipleAccountsInfo(
    connection: Connection,
    publicKeys: PublicKey[],
    commitment: Commitment = 'confirmed'
  ): Promise<(AccountInfo<Buffer> | null)[]> {
    if (publicKeys.length === 0) return [];
    
    // Check cache for all keys first
    const results: (AccountInfo<Buffer> | null)[] = new Array(publicKeys.length).fill(null);
    const uncachedKeys: { index: number; key: PublicKey }[] = [];

    if (HELIUS_CONFIG.features.aggressiveCaching) {
      publicKeys.forEach((key, index) => {
        const cacheKey = `account:${key.toBase58()}:${commitment}`;
        const cached = this.accountCache.get(cacheKey);
        
        if (cached !== null || this.accountCache.has(cacheKey)) {
          results[index] = cached;
          this.metrics.cachedHits++;
        } else {
          uncachedKeys.push({ index, key });
        }
      });
    } else {
      publicKeys.forEach((key, index) => {
        uncachedKeys.push({ index, key });
      });
    }

    // If all cached, return early
    if (uncachedKeys.length === 0) {
      return results;
    }

    // Fetch uncached accounts
    await this.throttle();
    this.metrics.totalRequests++;

    try {
      const keysToFetch = uncachedKeys.map((item) => item.key);
      
      // Use getMultipleAccountsInfo if available, otherwise fall back to sequential
      let fetchedAccounts: (AccountInfo<Buffer> | null)[];
      
      if (typeof (connection as any).getMultipleAccountsInfo === 'function') {
        fetchedAccounts = await (connection as any).getMultipleAccountsInfo(
          keysToFetch,
          commitment
        );
      } else {
        // Fallback: fetch sequentially (less efficient but compatible)
        fetchedAccounts = await Promise.all(
          keysToFetch.map(key => connection.getAccountInfo(key, { commitment }))
        );
      }

      // Populate results and cache
      uncachedKeys.forEach((item, idx) => {
        const account = fetchedAccounts[idx];
        results[item.index] = account;
        
        // Cache the result
        const cacheKey = `account:${item.key.toBase58()}:${commitment}`;
        this.accountCache.set(
          cacheKey,
          account,
          HELIUS_CONFIG.limits.cacheTTL.accountInfo
        );
      });

      this.consecutiveErrors = 0;
    } catch (e) {
      this.metrics.failedRequests++;
      
      if (this.is429Error(e)) {
        this.enterBackoff();
      }
      throw e;
    }

    return results;
  }

  /* ------------------------------------------------------------
     TRANSACTION SIGNATURE STATUS (BATCHED)
  ------------------------------------------------------------ */

  static async getSignatureStatuses(
    connection: Connection,
    signatures: string[],
    searchHistory = false
  ): Promise<unknown[]> {
    if (signatures.length === 0) return [];

    // Check cache first
    const results: unknown[] = new Array(signatures.length).fill(null);
    const uncachedSigs: { index: number; sig: string }[] = [];

    if (HELIUS_CONFIG.features.aggressiveCaching) {
      signatures.forEach((sig, index) => {
        const cacheKey = `status:${sig}`;
        const cached = this.signatureCache.get(cacheKey);
        
        if (cached !== null) {
          results[index] = cached;
          this.metrics.cachedHits++;
        } else {
          uncachedSigs.push({ index, sig });
        }
      });
    } else {
      signatures.forEach((sig, index) => {
        uncachedSigs.push({ index, sig });
      });
    }

    if (uncachedSigs.length === 0) {
      return results;
    }

    await this.throttle();
    this.metrics.totalRequests++;

    try {
      const sigsToFetch = uncachedSigs.map((item) => item.sig);
      const response = await connection.getSignatureStatuses(sigsToFetch, { searchTransactionHistory: searchHistory });

      uncachedSigs.forEach((item, idx) => {
        const status = response.value[idx];
        results[item.index] = status;
        
        // Cache confirmed/finalized statuses longer
        if (status && (status.confirmationStatus === 'confirmed' || status.confirmationStatus === 'finalized')) {
          const cacheKey = `status:${item.sig}`;
          this.signatureCache.set(
            cacheKey,
            status,
            HELIUS_CONFIG.limits.cacheTTL.transactionStatus * (status.confirmationStatus === 'finalized' ? 10 : 1)
          );
        }
      });

      this.consecutiveErrors = 0;
    } catch (e) {
      this.metrics.failedRequests++;
      
      if (this.is429Error(e)) {
        this.enterBackoff();
      }
      throw e;
    }

    return results;
  }

  /* ------------------------------------------------------------
     CACHE MANAGEMENT
  ------------------------------------------------------------ */

  static invalidateAccountCache(publicKey: PublicKey): void {
    const patterns = [
      `account:${publicKey.toBase58()}:confirmed`,
      `account:${publicKey.toBase58()}:finalized`,
      `balance:${publicKey.toBase58()}:confirmed`,
      `balance:${publicKey.toBase58()}:finalized`,
    ];
    patterns.forEach((key) => {
      this.accountCache.delete(key);
      this.balanceCache.delete(key);
    });
  }

  static clearAllCaches(): void {
    this.accountCache.clear();
    this.balanceCache.clear();
    this.signatureCache.clear();
    this.transactionCache.clear();
  }

  /* ------------------------------------------------------------
     METRICS
  ------------------------------------------------------------ */

  static getMetrics(): RPCMetrics {
    return { ...this.metrics };
  }

  static resetMetrics(): void {
    this.metrics = {
      totalRequests: 0,
      cachedHits: 0,
      batchedRequests: 0,
      throttledRequests: 0,
      failedRequests: 0,
      lastResetTime: Date.now(),
    };
  }

  static logMetrics(): void {
    const m = this.metrics;
    const duration = (Date.now() - m.lastResetTime) / 1000;
    const hitRate = m.totalRequests > 0 
      ? ((m.cachedHits / (m.totalRequests + m.cachedHits)) * 100).toFixed(1)
      : '0';
    
    console.log(`[HeliusRPCOptimizer] Metrics (${duration.toFixed(0)}s):`);
    console.log(`  Total requests: ${m.totalRequests}`);
    console.log(`  Cache hit rate: ${hitRate}%`);
    console.log(`  Batched: ${m.batchedRequests}`);
    console.log(`  Throttled: ${m.throttledRequests}`);
    console.log(`  Failed: ${m.failedRequests}`);
    console.log(`  Using fallback: ${this.usingFallback}`);
  }

  /* ------------------------------------------------------------
     ALERTS
  ------------------------------------------------------------ */

  static checkUsageAlerts(): void {
    const m = this.metrics;
    const duration = (Date.now() - m.lastResetTime) / 1000 / 60; // minutes
    const requestsPerMinute = m.totalRequests / Math.max(duration, 0.1);

    if (requestsPerMinute > HELIUS_CONFIG.limits.maxRequestsPerMinute * 0.8) {
      console.warn(`⚠️ [HeliusRPCOptimizer] High RPC usage: ${requestsPerMinute.toFixed(0)} requests/min`);
    }

    if (requestsPerMinute > HELIUS_CONFIG.limits.maxRequestsPerMinute) {
      console.error(`🚨 [HeliusRPCOptimizer] EXCEEDED RPC limit: ${requestsPerMinute.toFixed(0)} requests/min`);
      this.switchToFallback();
    }
  }
}

export { HeliusRPCOptimizer, LRUCache };
export type { RPCMetrics };

