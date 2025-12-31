// lib/sdk/helius/config.ts
// ------------------------------------------------------------
// Solana Game v3.10 — HELIUS CONFIGURATION
// Centralized configuration for Helius RPC optimization
// ------------------------------------------------------------

/**
 * Helius configuration for optimized RPC usage
 * 
 * Usage:
 * - Primary: Use for sending transactions (high priority)
 * - Fallback: Use when Helius limits exceeded
 * - Webhooks: Use for real-time data instead of polling
 */
export const HELIUS_CONFIG = {
  // Endpoints configuration
  endpoints: {
    // Primary Helius RPC endpoint (from env)
    get primary(): string {
      const key = process.env.NEXT_PUBLIC_HELIUS_API_KEY?.trim();
      if (key) {
        return `https://mainnet.helius-rpc.com/?api-key=${key}`;
      }
      // Fallback to NEXT_PUBLIC_SOLANA_RPC if no Helius key
      return process.env.NEXT_PUBLIC_SOLANA_RPC?.trim() || 'https://api.mainnet-beta.solana.com';
    },
    
    // Webhook API endpoint
    get webhook(): string {
      const key = process.env.NEXT_PUBLIC_HELIUS_API_KEY?.trim();
      return key 
        ? `https://api.helius.xyz/v0/webhooks?api-key=${key}`
        : '';
    },
    
    // Enhanced transaction API
    get enhanced(): string {
      const key = process.env.NEXT_PUBLIC_HELIUS_API_KEY?.trim();
      return key 
        ? `https://api.helius.xyz/v0/addresses/{address}/transactions?api-key=${key}`
        : '';
    },
    
    // Fallback RPC (free, public)
    fallback: process.env.NEXT_PUBLIC_RPC_FALLBACK?.trim() 
      || 'https://api.mainnet-beta.solana.com',
  },
  
  // Rate limits and quotas
  limits: {
    // Maximum requests per minute (track in dashboard)
    maxRequestsPerMinute: parseInt(process.env.NEXT_PUBLIC_MAX_RPC_REQUESTS_PER_MINUTE || '60', 10),
    
    // Cache TTL settings (milliseconds)
    cacheTTL: {
      accountInfo: parseInt(process.env.NEXT_PUBLIC_CACHE_TTL_ACCOUNT || '60000', 10),    // 1 minute
      balance: parseInt(process.env.NEXT_PUBLIC_CACHE_TTL_BALANCE || '30000', 10),        // 30 seconds
      nftData: parseInt(process.env.NEXT_PUBLIC_CACHE_TTL_NFT || '300000', 10),           // 5 minutes
      transactionStatus: parseInt(process.env.NEXT_PUBLIC_CACHE_TTL_TX || '10000', 10),   // 10 seconds
      config: parseInt(process.env.NEXT_PUBLIC_CACHE_TTL_CONFIG || '120000', 10),         // 2 minutes
      levelState: parseInt(process.env.NEXT_PUBLIC_CACHE_TTL_LEVEL || '15000', 10),       // 15 seconds
    },
    
    // Batch settings
    batch: {
      interval: parseInt(process.env.NEXT_PUBLIC_BATCH_INTERVAL || '100', 10),  // 100ms batch window
      maxSize: parseInt(process.env.NEXT_PUBLIC_BATCH_MAX_SIZE || '20', 10),    // Max 20 requests per batch
    },
    
    // Throttle settings
    throttle: {
      minDelay: parseInt(process.env.NEXT_PUBLIC_THROTTLE_MIN_DELAY || '100', 10),        // 100ms minimum between calls
      backoffDuration: parseInt(process.env.NEXT_PUBLIC_THROTTLE_BACKOFF || '3000', 10),  // 3s backoff on 429
      maxBackoff: parseInt(process.env.NEXT_PUBLIC_THROTTLE_MAX_BACKOFF || '30000', 10),  // 30s max backoff
    },
    
    // Transaction limits (Phantom trust)
    transaction: {
      maxComputeUnits: parseInt(process.env.NEXT_PUBLIC_MAX_COMPUTE_UNITS || '200000', 10),
      simulationTimeout: parseInt(process.env.NEXT_PUBLIC_SIMULATION_TIMEOUT || '10000', 10),
    },
  },
  
  // Feature flags
  features: {
    // Use webhooks instead of polling (recommended)
    useWebhooks: process.env.NEXT_PUBLIC_USE_HELIUS_WEBHOOKS === 'true',
    
    // Enable aggressive caching
    aggressiveCaching: process.env.NEXT_PUBLIC_AGGRESSIVE_CACHING !== 'false',
    
    // Enable request batching
    enableBatching: process.env.NEXT_PUBLIC_ENABLE_BATCHING !== 'false',
    
    // Enable optimized mode (all optimizations)
    optimizedMode: process.env.NEXT_PUBLIC_RPC_MODE === 'optimized',
    
    // Log RPC usage warnings
    logRpcWarnings: process.env.NODE_ENV !== 'production' || process.env.NEXT_PUBLIC_LOG_RPC_WARNINGS === 'true',
  },
} as const;

/**
 * RPC usage rules (for reference):
 * 
 * USE Helius for:
 * 1. Sending transactions (high priority)
 * 2. Critical account checks (one-time per session)
 * 3. Webhook setup
 * 
 * DO NOT USE Helius for:
 * 1. Balance polling (use cache)
 * 2. Repeated account info fetches (use cache + webhooks)
 * 3. Transaction status polling (use webhooks or long-polling with cache)
 */

export type HeliusConfig = typeof HELIUS_CONFIG;

