"use client";

import { useMemo, useState, useCallback, useEffect } from "react";
import { useTranslations } from "next-intl";

import LevelCard, {
  type Level,
  type LevelStatus,
} from "@/components/dashboard/LevelCard";

import { usePlayer } from "@/lib/sdk/hooks/usePlayer";

import {
  priceLamportsForLevel,
  lamportsToSol,
  MAX_LEVELS,
} from "@/lib/sdk/prices";

import { toast } from "@/lib/sdk/toast";

/* ------------------------------------------------------------ */
/* Skeleton Components                                           */
/* ------------------------------------------------------------ */

function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`relative overflow-hidden bg-[#1a1a1a] ${className}`}
      style={{ borderRadius: "inherit" }}
    >
      <div
        className="absolute inset-0 -translate-x-full animate-[shimmer_0.8s_infinite]"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.06) 50%, transparent 100%)",
        }}
      />
    </div>
  );
}

function SkeletonLevelCard() {
  return (
    <div className="rounded-2xl bg-[#111113] p-3 sm:p-4">
      <div className="flex items-center justify-between mb-2 sm:mb-3">
        <Skeleton className="h-5 sm:h-6 w-12 sm:w-14 rounded" />
        <Skeleton className="h-4 sm:h-5 w-16 sm:w-20 rounded" />
      </div>
      <Skeleton className="h-20 sm:h-24 w-full rounded-xl mb-2 sm:mb-3" />
      <div className="flex justify-between items-center">
        <Skeleton className="h-3 sm:h-4 w-14 sm:w-16 rounded" />
        <Skeleton className="h-7 sm:h-8 w-16 sm:w-20 rounded-full" />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------ */
/* CONSTANTS                                                     */
/* ------------------------------------------------------------ */

const LEVEL_IDS = Array.from({ length: MAX_LEVELS }, (_, i) => i + 1);

/* ------------------------------------------------------------ */
/* Build LEVEL MODEL                                             */
/* ------------------------------------------------------------ */

function useLevelsModel(
  active: Set<number>,
  levelStates: Map<number, { cycles: number }>
): Level[] {
  return useMemo(() => {
    return LEVEL_IDS.map((id) => {
      const isActive = active.has(id);
      const status: LevelStatus = isActive ? "ACTIVE" : "AVAILABLE";

      const priceLamports = priceLamportsForLevel(id);
      const priceSol = lamportsToSol(priceLamports);

      const cycles = levelStates.get(id)?.cycles ?? 0;

      return {
        id,
        code: `L${String(id).padStart(2, "0")}`,
        priceSol,
        status,
        cycles,
      };
    });
  }, [active, levelStates]);
}

/* ------------------------------------------------------------ */
/* MAIN PAGE                                                     */
/* ------------------------------------------------------------ */

export default function LevelsPage() {
  const t = useTranslations('levelsPage');
  const tLevels = useTranslations('levels');
  const tToast = useTranslations('toast');
  
  const {
    address,
    activeLevels,
    levelStates,
    note,
    clearNote,
    activate,
    playerExists,
    txPending,
  } = usePlayer();

  const [isLoading, setIsLoading] = useState(true);

  // Show skeleton for 0.5 seconds
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  const active = useMemo(
    () => activeLevels ?? new Set<number>(),
    [activeLevels]
  );

  const states = useMemo(
    () => levelStates ?? new Map<number, { cycles: number }>(),
    [levelStates]
  );

  const levels = useLevelsModel(active, states);

  const progressPct = Math.round((active.size / MAX_LEVELS) * 100);

  const nextAvailableId = useMemo(() => {
    for (const id of LEVEL_IDS) {
      if (!active.has(id)) return id;
    }
    return null;
  }, [active]);

  const [activatingId, setActivatingId] = useState<number | null>(null);

  /* -------------------------------------------------------- */
  /* ACTIVATE HANDLER — PROD CANONICAL                         */
  /* -------------------------------------------------------- */

  const handleActivate = useCallback(
    async (levelId: number) => {
      if (!address) {
        toast.error(tToast("walletNotConnected"));
        return;
      }

      if (playerExists === false) {
        toast.info(t("registerFirst"));
        return;
      }

      if (active.has(levelId)) {
        toast.info(
          `${tLevels('level')} L${String(levelId).padStart(2, "0")} ${t('levelAlreadyActive')}`
        );
        return;
      }

      if (txPending || activatingId !== null) return;

      setActivatingId(levelId);

      try {
        const sig = await activate(levelId);
        if (!sig) {
          toast.error(tToast("activationError"));
          return;
        }

        toast.success(
          `${tLevels('level')} L${String(levelId).padStart(2, "0")} ${t('activated')}`
        );
      } catch {
        toast.error(tToast("activationError"));
      } finally {
        setActivatingId(null);
      }
    },
    [address, playerExists, active, activatingId, txPending, activate, t, tLevels, tToast]
  );

  /* -------------------------------------------------------- */
  /* SKELETON LOADING (0.5 seconds)                           */
  /* -------------------------------------------------------- */

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black pb-8 sm:pb-12 space-y-4 sm:space-y-6 text-white">
        {/* HEADER SKELETON */}
        <header className="flex items-center justify-between">
          <Skeleton className="h-7 sm:h-9 w-24 sm:w-32 rounded-lg" />
        </header>

        {/* PROGRESS SKELETON */}
        <section className="rounded-2xl bg-[#111113] p-3 sm:p-4 space-y-2">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 sm:h-5 w-20 sm:w-28 rounded" />
            <Skeleton className="h-3 sm:h-4 w-14 sm:w-16 rounded" />
          </div>
          <Skeleton className="h-2 w-full rounded-full" />
        </section>

        {/* CARDS SKELETON */}
        <section className="grid gap-2 sm:gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {[...Array(8)].map((_, i) => (
            <SkeletonLevelCard key={i} />
          ))}
        </section>
      </div>
    );
  }

  /* -------------------------------------------------------- */
  /* RENDER                                                    */
  /* -------------------------------------------------------- */

  return (
    <div className="min-h-screen bg-black pb-8 sm:pb-12 space-y-4 sm:space-y-6 text-white">
      {/* HEADER */}
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-semibold tracking-tight">
            {t('title')}
          </h1>
          <p className="text-[10px] sm:text-xs text-white/50 mt-0.5">
            {t('subtitle')}
          </p>
        </div>
      </header>

      {/* PROGRESS BAR */}
      <section className="rounded-2xl bg-[#111113] p-3 sm:p-4 space-y-2">
        <div className="flex flex-wrap items-center justify-between text-xs sm:text-sm text-white/70 gap-1">
          <div>
            {t('active')}: <span className="text-[#14F195] font-semibold">{active.size}</span>/{MAX_LEVELS}
          </div>
          <div className="text-[10px] sm:text-xs text-white/40">
            {address ? t('ready') : t('noWallet')}
          </div>
        </div>

        <div className="h-1.5 sm:h-2 rounded-full bg-white/10 overflow-hidden">
          <div
            className="h-full rounded-full bg-[#14F195] transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </section>

      {/* NOTE */}
      {note && (
        <div className="flex items-center justify-between rounded-xl bg-[#14F195]/10 p-2 sm:p-3 text-[10px] sm:text-xs text-[#14F195]">
          <span className="truncate">
            {note.startsWith('ACTIVATION_FINALIZED:')
              ? `${tToast('activationFinalized')} · ${note.replace('ACTIVATION_FINALIZED:', '')}`
              : note.startsWith('ACTIVATING_LEVEL:')
              ? tToast('activatingLevel', { level: note.replace('ACTIVATING_LEVEL:', '') })
              : note.startsWith('Registration finalized')
              ? `${tToast('registrationFinalized')} · ${note.replace('Registration finalized · ', '')}`
              : note}
          </span>
          <button
            className="rounded-lg bg-white/5 px-2 py-1 hover:bg-white/10 transition-colors"
            onClick={clearNote}
          >
            ✕
          </button>
        </div>
      )}

      {/* LEVEL CARDS */}
      <section className="grid gap-2 sm:gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {levels.map((lvl) => (
          <LevelCard
            key={lvl.id}
            level={lvl}
            busyActivate={false}
            isActivating={activatingId === lvl.id}
            disabled={txPending || activatingId !== null}
            isNext={lvl.id === nextAvailableId}
            isActive={active.has(lvl.id)}
            onActivate={handleActivate}
          />
        ))}
      </section>
    </div>
  );
}
