"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";

import PlayerStatusCard from "@/components/dashboard/PlayerStatusCard";
import { LatestActivity } from "@/components/dashboard/LatestActivity";
import ActivationsSparkline from "@/components/dashboard/ActivationsSparkline";

import { usePlayer } from "@/lib/sdk/hooks/usePlayer";
import { toast } from "@/lib/sdk/toast";

// HISTORY (wallet-scoped)
import { loadLocalHistory } from "@/lib/sdk/history/local";
import { withSyntheticClosures } from "@/lib/sdk/history/derive";
import type { TxEvent } from "@/lib/sdk/history/types";

// PRICES
import {
  priceLamportsForLevel,
  lamportsToSol,
  LEVEL_PRICES_LAMPORTS,
} from "@/lib/sdk/prices";

/* ---------------------------------------------------------
   Skeleton Components (Responsive)
--------------------------------------------------------- */
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

function SkeletonCard() {
  return (
    <div className="rounded-2xl bg-[#111113] p-4 sm:p-6">
      <Skeleton className="h-3 sm:h-4 w-20 sm:w-24 rounded mb-2 sm:mb-3" />
      <Skeleton className="h-5 sm:h-7 w-28 sm:w-32 rounded mb-3 sm:mb-4" />
      <div className="space-y-2 sm:space-y-3">
        <Skeleton className="h-3 sm:h-4 w-full rounded" />
        <Skeleton className="h-3 sm:h-4 w-3/4 rounded" />
      </div>
    </div>
  );
}

function SkeletonStatBox() {
  return (
    <div className="rounded-xl bg-[#0d0d0f] p-2 sm:p-3">
      <Skeleton className="h-2 sm:h-3 w-12 sm:w-16 rounded mb-1 sm:mb-2" />
      <Skeleton className="h-4 sm:h-6 w-16 sm:w-20 rounded mb-1" />
      <Skeleton className="h-2 w-10 sm:w-12 rounded" />
    </div>
  );
}

function SkeletonLevelCard() {
  return (
    <div className="rounded-xl bg-[#0d0d0f] p-2 sm:p-3 text-center">
      <Skeleton className="h-5 sm:h-6 w-8 sm:w-10 rounded mx-auto mb-2" />
      <div className="flex justify-center gap-1 mb-2">
        <Skeleton className="h-1.5 sm:h-2 w-3 sm:w-4 rounded" />
        <Skeleton className="h-1.5 sm:h-2 w-3 sm:w-4 rounded" />
        <Skeleton className="h-1.5 sm:h-2 w-3 sm:w-4 rounded" />
      </div>
      <Skeleton className="h-2 w-10 sm:w-12 rounded mx-auto mb-1" />
      <Skeleton className="h-2 w-8 sm:w-10 rounded mx-auto" />
    </div>
  );
}

/* ---------------------------------------------------------
   Helpers
--------------------------------------------------------- */

function readSig(ev: TxEvent): string {
  return typeof (ev as any).sig === "string" ? (ev as any).sig : "";
}

function readPending(ev: TxEvent): boolean {
  return typeof (ev as any).pending === "boolean"
    ? (ev as any).pending
    : false;
}

/* ---------------------------------------------------------
   PAGE
--------------------------------------------------------- */

export default function DashboardPage() {
  const t = useTranslations('dashboardPage');
  const tToast = useTranslations('toast');
  const { address, activeLevels, levelStates } = usePlayer();

  const wallet = address ?? "no-wallet";

  const [txHistory, setTxHistory] = useState<TxEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  // Минимальная задержка только для плавного появления (300ms)
  // IntlProvider уже показал лоадер, поэтому не нужно долго ждать
  useEffect(() => {
    setMounted(true);
    const timer = setTimeout(() => setIsLoading(false), 300);
    return () => clearTimeout(timer);
  }, []);

  /* ---------------------------------------------------------
     LOAD HISTORY
  --------------------------------------------------------- */
  useEffect(() => {
    setTxHistory(loadLocalHistory(wallet));
  }, [wallet]);

  useEffect(() => {
    const handler = () => setTxHistory(loadLocalHistory(wallet));
    window.addEventListener("levels-history-changed", handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener("levels-history-changed", handler);
      window.removeEventListener("storage", handler);
    };
  }, [wallet]);

  const derived = useMemo(
    () => withSyntheticClosures(txHistory),
    [txHistory]
  );

  /* ---------------------------------------------------------
     CONFIRMED ACTIVATIONS
  --------------------------------------------------------- */
  const confirmedActivations = useMemo(() => {
    return derived.filter((ev) => {
      const sig = readSig(ev);
      const pending = readPending(ev) || sig.startsWith("pending-");
      const synthetic = sig.startsWith("synthetic-close-");
      return ev.kind === "ACTIVATE" && !pending && !synthetic;
    });
  }, [derived]);

  /* ---------------------------------------------------------
     STATS FROM ON-CHAIN
  --------------------------------------------------------- */
  const turnoverSol = useMemo(() => {
    return confirmedActivations.reduce((sum, ev) => {
      const lamports = priceLamportsForLevel(ev.levelId);
      return sum + lamportsToSol(lamports);
    }, 0);
  }, [confirmedActivations]);

  // Total cycles completed across all levels
  const totalCycles = useMemo(() => {
    if (!levelStates) return 0;
    let total = 0;
    for (const [, state] of levelStates) {
      total += state.cycles;
    }
    return total;
  }, [levelStates]);

  // Total estimated earnings from completed cycles (60% owner payout per 3 slots)
  const totalEarnings = useMemo(() => {
    if (!levelStates) return 0;
    let total = 0;
    for (const [lvl, state] of levelStates) {
      const priceLamports = LEVEL_PRICES_LAMPORTS[lvl - 1];
      const priceSol = lamportsToSol(priceLamports);
      // Owner gets 60% per slot × 3 slots per cycle
      total += state.cycles * priceSol * 0.6 * 3;
    }
    return total;
  }, [levelStates]);

  /* ---------------------------------------------------------
     LEVELS
  --------------------------------------------------------- */
  const activeLevelsArr = useMemo(
    () => (activeLevels ? [...activeLevels].sort((a, b) => a - b) : []),
    [activeLevels]
  );

  const nextAvailableId = useMemo(() => {
    if (!activeLevels) return 1;
    for (let i = 1; i <= 16; i++) {
      if (!activeLevels.has(i)) return i;
    }
    return null;
  }, [activeLevels]);

  /* ---------------------------------------------------------
     FORMATTERS
  --------------------------------------------------------- */
  const numberFmt = useMemo(
    () =>
      new Intl.NumberFormat("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 4,
      }),
    []
  );

  const fmtSOL = useCallback(
    (n: number) => numberFmt.format(n),
    [numberFmt]
  );

  const programId = process.env.NEXT_PUBLIC_PROGRAM_ID || "—";

  const shortProgram =
    programId === "—"
      ? "—"
      : `${programId.slice(0, 8)}…${programId.slice(-8)}`;

  const copy = useCallback(async (text: string) => {
    try {
      if (!text || text === "—") return;
      await navigator.clipboard.writeText(text);
      toast.info(t('contractIdCopied'));
    } catch {
      toast.error(tToast('copyFailed'));
    }
  }, [t, tToast]);

  const card = "rounded-2xl bg-[#111113]";

  /* ---------------------------------------------------------
     SKELETON LOADING
     Показываем только если компонент смонтирован и еще загружается
  --------------------------------------------------------- */
  if (!mounted || isLoading) {
    return (
      <div className="min-h-screen bg-black space-y-4 sm:space-y-6 text-white p-1">
        {/* HEADER SKELETON */}
        <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <Skeleton className="h-7 sm:h-9 w-36 sm:w-48 rounded-lg mb-2" />
            <Skeleton className="h-3 sm:h-4 w-48 sm:w-64 rounded" />
          </div>
          <Skeleton className="h-9 sm:h-10 w-32 sm:w-48 rounded-full" />
        </header>

        {/* MAIN GRID SKELETON */}
        <section className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2">
          <SkeletonCard />
          <div className={`${card} p-4 sm:p-6`}>
            <Skeleton className="h-3 sm:h-4 w-20 sm:w-24 rounded mb-2" />
            <Skeleton className="h-5 sm:h-6 w-24 sm:w-32 rounded mb-3 sm:mb-4" />
            <div className="grid grid-cols-2 gap-2 sm:gap-4">
              <SkeletonStatBox />
              <SkeletonStatBox />
              <SkeletonStatBox />
              <SkeletonStatBox />
            </div>
          </div>
        </section>

        {/* LEVELS SKELETON */}
        <section className={`${card} p-4 sm:p-6`}>
          <div className="mb-3 sm:mb-4 flex items-center justify-between">
            <div>
              <Skeleton className="h-3 sm:h-4 w-16 sm:w-20 rounded mb-2" />
              <Skeleton className="h-4 sm:h-5 w-20 sm:w-28 rounded" />
            </div>
            <Skeleton className="h-3 sm:h-4 w-12 sm:w-16 rounded" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-2 sm:gap-3">
            {[...Array(8)].map((_, i) => (
              <SkeletonLevelCard key={i} />
            ))}
          </div>
        </section>

        {/* ACTIVITY SKELETON */}
        <section className={`${card} p-4 sm:p-6`}>
          <div className="mb-3 sm:mb-4 flex items-center justify-between">
            <div>
              <Skeleton className="h-3 sm:h-4 w-20 sm:w-24 rounded mb-2" />
              <Skeleton className="h-4 sm:h-5 w-28 sm:w-36 rounded" />
            </div>
            <Skeleton className="h-4 sm:h-5 w-10 sm:w-12 rounded-full" />
          </div>
          <div className="space-y-2 sm:space-y-3">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-12 sm:h-14 w-full rounded-xl" />
            ))}
          </div>
        </section>
      </div>
    );
  }

  /* ---------------------------------------------------------
     RENDER
  --------------------------------------------------------- */

  return (
    <div className="min-h-screen bg-black space-y-4 sm:space-y-6 text-white">
      {/* HEADER */}
      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">{t('title')}</h1>
          <p className="text-xs sm:text-sm text-white/50">
            {t('subtitle')}
          </p>
        </div>

        <button
          onClick={() => copy(programId)}
          className="w-full md:w-auto flex items-center justify-between md:justify-center gap-2 rounded-xl md:rounded-full bg-[#111113] px-4 py-3 md:py-2.5 text-[11px] sm:text-xs text-[#14F195] hover:bg-[#161618] transition-colors"
        >
          <span className="font-mono tracking-tight truncate">
            {programId}
          </span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="flex-shrink-0">
            <rect x="9" y="9" width="13" height="13" rx="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
        </button>
      </header>

      {/* PLAYER STATUS + QUICK STATS */}
      <section className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2">
        <PlayerStatusCard />

        <div className={`${card} p-4 sm:p-6`}>
          <div className="text-[10px] sm:text-xs uppercase tracking-wider text-white/40">{t('yourStatistics')}</div>
          <div className="mt-1 text-base sm:text-lg font-semibold text-[#14F195]">
            {t('onChainData')}
          </div>

          <div className="mt-3 sm:mt-4 grid grid-cols-2 gap-2 sm:gap-3">
            <StatBox
              label={t('activeLevels')}
              value={`${activeLevelsArr.length}/16`}
              hint={nextAvailableId ? `${t('next')}: L${String(nextAvailableId).padStart(2, "0")}` : t('allDone')}
            />
            <StatBox
              label={t('completedCycles')}
              value={totalCycles.toString()}
              hint={t('slotsEquals')}
            />
            <StatBox
              label={t('estEarnings')}
              value={`${fmtSOL(totalEarnings)} SOL`}
              hint={t('ownerPayout')}
            />
            <StatBox
              label={t('totalSpent')}
              value={`${fmtSOL(turnoverSol)} SOL`}
              hint={t('levelActivations')}
            />
          </div>
        </div>
      </section>

      {/* LEVEL DETAILS - On-Chain State */}
      {activeLevelsArr.length > 0 && (
        <section className={`${card} p-4 sm:p-6`}>
          <div className="mb-3 sm:mb-4 flex items-center justify-between">
            <div>
              <div className="text-[10px] sm:text-xs uppercase tracking-wider text-white/40">{t('yourLevels')}</div>
              <div className="text-base sm:text-lg font-semibold text-[#14F195]">
                {t('slotsAndCycles')}
              </div>
            </div>
            <Link
              href="/levels"
              className="text-[10px] sm:text-xs text-[#14F195]/80 hover:text-[#14F195] transition-colors"
            >
              {t('viewAll')} →
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-2 sm:gap-3">
            {activeLevelsArr.map((lvl) => {
              const state = levelStates?.get(lvl);
              // Ограничиваем slotsFilled диапазоном 0-3 для корректного отображения
              const slotsFilled = Math.min(3, Math.max(0, state?.slots_filled ?? 0));
              const cycles = state?.cycles ?? 0;
              const priceSol = lamportsToSol(LEVEL_PRICES_LAMPORTS[lvl - 1]);

              return (
                <Link
                  key={lvl}
                  href={`/levels/${lvl}`}
                  className="group rounded-xl bg-[#0d0d0f] p-2 sm:p-3 text-center hover:bg-[#141416] transition-colors"
                >
                  <div className="text-base sm:text-lg font-semibold text-[#14F195]">
                    L{String(lvl).padStart(2, "0")}
                  </div>
                  
                  {/* SLOTS PROGRESS - оптимизировано для быстрой реакции */}
                  <div className="mt-1.5 sm:mt-2 flex justify-center gap-0.5 sm:gap-1">
                    {[1, 2, 3].map((s) => {
                      const isFilled = s <= slotsFilled;
                      return (
                        <div
                          key={s}
                          className={`h-1.5 sm:h-2 w-3 sm:w-4 rounded-sm transition-all duration-300 ease-out ${
                            isFilled
                              ? "bg-[#14F195] shadow-[0_0_8px_#14F195] scale-100"
                              : "bg-white/10 scale-95"
                          }`}
                        />
                      );
                    })}
                  </div>
                  
                  <div className="mt-1.5 sm:mt-2 text-[9px] sm:text-[10px] text-white/40">
                    {slotsFilled}/3 {t('slots')}
                  </div>
                  <div className="text-[9px] sm:text-[10px] text-white/60">
                    {cycles} {cycles === 1 ? t('cycle') : t('cycles')}
                  </div>
                  <div className="mt-0.5 sm:mt-1 text-[9px] sm:text-[10px] text-[#14F195]/60 group-hover:text-[#14F195]/80">
                    {priceSol.toFixed(2)} SOL
                  </div>
                </Link>
              );
            })}
          </div>

          {/* PAYOUT INFO */}
          <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-white/5 text-[10px] sm:text-xs text-white/40">
            <span className="text-white/60">{t('howItWorks')}</span> {t('howItWorksDesc')}
          </div>
        </section>
      )}

      {/* LATEST ACTIVITY */}
      <section className={`${card} p-4 sm:p-6`}>
        <div className="mb-3 sm:mb-4 flex items-center justify-between">
          <div>
            <div className="text-[10px] sm:text-xs uppercase tracking-wider text-white/40">{t('latestActivity')}</div>
            <div className="text-base sm:text-lg font-semibold text-white/90">
              {t('transactionHistory')}
            </div>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            {derived.length > 0 && (
              <div className="w-[60px] sm:w-[100px] opacity-70">
                <ActivationsSparkline items={derived} days={14} />
              </div>
            )}
            <span className="rounded-full bg-[#14F195]/10 px-2 sm:px-2.5 py-0.5 sm:py-1 text-[9px] sm:text-[10px] font-medium text-[#14F195] uppercase tracking-wider">
              {t('live')}
            </span>
          </div>
        </div>

        {derived.length === 0 ? (
          <div className="rounded-xl bg-[#0d0d0f] px-3 sm:px-4 py-6 sm:py-8 text-xs sm:text-sm text-white/40 text-center">
            {t('noActivity')}
          </div>
        ) : (
          <LatestActivity items={derived} />
        )}
      </section>
    </div>
  );
}

/* ---------------------------------------------------------
   Helper Components
--------------------------------------------------------- */

function StatBox({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-xl bg-[#0d0d0f] p-2 sm:p-3">
      <div className="text-[9px] sm:text-[10px] uppercase tracking-wider text-white/40">{label}</div>
      <div className="mt-0.5 sm:mt-1 text-sm sm:text-lg font-semibold text-white">{value}</div>
      <div className="text-[9px] sm:text-[10px] text-white/30">{hint}</div>
    </div>
  );
}
