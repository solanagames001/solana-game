/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";

import {
  fetchPlayerNullable,
  fetchAllActiveLevels,
  fetchLevelStateNullable,
} from "../fetch";

import { createPlayer } from "../register";
import { activateLevel } from "../activate";

import type { WalletLike } from "../tx";

import {
  loadActiveFromLS,
  saveActiveToLS,
  loadLevelStatesFromLS,
  saveLevelStatesToLS,
  notifyHistoryUpdated,
  notifyLevelStateChanged,
  FEE_BUFFER_SOL,
  safePlayerPda,
} from "../history/helpers";

import { explorerTxUrl } from "../utils";
import { LAMPORTS_PER_SOL } from "../prices";

/* ------------------------------------------------------------ */

type LevelStateLite = {
  slots_filled: number;
  cycles: number;
  ts: number;
};

type PlayerMeta = {
  authority: string;
  created_at: number;
  pda: string;
};

/* ------------------------------------------------------------ */

export function usePlayer() {
  const { connection } = useConnection();
  const wa = useWallet();

  const publicKey = wa.publicKey;
  const connected = wa.connected;

  const address = useMemo(
    () => (publicKey ? publicKey.toBase58() : null),
    [publicKey]
  );

  const playerPda = useMemo(
    () => (publicKey ? safePlayerPda(publicKey) : null),
    [publicKey]
  );

  const walletLike: WalletLike = useMemo(() => {
    return {
      publicKey: publicKey ?? null,
      sendTransaction:
        typeof wa.sendTransaction === "function"
          ? wa.sendTransaction.bind(wa)
          : undefined,
      signTransaction:
        typeof (wa as any).signTransaction === "function"
          ? (wa as any).signTransaction.bind(wa)
          : undefined,
    };
  }, [publicKey, wa]);

  const canSendTx = useMemo(
    () => typeof walletLike.sendTransaction === "function",
    [walletLike]
  );

  /* ---------------- STATE ---------------- */

  const [playerExists, setPlayerExists] = useState<boolean | null>(null);
  const [checkingPlayer, setCheckingPlayer] = useState(false);
  const [playerMeta, setPlayerMeta] = useState<PlayerMeta | null>(null);

  // Инициализируем activeLevels как пустой Set, загрузка из localStorage в useEffect
  const [activeLevels, setActiveLevels] = useState<Set<number>>(() => new Set());

  const activeRef = useRef(activeLevels);
  useEffect(() => {
    activeRef.current = activeLevels;
  }, [activeLevels]);

  // Ref для отслеживания монтирования компонента
  // Предотвращает обновление состояния после размонтирования
  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Инициализируем levelStates как пустой Map, загрузка из localStorage в useEffect
  const [levelStates, setLevelStates] = useState<Map<number, LevelStateLite>>(
    () => new Map()
  );

  const [note, setNote] = useState("");
  const [busyActivate, setBusyActivate] = useState(false);
  const [busyRegister, setBusyRegister] = useState(false);

  const txPending = busyActivate || busyRegister;
  const clearNote = useCallback(() => setNote(""), []);

  /* ------------------------------------------------------------ */
  /* LOAD ACTIVE LEVELS AND LEVEL STATES FROM LS                  */
  /* ------------------------------------------------------------ */

  useEffect(() => {
    if (!address) {
      setActiveLevels(new Set());
      setLevelStates(new Map());
      return;
    }
    // Загружаем активные уровни и состояния слотов из localStorage сразу при монтировании
    // Это обеспечивает мгновенное отображение данных при обновлении страницы
    const loadedActive = loadActiveFromLS(address);
    const loadedStates = loadLevelStatesFromLS(address);
    
    setActiveLevels(loadedActive);
    setLevelStates(loadedStates);
    
    // Уведомляем компоненты о загрузке данных из кэша
    if (loadedActive.size > 0 || loadedStates.size > 0) {
      notifyLevelStateChanged(-1, address);
    }
  }, [address]);

  /* ------------------------------------------------------------ */
  /* REFRESH PLAYER                                              */
  /* ------------------------------------------------------------ */

  const refreshPlayer = useCallback(async () => {
    if (!connection || !playerPda || !address) return;

    const acc = await fetchPlayerNullable(connection, playerPda);
    
    // Проверяем монтирование перед обновлением состояния
    if (!isMountedRef.current) return;
    
    if (!acc) {
      setPlayerExists(false);
      setPlayerMeta(null);

      const empty = new Set<number>();
      setActiveLevels(empty);
      setLevelStates(new Map());
      saveActiveToLS(address, empty);
      saveLevelStatesToLS(address, new Map());
      return;
    }

    // Проверяем монтирование перед обновлением состояния
    if (!isMountedRef.current) return;

    setPlayerExists(true);
    setPlayerMeta({
      authority: acc.authority.toBase58(),
      created_at: acc.created_at,
      pda: playerPda.toBase58(),
    });

    const actives = await fetchAllActiveLevels(connection, playerPda);
    
    // Проверяем монтирование перед обновлением состояния
    if (!isMountedRef.current) return;
    
    const set = new Set<number>(actives);
    setActiveLevels(set);
    saveActiveToLS(address, set);
  }, [connection, playerPda, address]);

  /* ------------------------------------------------------------ */
  /* REFRESH LEVEL STATES                                        */
  /* ------------------------------------------------------------ */

  const refreshAllLevelStates = useCallback(async () => {
    if (!connection || !playerPda || !address) return;

    const current = Array.from(activeRef.current);
    if (!current.length) {
      // Проверяем монтирование перед обновлением состояния
      if (isMountedRef.current) {
        setLevelStates(new Map());
      }
      return;
    }

    const next = new Map<number, LevelStateLite>();
    const now = Date.now();

    // Делаем запросы последовательно с небольшой задержкой между ними
    // чтобы не перегружать RPC
    for (let i = 0; i < current.length; i++) {
      const lvl = current[i];
      const st = await fetchLevelStateNullable(connection, playerPda, lvl);
      if (st) {
        next.set(lvl, {
          slots_filled: st.slots_filled,
          cycles: st.cycles,
          ts: now,
        });
      }
      
      // Небольшая задержка между запросами (throttle уже есть в safeGetAccountInfo)
      if (i < current.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    }

    // Проверяем монтирование перед обновлением состояния
    if (!isMountedRef.current) return;

    // Сравниваем изменения для оптимистичных обновлений
    const prevStates = levelStates;
    const changedLevels: number[] = [];
    
    // Проверяем изменения в каждом уровне
    for (const [lvl, newState] of next.entries()) {
      const prevState = prevStates.get(lvl);
      if (!prevState || 
          prevState.slots_filled !== newState.slots_filled ||
          prevState.cycles !== newState.cycles) {
        changedLevels.push(lvl);
      }
    }

    setLevelStates(next);
    // Сохраняем состояния в localStorage для кэширования
    saveLevelStatesToLS(address, next);
    
    // Уведомляем о каждом измененном уровне отдельно для быстрой реакции
    if (changedLevels.length > 0) {
      changedLevels.forEach(lvl => {
        notifyLevelStateChanged(lvl, address);
      });
    }
    // Глобальное обновление для всех компонентов
    notifyLevelStateChanged(-1, address);
  }, [connection, playerPda, address, levelStates]);

  /* ------------------------------------------------------------ */
  /* INITIAL LOAD                                                */
  /* ------------------------------------------------------------ */

  useEffect(() => {
    if (!connected || !playerPda || !address) {
      setPlayerExists(null);
      setPlayerMeta(null);
      // Не сбрасываем levelStates здесь - они уже загружены из localStorage
      // setLevelStates(new Map());
      setActiveLevels(new Set());
      return;
    }

    setCheckingPlayer(true);

    (async () => {
      try {
        // Сначала обновляем игрока и активные уровни
        await refreshPlayer();
        // Небольшая задержка перед обновлением состояний уровней
        // чтобы не перегружать RPC запросами
        await new Promise(resolve => setTimeout(resolve, 300));
        // Затем обновляем состояния уровней в фоне (кэш уже показан)
        await refreshAllLevelStates();
      } finally {
        setCheckingPlayer(false);
      }
    })();
  }, [connected, playerPda, address, refreshPlayer, refreshAllLevelStates]);

  /* ------------------------------------------------------------ */
  /* REGISTER                                                    */
  /* ------------------------------------------------------------ */

  const register = useCallback(async () => {
    if (busyRegister) return;

    if (!connection || !publicKey || !address || !canSendTx) {
      setNote("Connect wallet");
      return;
    }

    try {
      setBusyRegister(true);

      // Balance check is now done in createPlayer function (0.0030 SOL minimum)
      // No need to duplicate the check here

      const sig = await createPlayer(connection, walletLike as any);
      if (!sig) return;

      setNote(`Registration finalized · ${explorerTxUrl(sig)}`);

      // 🔑 КЛЮЧЕВОЙ ФИКС: даём сети увидеть Player PDA
      await new Promise((r) => setTimeout(r, 900));

      await refreshPlayer();
      await refreshAllLevelStates();
      notifyHistoryUpdated(address);
      return sig;
    } catch (err) {
      // Errors (including insufficient funds) are already handled in createPlayer
      // with toast notifications, so we just need to log and reset state
      console.error("[usePlayer.register]", err);
      // Don't show additional error - createPlayer already showed it
    } finally {
      setBusyRegister(false);
    }
  }, [
    busyRegister,
    connection,
    publicKey,
    address,
    canSendTx,
    walletLike,
    refreshPlayer,
    refreshAllLevelStates,
  ]);

  /* ------------------------------------------------------------ */
  /* ACTIVATE                                                    */
  /* ------------------------------------------------------------ */

  const activate = useCallback(
    async (levelId: number) => {
      if (busyActivate) {
        console.warn("[usePlayer.activate] Already busy, ignoring duplicate call");
        return;
      }

      if (!connection || !publicKey || !playerPda || !address || !canSendTx) {
        console.warn("[usePlayer.activate] Missing requirements:", {
          connection: !!connection,
          publicKey: !!publicKey,
          playerPda: !!playerPda,
          address: !!address,
          canSendTx,
        });
        setNote("Connect wallet");
        return;
      }

      try {
        setBusyActivate(true);
        setNote(`ACTIVATING_LEVEL:${levelId}`);

        console.log(`[usePlayer.activate] Starting activation for level ${levelId}`);
        const sig = await activateLevel(connection, walletLike, levelId);
        
        if (!sig) {
          console.warn(`[usePlayer.activate] Activation returned null for level ${levelId}`);
          return;
        }

        console.log(`[usePlayer.activate] Activation successful for level ${levelId}:`, sig);
        setNote(`ACTIVATION_FINALIZED:${explorerTxUrl(sig)}`);

        const next = new Set(activeRef.current);
        next.add(levelId);
        setActiveLevels(next);
        saveActiveToLS(address, next);
        
        // Обновляем ref сразу для использования в refreshAllLevelStates
        activeRef.current = next;

        // 🔑 КЛЮЧЕВОЙ ФИКС: даём сети увидеть LevelState PDA после активации
        await new Promise((r) => setTimeout(r, 1000));

        // Обновляем состояние уровней с актуальным списком активных уровней
        await refreshAllLevelStates();
        notifyLevelStateChanged(levelId, address);
        notifyHistoryUpdated(address);

        return sig;
      } catch (err: any) {
        console.error(`[usePlayer.activate] Error activating level ${levelId}:`, err);
        setNote(`Activation failed: ${err?.message || "Unknown error"}`);
        throw err;
      } finally {
        setBusyActivate(false);
      }
    },
    [
      busyActivate,
      connection,
      publicKey,
      playerPda,
      address,
      canSendTx,
      walletLike,
      refreshAllLevelStates,
    ]
  );

  /* ------------------------------------------------------------ */

  return {
    address,
    publicKey,
    playerPda,
    playerExists,
    checkingPlayer,
    activeLevels,
    levelStates,
    playerMeta,

    refreshPlayer,
    refreshAllLevelStates,

    note,
    clearNote,

    activate,
    register,

    busyActivate,
    busyRegister,
    txPending,
  };
}
