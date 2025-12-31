/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState, useEffect } from "react";
import { useTranslations } from "next-intl";

import { usePlayer } from "@/lib/sdk/hooks/usePlayer";

// PRICES
import {
  priceLamportsForLevel,
  lamportsToSol,
  MAX_LEVELS,
} from "@/lib/sdk/prices";

// UI
import { toast } from "@/lib/sdk/toast";

/* ------------------------------------------------------------ */
/* Constants (from on-chain program)                            */
/* ------------------------------------------------------------ */

const SLOTS_PER_CYCLE = 3;
const PAYOUT_OWNER_PCT = 60;
const PAYOUT_REF1_PCT = 13;
const PAYOUT_REF2_PCT = 8;
const PAYOUT_REF3_PCT = 5;
const PAYOUT_TREASURY_PCT = 14;

/* ------------------------------------------------------------ */
/* Skeleton                                                      */
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

/* ------------------------------------------------------------ */
/* Helpers                                                      */
/* ------------------------------------------------------------ */

function clampLevel(id: string): number {
  const n = Number(id);
  if (!Number.isFinite(n) || n < 1) return 1;
  if (n > MAX_LEVELS) return MAX_LEVELS;
  return n;
}

/* ------------------------------------------------------------ */
/* Page                                                         */
/* ------------------------------------------------------------ */

export default function LevelDetailsPage({
  params,
}: {
  params: { id: string };
}) {
  const levelId = clampLevel(params.id);
  const code = `L${String(levelId).padStart(2, "0")}`;

  const router = useRouter();
  const t = useTranslations('levelDetailPage');
  const tToast = useTranslations('toast');

  const [isLoading, setIsLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  // Минимальная задержка только для плавного появления (200ms)
  // IntlProvider уже показал лоадер, поэтому не нужно долго ждать
  useEffect(() => {
    setMounted(true);
    const timer = setTimeout(() => setIsLoading(false), 200);
    return () => clearTimeout(timer);
  }, []);

  const {
    address,
    playerExists,
    activeLevels,
    levelStates,
    note,
    clearNote,
    activate,
    txPending,
  } = usePlayer();

  const isPlayer = playerExists === true;
  const isActive = activeLevels?.has(levelId) ?? false;

  const priceLamports = priceLamportsForLevel(levelId);
  const priceSol = lamportsToSol(priceLamports);

  /* -------------------------------------------------------- */
  /* LEVEL STATE (from on-chain)                              */
  /* -------------------------------------------------------- */

  // Слушаем события обновления состояния для мгновенной реакции
  const [localLevelData, setLocalLevelData] = useState(() => {
    const st = levelStates?.get(levelId);
    const slotsFilled = Math.min(3, Math.max(0, (st as any)?.slots_filled ?? 0));
    return {
      cycles: st?.cycles ?? 0,
      slotsFilled,
    };
  });

  // Синхронизируем с levelStates
  useEffect(() => {
    const st = levelStates?.get(levelId);
    const slotsFilled = Math.min(3, Math.max(0, (st as any)?.slots_filled ?? 0));
    setLocalLevelData({
      cycles: st?.cycles ?? 0,
      slotsFilled,
    });
  }, [levelStates, levelId]);

  // Слушаем события обновления для мгновенной реакции
  useEffect(() => {
    const handler = (e: any) => {
      const lvlId = e?.detail?.levelId;
      if (lvlId === levelId || lvlId === -1) {
        // Обновляем локальное состояние при событии
        const st = levelStates?.get(levelId);
        const slotsFilled = Math.min(3, Math.max(0, (st as any)?.slots_filled ?? 0));
        setLocalLevelData({
          cycles: st?.cycles ?? 0,
          slotsFilled,
        });
      }
    };

    window.addEventListener("levels-state-changed", handler);
    return () => window.removeEventListener("levels-state-changed", handler);
  }, [levelStates, levelId]);

  const levelData = localLevelData;

  /* -------------------------------------------------------- */
  /* EARNINGS CALCULATION                                      */
  /* -------------------------------------------------------- */

  // Per cycle earnings = 3 activations × 60% owner payout
  const earningsPerCycle = priceSol * (PAYOUT_OWNER_PCT / 100) * SLOTS_PER_CYCLE;
  const totalEarnings = earningsPerCycle * levelData.cycles;
  const pendingSlotEarnings = priceSol * (PAYOUT_OWNER_PCT / 100) * levelData.slotsFilled;

  /* -------------------------------------------------------- */
  /* PAYOUT BREAKDOWN                                         */
  /* -------------------------------------------------------- */

  const payouts = useMemo(() => [
    { label: t('youOwner'), pct: PAYOUT_OWNER_PCT, sol: priceSol * (PAYOUT_OWNER_PCT / 100), highlight: true },
    { label: t('referrerL1'), pct: PAYOUT_REF1_PCT, sol: priceSol * (PAYOUT_REF1_PCT / 100) },
    { label: t('referrerL2'), pct: PAYOUT_REF2_PCT, sol: priceSol * (PAYOUT_REF2_PCT / 100) },
    { label: t('referrerL3'), pct: PAYOUT_REF3_PCT, sol: priceSol * (PAYOUT_REF3_PCT / 100) },
    { label: t('platform'), pct: PAYOUT_TREASURY_PCT, sol: priceSol * (PAYOUT_TREASURY_PCT / 100) },
  ], [priceSol, t]);

  /* -------------------------------------------------------- */
  /* ACTION                                                   */
  /* -------------------------------------------------------- */

  const canActivate = isPlayer && !isActive && !txPending;

  const onActivate = useCallback(async () => {
    if (!address) {
      toast.error(tToast('walletNotConnected'));
      return;
    }
    if (!isPlayer) {
      toast.info(tToast('connectWalletFirst'));
      return;
    }
    if (!canActivate) return;

    const sig = await activate(levelId);
    if (!sig) {
      toast.error(tToast('activationError'));
      return;
    }

    toast.success(tToast('activationSent'));
  }, [address, isPlayer, canActivate, activate, levelId, tToast]);

  /* -------------------------------------------------------- */
  /* SKELETON LOADING (0.5 seconds)                           */
  /* -------------------------------------------------------- */

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black max-w-5xl mx-auto space-y-4 sm:space-y-6 text-white px-2 sm:px-4">
        {/* HEADER SKELETON */}
        <div className="flex items-center justify-between">
          <Skeleton className="h-7 sm:h-9 w-32 sm:w-40 rounded-lg" />
          <Skeleton className="h-4 sm:h-5 w-14 sm:w-16 rounded" />
        </div>

        {/* STATUS CARDS SKELETON */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="rounded-xl bg-[#111113] p-3 sm:p-4">
              <Skeleton className="h-2 sm:h-3 w-12 sm:w-16 rounded mb-2" />
              <Skeleton className="h-5 sm:h-6 w-16 sm:w-20 rounded" />
            </div>
          ))}
        </div>

        {/* MAIN CONTENT SKELETON */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          <div className="lg:col-span-2 space-y-4 sm:space-y-6">
            <section className="rounded-2xl bg-[#111113] p-4 sm:p-5">
              <Skeleton className="h-4 sm:h-5 w-32 sm:w-40 rounded mb-4" />
              <div className="flex justify-center gap-3 sm:gap-4">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-12 sm:h-16 w-12 sm:w-16 rounded-xl" />
                ))}
              </div>
            </section>

            <section className="rounded-2xl bg-[#111113] p-4 sm:p-5 space-y-2 sm:space-y-3">
              <Skeleton className="h-4 sm:h-5 w-28 sm:w-36 rounded mb-3" />
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex justify-between">
                  <Skeleton className="h-3 sm:h-4 w-24 sm:w-32 rounded" />
                  <Skeleton className="h-3 sm:h-4 w-16 sm:w-24 rounded" />
                </div>
              ))}
            </section>
          </div>

          <aside className="space-y-3 sm:space-y-4">
            <Skeleton className="h-10 sm:h-12 w-full rounded-lg" />
            <div className="rounded-2xl bg-[#111113] p-4 sm:p-5 space-y-3">
              <Skeleton className="h-3 sm:h-4 w-20 sm:w-24 rounded" />
              <Skeleton className="h-3 sm:h-4 w-full rounded" />
              <Skeleton className="h-3 sm:h-4 w-3/4 rounded" />
            </div>
          </aside>
        </div>
      </div>
    );
  }

  /* -------------------------------------------------------- */
  /* RENDER                                                   */
  /* -------------------------------------------------------- */

  return (
    <div className="min-h-screen bg-black max-w-5xl mx-auto space-y-4 sm:space-y-6 text-white px-2 sm:px-4">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-semibold tracking-tight">{code}</h1>
          <p className="text-[10px] sm:text-xs text-white/50 mt-0.5">
            {t('activationPrice')}: <span className="text-[#14F195]">{priceSol.toFixed(3)} SOL</span>
          </p>
        </div>
        <button
          onClick={() => router.back()}
          className="text-xs sm:text-sm text-white/50 hover:text-[#14F195] transition-colors"
        >
          ← {t('back')}
        </button>
      </div>

      {note && (
        <div className="rounded-xl bg-[#14F195]/10 p-2 sm:p-3 text-[10px] sm:text-xs text-[#14F195] flex justify-between items-center">
          <span className="truncate">
            {note.startsWith('ACTIVATION_FINALIZED:')
              ? `${tToast('activationFinalized')} · ${note.replace('ACTIVATION_FINALIZED:', '')}`
              : note.startsWith('ACTIVATING_LEVEL:')
              ? tToast('activatingLevel', { level: note.replace('ACTIVATING_LEVEL:', '') })
              : note}
          </span>
          <button 
            onClick={clearNote}
            className="ml-2 hover:bg-white/10 rounded px-1.5 py-0.5 transition-colors"
          >
            ✕
          </button>
        </div>
      )}

      {/* STATUS CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        {/* Status */}
        <div className="rounded-xl bg-[#111113] p-3 sm:p-4">
          <div className="text-[9px] sm:text-[10px] uppercase tracking-wider text-white/40">{t('status')}</div>
          <div className={`mt-1 text-sm sm:text-base font-semibold ${isActive ? "text-[#14F195]" : "text-white/50"}`}>
            {isActive ? t('active') : t('inactive')}
          </div>
        </div>

        {/* Slots Progress */}
        <div className="rounded-xl bg-[#111113] p-3 sm:p-4">
          <div className="text-[9px] sm:text-[10px] uppercase tracking-wider text-white/40">{t('slots')}</div>
          <div className="mt-1 text-sm sm:text-base font-semibold text-white">
            {levelData.slotsFilled}/{SLOTS_PER_CYCLE}
          </div>
        </div>

        {/* Cycles */}
        <div className="rounded-xl bg-[#111113] p-3 sm:p-4">
          <div className="text-[9px] sm:text-[10px] uppercase tracking-wider text-white/40">{t('cycles')}</div>
          <div className="mt-1 text-sm sm:text-base font-semibold text-white">
            {levelData.cycles}
          </div>
        </div>

        {/* Total Earned */}
        <div className="rounded-xl bg-[#111113] p-3 sm:p-4">
          <div className="text-[9px] sm:text-[10px] uppercase tracking-wider text-white/40">{t('earned')}</div>
          <div className="mt-1 text-sm sm:text-base font-semibold text-[#14F195]">
            {totalEarnings.toFixed(3)} SOL
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* LEFT */}
        <div className="lg:col-span-2 space-y-4 sm:space-y-6">
          
          {/* SLOTS VISUALIZATION */}
          <section className="rounded-2xl bg-[#111113] p-4 sm:p-5">
            <div className="text-[10px] sm:text-xs uppercase tracking-wider text-white/40 mb-4">
              {t('cycleProgress')}
            </div>
            
            <div className="flex justify-center gap-3 sm:gap-4">
              {[1, 2, 3].map((slot) => {
                const isFilled = slot <= levelData.slotsFilled;
                return (
                  <div
                    key={slot}
                    className={`
                      flex flex-col items-center justify-center
                      h-14 w-14 sm:h-20 sm:w-20 rounded-xl
                      transition-all duration-300
                      ${isFilled 
                        ? "bg-[#14F195]/20 shadow-[0_0_20px_rgba(20,241,149,0.3)]" 
                        : "bg-[#0d0d0f]"
                      }
                    `}
                  >
                    <div className={`text-lg sm:text-2xl font-bold ${isFilled ? "text-[#14F195]" : "text-white/20"}`}>
                      {slot}
                    </div>
                    <div className={`text-[8px] sm:text-[10px] ${isFilled ? "text-[#14F195]/70" : "text-white/30"}`}>
                      {isFilled ? t('filled') : t('empty')}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Progress bar */}
            <div className="mt-4 sm:mt-6">
              <div className="h-1.5 sm:h-2 rounded-full bg-[#0d0d0f] overflow-hidden">
                <div 
                  className="h-full bg-[#14F195] rounded-full transition-all duration-500"
                  style={{ width: `${(levelData.slotsFilled / SLOTS_PER_CYCLE) * 100}%` }}
                />
              </div>
              <div className="mt-2 flex justify-between text-[9px] sm:text-[10px] text-white/40">
                <span>{t('slotsFilled', { filled: levelData.slotsFilled, total: SLOTS_PER_CYCLE })}</span>
                <span>{t('nextPayout')}: {earningsPerCycle.toFixed(3)} SOL</span>
              </div>
            </div>
          </section>

          {/* PAYOUT BREAKDOWN */}
          <section className="rounded-2xl bg-[#111113] p-4 sm:p-5">
            <div className="text-[10px] sm:text-xs uppercase tracking-wider text-white/40 mb-3 sm:mb-4">
              {t('perActivationDistribution')}
            </div>
            
            <div className="space-y-2 sm:space-y-3">
              {payouts.map((p) => (
                <div
                  key={p.label}
                  className={`flex justify-between items-center ${
                    (p as any).highlight ? "text-[#14F195]" : "text-white/60"
                  }`}
                >
                  <span className="text-[10px] sm:text-sm">{p.label}</span>
                  <div className="flex items-center gap-2 sm:gap-3">
                    <span className={`text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded ${
                      (p as any).highlight ? "bg-[#14F195]/20" : "bg-white/5"
                    }`}>
                      {p.pct}%
                    </span>
                    <span className={`text-[10px] sm:text-sm font-mono ${
                      (p as any).highlight ? "text-[#14F195]" : "text-white/80"
                    }`}>
                      {p.sol.toFixed(4)} SOL
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Total per cycle */}
            <div className="mt-4 pt-4 border-t border-white/5">
              <div className="flex justify-between items-center">
                <span className="text-[10px] sm:text-xs text-white/50">{t('yourEarningsPerCycle')}</span>
                <span className="text-sm sm:text-base font-semibold text-[#14F195]">
                  {earningsPerCycle.toFixed(3)} SOL
                </span>
              </div>
            </div>
          </section>

          {/* HOW IT WORKS */}
          <section className="rounded-2xl bg-[#111113] p-4 sm:p-5">
            <div className="text-[10px] sm:text-xs uppercase tracking-wider text-white/40 mb-3 sm:mb-4">
              {t('howItWorks')}
            </div>
            
            <div className="space-y-3 sm:space-y-4">
              <div className="flex gap-3">
                <div className="flex-shrink-0 h-6 w-6 sm:h-7 sm:w-7 rounded-full bg-[#14F195]/20 flex items-center justify-center">
                  <span className="text-[10px] sm:text-xs font-semibold text-[#14F195]">1</span>
                </div>
                <p className="text-[10px] sm:text-sm text-white/60">
                  <span className="text-white/90">{t('step1Title')}</span> — {t('step1Desc')}
                </p>
              </div>
              
              <div className="flex gap-3">
                <div className="flex-shrink-0 h-6 w-6 sm:h-7 sm:w-7 rounded-full bg-[#14F195]/20 flex items-center justify-center">
                  <span className="text-[10px] sm:text-xs font-semibold text-[#14F195]">2</span>
                </div>
                <p className="text-[10px] sm:text-sm text-white/60">
                  <span className="text-white/90">{t('step2Title')}</span> — {t('step2Desc', { percent: 60 })}
                </p>
              </div>
              
              <div className="flex gap-3">
                <div className="flex-shrink-0 h-6 w-6 sm:h-7 sm:w-7 rounded-full bg-[#14F195]/20 flex items-center justify-center">
                  <span className="text-[10px] sm:text-xs font-semibold text-[#14F195]">3</span>
                </div>
                <p className="text-[10px] sm:text-sm text-white/60">
                  <span className="text-white/90">{t('step3Title')}</span> — {t('step3Desc')}
                </p>
              </div>
              
              <div className="flex gap-3">
                <div className="flex-shrink-0 h-6 w-6 sm:h-7 sm:w-7 rounded-full bg-[#14F195]/20 flex items-center justify-center">
                  <span className="text-[10px] sm:text-xs font-semibold text-[#14F195]">4</span>
                </div>
                <p className="text-[10px] sm:text-sm text-white/60">
                  <span className="text-white/90">{t('step4Title')}</span> — {t('step4Desc')}
                </p>
              </div>
            </div>
          </section>
        </div>

        {/* RIGHT */}
        <aside className="space-y-3 sm:space-y-4">
          {/* ACTION BUTTON */}
          <button
            onClick={onActivate}
            disabled={!canActivate}
            className={[
              "w-full rounded-lg py-2.5 sm:py-3 text-xs sm:text-sm font-semibold",
              "flex items-center justify-center gap-2",
              isActive 
                ? "bg-[#111113] text-white/40 cursor-not-allowed"
                : "bg-[#14F195] text-black hover:bg-[#12d986]",
              "transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
            ].join(" ")}
          >
            {txPending && !isActive && (
              <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full border-2 border-black border-t-transparent animate-spin flex-shrink-0" />
            )}
            <span>
              {txPending ? t('processing') : isActive ? t('alreadyActivated') : t('activateFor', { price: priceSol.toFixed(3) })}
            </span>
          </button>

          {/* QUICK STATS */}
          {isActive && (
            <div className="rounded-2xl bg-[#111113] p-4 sm:p-5 space-y-3 sm:space-y-4">
              <div className="text-[10px] sm:text-xs uppercase tracking-wider text-white/40">
                {t('levelStatistics')}
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-[10px] sm:text-sm">
                  <span className="text-white/50">{t('perCycleEarnings')}</span>
                  <span className="text-white">{pendingSlotEarnings.toFixed(3)} SOL</span>
                </div>
                <div className="flex justify-between text-[10px] sm:text-sm">
                  <span className="text-white/50">{t('totalCyclesCompleted')}</span>
                  <span className="text-white">{levelData.cycles}</span>
                </div>
                <div className="flex justify-between text-[10px] sm:text-sm">
                  <span className="text-white/50">{t('totalEarned')}</span>
                  <span className="text-[#14F195] font-semibold">{totalEarnings.toFixed(3)} SOL</span>
                </div>
              </div>
            </div>
          )}

          {/* LEVEL INFO */}
          <div className="rounded-2xl bg-[#111113] p-4 sm:p-5 space-y-3 sm:space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-[10px] sm:text-sm">
                <span className="text-white/50">{t('status')}</span>
                <span className="text-white font-mono">{code}</span>
              </div>
              <div className="flex justify-between text-[10px] sm:text-sm">
                <span className="text-white/50">{t('activationPrice')}</span>
                <span className="text-[#14F195]">{priceSol.toFixed(3)} SOL</span>
              </div>
              <div className="flex justify-between text-[10px] sm:text-sm">
                <span className="text-white/50">{t('slots')}</span>
                <span className="text-white">{SLOTS_PER_CYCLE}</span>
              </div>
              <div className="flex justify-between text-[10px] sm:text-sm">
                <span className="text-white/50">{t('youOwner')}</span>
                <span className="text-white">{PAYOUT_OWNER_PCT}%</span>
              </div>
            </div>
          </div>

          {/* NOTE */}
          <div className="rounded-2xl bg-[#111113] p-4 sm:p-5 space-y-3 sm:space-y-4">
            <div className="text-[10px] sm:text-xs uppercase tracking-wider text-white/40">
              {t('note')}
            </div>

            <p className="text-[10px] sm:text-xs text-white/50">
              {t('noteText')}
            </p>

            <div className="space-y-1.5">
              <div className="flex justify-between text-[10px] sm:text-xs">
                <span className="text-white/40">{t('referrerL1')}</span>
                <span className="text-white/70">{PAYOUT_REF1_PCT}%</span>
              </div>
              <div className="flex justify-between text-[10px] sm:text-xs">
                <span className="text-white/40">{t('referrerL2')}</span>
                <span className="text-white/70">{PAYOUT_REF2_PCT}%</span>
              </div>
              <div className="flex justify-between text-[10px] sm:text-xs">
                <span className="text-white/40">{t('referrerL3')}</span>
                <span className="text-white/70">{PAYOUT_REF3_PCT}%</span>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
