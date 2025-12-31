// lib/sdk/history/referral-tracker.ts
// ------------------------------------------------------------
// Referral Registration Tracker
// ------------------------------------------------------------
// Периодически проверяет новых игроков и создает события REFERRAL_REGISTERED
// для upline игроков
// ------------------------------------------------------------

import { Connection, PublicKey } from "@solana/web3.js";
import { fetchGlobalStatsNullable, fetchPlayerNullable } from "../fetch";
import { derivePlayerPda, CLUSTER } from "../pda";
import { recordTxEvent } from "./record";
import { notifyHistoryUpdated } from "./helpers";
import { loadLocalHistory } from "./local";

const CHECK_INTERVAL_MS = 30 * 1000; // 30 секунд
const MAX_LAST_PLAYERS = 50; // Максимум игроков для проверки за раз

interface LastPlayerCache {
  lastPlayer: string;
  lastCheckTs: number;
}

function getCacheKey(wallet: string): string {
  return `referral_tracker_cache_${CLUSTER}_${wallet}`;
}

function getLastPlayerCache(wallet: string): LastPlayerCache | null {
  if (typeof window === "undefined" || !window.localStorage) return null;
  
  try {
    const key = getCacheKey(wallet);
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    
    const data = JSON.parse(raw) as LastPlayerCache;
    if (!data.lastPlayer || !data.lastCheckTs) return null;
    
    return data;
  } catch {
    return null;
  }
}

function saveLastPlayerCache(wallet: string, lastPlayer: string): void {
  if (typeof window === "undefined" || !window.localStorage) return;
  
  try {
    const key = getCacheKey(wallet);
    const data: LastPlayerCache = {
      lastPlayer,
      lastCheckTs: Date.now(),
    };
    window.localStorage.setItem(key, JSON.stringify(data));
  } catch {
    // Ignore storage errors
  }
}

/**
 * Проверяет новых игроков и создает события REFERRAL_REGISTERED для текущего игрока,
 * если кто-то зарегистрировался с ним как upline1, upline2 или upline3
 */
export async function checkForNewReferrals(
  connection: Connection,
  currentWallet: PublicKey
): Promise<void> {
  try {
    const walletStr = currentWallet.toBase58();
    
    // Получаем текущего игрока
    const [currentPlayerPda] = derivePlayerPda(currentWallet);
    const currentPlayer = await fetchPlayerNullable(connection, currentPlayerPda);
    
    if (!currentPlayer) {
      // Игрок еще не зарегистрирован, нечего проверять
      return;
    }
    
    // Получаем GlobalStats для проверки последних игроков
    const stats = await fetchGlobalStatsNullable(connection);
    if (!stats || !stats.last_player) return;
    
    const lastPlayerStr = stats.last_player.toBase58();
    const cache = getLastPlayerCache(walletStr);
    
    // Если кэш существует и последний игрок не изменился, пропускаем проверку
    if (cache && cache.lastPlayer === lastPlayerStr) {
      return;
    }
    
    // Проверяем последнего игрока
    const [lastPlayerPda] = derivePlayerPda(stats.last_player);
    const lastPlayer = await fetchPlayerNullable(connection, lastPlayerPda);
    
    if (!lastPlayer) return;
    
    const currentWalletStr = currentWallet.toBase58();
    const referralCreatedAt = lastPlayer.created_at * 1000; // Конвертируем в миллисекунды
    const referralAddress = lastPlayer.authority.toBase58();
    
    // Проверяем существующие события, чтобы не создавать дубликаты
    const existingHistory = loadLocalHistory(walletStr);
    const existingSigs = new Set<string>(
      existingHistory
        .filter(ev => ev.kind === "REFERRAL_REGISTERED")
        .map(ev => ev.sig)
    );
    
    // Проверяем, что реферал зарегистрирован после регистрации текущего игрока
    // (чтобы не создавать события для старых рефералов)
    const currentPlayerCreatedAt = currentPlayer.created_at * 1000;
    if (referralCreatedAt < currentPlayerCreatedAt) {
      // Реферал зарегистрирован раньше текущего игрока - это не новый реферал
      // Обновляем кэш и выходим
      saveLastPlayerCache(walletStr, lastPlayerStr);
      return;
    }
    
    // ВАЖНО: Проверяем линии в порядке приоритета (1 > 2 > 3)
    // По логике Rust, один реферал может быть только на ОДНОЙ линии для конкретного пользователя
    // Но мы проверяем все три линии и создаем событие для той, где текущий пользователь находится
    
    // Проверяем upline1 (линия 1) - ПРИОРИТЕТ 1 (самый важный)
    if (lastPlayer.upline1.toBase58() === currentWalletStr) {
      const sig = `referral-registered-line1-${referralAddress}-${referralCreatedAt}`;
      if (!existingSigs.has(sig)) {
        recordTxEvent({
          wallet: walletStr,
          levelId: 1,
          kind: "REFERRAL_REGISTERED",
          sig,
          slot: null,
          ts: referralCreatedAt,
        });
        // Если мы upline1, это правильная линия - НЕ проверяем дальше
        // (хотя по логике Rust мы не можем быть одновременно upline1 и upline2)
        saveLastPlayerCache(walletStr, lastPlayerStr);
        notifyHistoryUpdated(walletStr);
        return;
      }
    }
    
    // Проверяем upline2 (линия 2) - ПРИОРИТЕТ 2
    // (Если мы не upline1, но мы upline2 - значит реферал попал к нам через наследование цепочки)
    if (lastPlayer.upline2.toBase58() === currentWalletStr) {
      const sig = `referral-registered-line2-${referralAddress}-${referralCreatedAt}`;
      if (!existingSigs.has(sig)) {
        recordTxEvent({
          wallet: walletStr,
          levelId: 1,
          kind: "REFERRAL_REGISTERED",
          sig,
          slot: null,
          ts: referralCreatedAt,
        });
        // Если мы upline2, НЕ проверяем upline3 (по логике Rust мы не можем быть одновременно upline2 и upline3)
        saveLastPlayerCache(walletStr, lastPlayerStr);
        notifyHistoryUpdated(walletStr);
        return;
      }
    }
    
    // Проверяем upline3 (линия 3) - ПРИОРИТЕТ 3
    if (lastPlayer.upline3.toBase58() === currentWalletStr) {
      const sig = `referral-registered-line3-${referralAddress}-${referralCreatedAt}`;
      if (!existingSigs.has(sig)) {
        recordTxEvent({
          wallet: walletStr,
          levelId: 1,
          kind: "REFERRAL_REGISTERED",
          sig,
          slot: null,
          ts: referralCreatedAt,
        });
        saveLastPlayerCache(walletStr, lastPlayerStr);
        notifyHistoryUpdated(walletStr);
        return;
      }
    }
    
    // Если мы не нашли совпадения ни в одной линии, просто обновляем кэш
    saveLastPlayerCache(walletStr, lastPlayerStr);
  } catch (err) {
    console.warn("[referral-tracker] checkForNewReferrals error:", err);
  }
}

/**
 * Запускает периодическую проверку новых рефералов
 */
export function startReferralTracker(
  connection: Connection,
  currentWallet: PublicKey
): () => void {
  let intervalId: NodeJS.Timeout | null = null;
  let mounted = true;
  
  // Проверяем сразу
  checkForNewReferrals(connection, currentWallet).catch(console.warn);
  
  // Затем периодически
  intervalId = setInterval(() => {
    if (mounted) {
      checkForNewReferrals(connection, currentWallet).catch(console.warn);
    }
  }, CHECK_INTERVAL_MS);
  
  // Возвращаем функцию остановки
  return () => {
    mounted = false;
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
  };
}

