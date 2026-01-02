"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { HeliusRPCOptimizer, HELIUS_CONFIG } from "../helius";

const LAMPORTS_PER_SOL = 1_000_000_000;
const BALANCE_CACHE_KEY = "sg-balance-cache-v1";

// Load cached balance from localStorage
function loadCachedBalance(address: string): number | null {
  if (typeof window === "undefined") return null;
  try {
    const cached = localStorage.getItem(BALANCE_CACHE_KEY);
    if (cached) {
      const data = JSON.parse(cached);
      if (data.address === address && data.balance !== undefined) {
        return data.balance;
      }
    }
  } catch {}
  return null;
}

// Save balance to localStorage
function saveCachedBalance(address: string, balance: number) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(BALANCE_CACHE_KEY, JSON.stringify({ address, balance }));
  } catch {}
}

/**
 * Optimized wallet balance hook with caching
 * 
 * HELIUS OPTIMIZATION:
 * - Uses HeliusRPCOptimizer for cached balance fetching
 * - Respects cache TTL to minimize RPC calls
 * - Auto-refreshes based on HELIUS_CONFIG.limits.cacheTTL.balance
 * - Debounces rapid refresh calls
 * - Loads cached balance from localStorage to prevent flicker
 */
export function useWalletBalance() {
  const { connection } = useConnection();
  const { publicKey } = useWallet();

  // Initialize with cached value to prevent flicker
  const [balance, setBalance] = useState<number | null>(() => {
    if (!publicKey) return null;
    return loadCachedBalance(publicKey.toBase58());
  });
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
      
      const newBalance = lamports / LAMPORTS_PER_SOL;
      setBalance(newBalance);
      saveCachedBalance(publicKey.toBase58(), newBalance);
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

    // Try to load cached balance immediately
    const cached = loadCachedBalance(publicKey.toBase58());
    if (cached !== null && balance === null) {
      setBalance(cached);
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
