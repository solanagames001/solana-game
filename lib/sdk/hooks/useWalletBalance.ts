"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { HeliusRPCOptimizer, HELIUS_CONFIG } from "../helius";

const LAMPORTS_PER_SOL = 1_000_000_000;

/**
 * Optimized wallet balance hook with caching
 * 
 * HELIUS OPTIMIZATION:
 * - Uses HeliusRPCOptimizer for cached balance fetching
 * - Respects cache TTL to minimize RPC calls
 * - Auto-refreshes based on HELIUS_CONFIG.limits.cacheTTL.balance
 * - Debounces rapid refresh calls
 */
export function useWalletBalance() {
  const { connection } = useConnection();
  const { publicKey } = useWallet();

  const [balance, setBalance] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const lastFetchRef = useRef<number>(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced balance fetch
  const fetchBalance = useCallback(async (force = false) => {
    if (!publicKey) {
      setBalance(null);
      return;
    }

    const now = Date.now();
    const cacheTTL = HELIUS_CONFIG.limits.cacheTTL.balance;

    // Skip if recently fetched (unless forced)
    if (!force && now - lastFetchRef.current < cacheTTL / 2) {
      return;
    }

    setIsLoading(true);

    try {
      // Use optimized cached balance fetch
      const lamports = await HeliusRPCOptimizer.getBalance(
        connection,
        publicKey,
        "confirmed"
      );
      
      setBalance(lamports / LAMPORTS_PER_SOL);
      lastFetchRef.current = now;
    } catch (e) {
      console.warn("[useWalletBalance] Failed to fetch balance:", e);
      // Don't clear balance on error - keep last known value
    } finally {
      setIsLoading(false);
    }
  }, [publicKey, connection]);

  // Initial load and periodic refresh
  useEffect(() => {
    if (!publicKey) {
      setBalance(null);
      return;
    }

    let cancelled = false;

    // Initial fetch with small delay to avoid burst on mount
    const initialTimeout = setTimeout(() => {
      if (!cancelled) {
        fetchBalance(true);
      }
    }, 100);

    // Periodic refresh using cached TTL
    // Since cache handles rate limiting, we can poll more frequently
    // HeliusRPCOptimizer will return cached value if within TTL
    const refreshInterval = HELIUS_CONFIG.limits.cacheTTL.balance;
    const id = setInterval(() => {
      if (!cancelled) {
        fetchBalance(false);
      }
    }, refreshInterval);

    return () => {
      cancelled = true;
      clearTimeout(initialTimeout);
      clearInterval(id);
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [publicKey, fetchBalance]);

  // Manual refresh function (debounced)
  const refresh = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      fetchBalance(true);
    }, 300);
  }, [fetchBalance]);

  return {
    balance,
    isLoading,
    refresh,
  };
}

// Legacy export for backward compatibility
export default useWalletBalance;
