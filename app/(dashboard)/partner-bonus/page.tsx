"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { usePlayer } from "@/lib/sdk/hooks/usePlayer";
import { toast } from "@/lib/sdk/toast";

// HISTORY
import { loadLocalHistory } from "@/lib/sdk/history/local";
import { withSyntheticClosures } from "@/lib/sdk/history/derive";
import type { TxEvent, TxKind } from "@/lib/sdk/history/types";

// PRICES
import { priceLamportsForLevel, lamportsToSol } from "@/lib/sdk/prices";

/* ------------------------------------------------------------ */
/* Constants from on-chain program                              */
/* ------------------------------------------------------------ */

// Line keys for translation lookup
const REF_LINE_KEYS = {
  REF_T1_13: "line1Label",
  REF_T2_8: "line2Label",
  REF_T3_5: "line3Label",
} as const;

const REF_PERC: Partial<Record<TxKind, number>> = {
  REF_T1_13: 0.13,
  REF_T2_8: 0.08,
  REF_T3_5: 0.05,
};

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
/* Types                                                         */
/* ------------------------------------------------------------ */

interface PartnerTx {
  id: string;
  date: string;
  relativeTime: string;
  level: string;
  amount: number;
  type: TxKind;
  lineKey: string; // Translation key for line
  referralAddress?: string; // Referral wallet address if available
}

/* ------------------------------------------------------------ */
/* Helpers                                                       */
/* ------------------------------------------------------------ */

// getRelativeTime moved inside component to use translations

/* ------------------------------------------------------------ */
/* Page                                                          */
/* ------------------------------------------------------------ */

export default function PartnerBonusPage() {
  const t = useTranslations('partnerBonusPage');
  const tHistory = useTranslations('history'); // Translation for history section
  const { address } = usePlayer();

  const [isLoading, setIsLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(true);
  const [history, setHistory] = useState<PartnerTx[]>([]);
  const [totals, setTotals] = useState({ ref1: 0, ref2: 0, ref3: 0, total: 0 });

  // Skeleton timer
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  /* ------------------------------------------------------------ */
  /* Load referral history                                        */
  /* ------------------------------------------------------------ */

  const refresh = useCallback(() => {
    const getRelativeTime = (ts: number): string => {
      const now = Date.now();
      const diffMs = now - ts;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return tHistory('justNow');
      if (diffMins < 60) return `${diffMins}${tHistory('mAgo')}`;
      if (diffHours < 24) return `${diffHours}${tHistory('hAgo')}`;
      if (diffDays < 7) return `${diffDays}${tHistory('dAgo')}`;
      
      return new Date(ts).toLocaleDateString("en-US", { 
        month: "short", 
        day: "numeric"
      });
    };

    setDataLoading(true);

    try {
      if (!address) {
        setHistory([]);
        setTotals({ ref1: 0, ref2: 0, ref3: 0, total: 0 });
        setDataLoading(false);
        return;
      }

      const all: TxEvent[] = withSyntheticClosures(loadLocalHistory(address));

      const refEvents = all.filter(
        (ev) =>
          ev.kind === "REF_T1_13" ||
          ev.kind === "REF_T2_8" ||
          ev.kind === "REF_T3_5" ||
          ev.kind === "REFERRAL_REGISTERED"
      );

      refEvents.sort((a, b) => b.ts - a.ts);

      let ref1 = 0;
      let ref2 = 0;
      let ref3 = 0;

      const txs: PartnerTx[] = refEvents.map((ev) => {
        // Extract referral address from signature if available
        // Format: referral-registered-line{1|2|3}-<address>-<timestamp>
        // or: referral-registered-<address>-<timestamp>
        let referralAddress: string | undefined;
        if (ev.sig) {
          const newFormatMatch = ev.sig.match(/^referral-registered-line[123]-([A-Za-z0-9]{32,44})-\d+$/);
          if (newFormatMatch) {
            referralAddress = newFormatMatch[1];
          } else {
            const oldFormatMatch = ev.sig.match(/^referral-registered-([A-Za-z0-9]{32,44})-\d+$/);
            if (oldFormatMatch) {
              referralAddress = oldFormatMatch[1];
            }
          }
        }

        // REFERRAL_REGISTERED не имеет суммы выплаты
        if (ev.kind === "REFERRAL_REGISTERED") {
          return {
            id: ev.id,
            date: new Date(ev.ts).toLocaleString(),
            relativeTime: getRelativeTime(ev.ts),
            level: "—",
            amount: 0,
            type: ev.kind,
            lineKey: "registration",
            referralAddress,
          };
        }

        const priceLamports = priceLamportsForLevel(ev.levelId);
        const perc = REF_PERC[ev.kind] ?? 0;
        const perc100 = Math.floor(perc * 100);
        const rewardLamports = (priceLamports * BigInt(perc100)) / 100n;
        const rewardSol = lamportsToSol(rewardLamports);

        if (ev.kind === "REF_T1_13") ref1 += rewardSol;
        if (ev.kind === "REF_T2_8") ref2 += rewardSol;
        if (ev.kind === "REF_T3_5") ref3 += rewardSol;

        const lineKey = REF_LINE_KEYS[ev.kind as keyof typeof REF_LINE_KEYS] ?? ev.kind;

        return {
          id: ev.id,
          date: new Date(ev.ts).toLocaleString(),
          relativeTime: getRelativeTime(ev.ts),
          level: `L${String(ev.levelId).padStart(2, "0")}`,
          amount: rewardSol,
          type: ev.kind,
          lineKey,
          referralAddress,
        };
      });

      setHistory(txs);
      setTotals({ ref1, ref2, ref3, total: ref1 + ref2 + ref3 });
    } catch (e) {
      console.error(e);
      toast.error(t('failedToLoad'));
    } finally {
      setDataLoading(false);
    }
  }, [address, tHistory, t]);

  useEffect(() => {
    refresh();
    const handler = () => refresh();
    window.addEventListener("levels-history-changed", handler);
    return () => window.removeEventListener("levels-history-changed", handler);
  }, [refresh]);

  /* ------------------------------------------------------------ */
  /* Referral link                                                */
  /* ------------------------------------------------------------ */

  const referralLink = useMemo(() => {
    if (!address) return null;
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    return `${origin}/?ref=${address}`;
  }, [address]);

  const copyLink = useCallback(async () => {
    if (!referralLink) {
      toast.error(t('connectFirst'));
      return;
    }
    try {
      await navigator.clipboard.writeText(referralLink);
      toast.info(t('linkCopied'));
    } catch {
      toast.error(t('copyFailed'));
    }
  }, [referralLink, t]);

  /* ------------------------------------------------------------ */
  /* Skeleton Loading                                             */
  /* ------------------------------------------------------------ */

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black space-y-4 sm:space-y-6 text-white">
        <header>
          <Skeleton className="h-8 sm:h-10 w-40 sm:w-52 rounded-lg mb-2" />
          <Skeleton className="h-3 sm:h-4 w-56 sm:w-72 rounded" />
        </header>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="rounded-xl bg-[#111113] p-3 sm:p-4">
              <Skeleton className="h-2 sm:h-3 w-14 sm:w-20 rounded mb-2" />
              <Skeleton className="h-5 sm:h-6 w-16 sm:w-24 rounded" />
            </div>
          ))}
        </div>

        <section className="rounded-2xl bg-[#111113] p-4 sm:p-6">
          <Skeleton className="h-4 sm:h-5 w-32 sm:w-40 rounded mb-4" />
          <Skeleton className="h-10 sm:h-12 w-full rounded-lg" />
        </section>

        {[...Array(2)].map((_, i) => (
          <section key={i} className="rounded-2xl bg-[#111113] p-4 sm:p-6">
            <Skeleton className="h-4 sm:h-5 w-40 sm:w-52 rounded mb-4" />
            <div className="space-y-2">
              {[...Array(3)].map((_, j) => (
                <Skeleton key={j} className="h-12 sm:h-14 w-full rounded-xl" />
              ))}
            </div>
          </section>
        ))}
      </div>
    );
  }

  /* ------------------------------------------------------------ */
  /* Render                                                        */
  /* ------------------------------------------------------------ */

  return (
    <div className="min-h-screen bg-black space-y-4 sm:space-y-6 text-white">
      {/* HEADER */}
      <header>
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">{t('title')}</h1>
        <p className="text-[10px] sm:text-xs text-white/50 mt-0.5">
          {t('subtitle')}
        </p>
      </header>

      {/* STATS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        <StatCard 
          label={t('totalEarned')} 
          value={dataLoading ? "..." : `${totals.total.toFixed(3)} SOL`} 
        />
        <StatCard 
          label={t('line1')} 
          value={dataLoading ? "..." : `${totals.ref1.toFixed(3)} SOL`} 
        />
        <StatCard 
          label={t('line2')} 
          value={dataLoading ? "..." : `${totals.ref2.toFixed(3)} SOL`} 
        />
        <StatCard 
          label={t('line3')} 
          value={dataLoading ? "..." : `${totals.ref3.toFixed(3)} SOL`} 
        />
      </div>

      {/* REFERRAL LINK */}
      <section className="rounded-2xl bg-[#111113] p-4 sm:p-6">
        <div className="text-[10px] sm:text-xs uppercase tracking-wider text-white/40 mb-3 sm:mb-4">
          {t('yourReferralLink')}
        </div>
        
        {address ? (
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <input
              type="text"
              readOnly
              value={referralLink ?? ""}
              className="flex-1 rounded-lg bg-[#0d0d0f] px-3 sm:px-4 py-2.5 sm:py-3 text-[10px] sm:text-xs font-mono text-white/70 select-all"
            />
            <button
              onClick={copyLink}
              className="rounded-lg bg-[#14F195] px-4 sm:px-6 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold text-black hover:bg-[#12d986] transition-colors"
            >
              {t('copyLink')}
            </button>
          </div>
        ) : (
          <div className="rounded-lg bg-[#0d0d0f] px-4 py-6 text-center text-xs sm:text-sm text-white/50">
            {t('connectWalletForLink')}
          </div>
        )}

        <p className="mt-3 sm:mt-4 text-[10px] sm:text-xs text-white/40">
          {t('linkNote')}
        </p>
      </section>

      {/* HOW IT WORKS */}
      <section className="rounded-2xl bg-[#111113] p-4 sm:p-6">
        <div className="text-[10px] sm:text-xs uppercase tracking-wider text-white/40 mb-3 sm:mb-4">
          {t('howReferralWorks')}
        </div>
        
        <div className="space-y-3 sm:space-y-4">
          <div className="flex gap-3 sm:gap-4">
            <div className="flex-shrink-0 h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-[#14F195]/10 flex items-center justify-center">
              <span className="text-xs sm:text-sm font-semibold text-[#14F195]">1</span>
            </div>
            <div className="flex-1">
              <div className="text-xs sm:text-sm font-medium text-white">{t('step1Title')}</div>
              <p className="mt-1 text-[10px] sm:text-xs text-white/50">
                {t('step1Desc')}
              </p>
            </div>
          </div>
          
          <div className="flex gap-3 sm:gap-4">
            <div className="flex-shrink-0 h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-[#14F195]/10 flex items-center justify-center">
              <span className="text-xs sm:text-sm font-semibold text-[#14F195]">2</span>
            </div>
            <div className="flex-1">
              <div className="text-xs sm:text-sm font-medium text-white">{t('step2Title')}</div>
              <p className="mt-1 text-[10px] sm:text-xs text-white/50">
                {t('step2Desc')}
              </p>
            </div>
          </div>
          
          <div className="flex gap-3 sm:gap-4">
            <div className="flex-shrink-0 h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-[#14F195]/10 flex items-center justify-center">
              <span className="text-xs sm:text-sm font-semibold text-[#14F195]">3</span>
            </div>
            <div className="flex-1">
              <div className="text-xs sm:text-sm font-medium text-white">{t('step3Title')}</div>
              <p className="mt-1 text-[10px] sm:text-xs text-white/50">
                {t('step3Desc')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* PAYOUT STRUCTURE */}
      <section className="rounded-2xl bg-[#111113] p-4 sm:p-6">
        <div className="text-[10px] sm:text-xs uppercase tracking-wider text-white/40 mb-3 sm:mb-4">
          {t('payoutStructure')}
        </div>
        
        <div className="space-y-2 sm:space-y-3">
          <div className="flex items-center justify-between rounded-xl bg-[#0d0d0f] p-3 sm:p-4">
            <div>
              <div className="text-xs sm:text-sm font-medium text-white">{t('directReferrals')}</div>
              <div className="text-[10px] sm:text-xs text-white/40">{t('directReferralsDesc')}</div>
            </div>
            <div className="text-lg sm:text-xl font-semibold text-[#14F195]">13%</div>
          </div>
          
          <div className="flex items-center justify-between rounded-xl bg-[#0d0d0f] p-3 sm:p-4">
            <div>
              <div className="text-xs sm:text-sm font-medium text-white">{t('secondLevel')}</div>
              <div className="text-[10px] sm:text-xs text-white/40">{t('secondLevelDesc')}</div>
            </div>
            <div className="text-lg sm:text-xl font-semibold text-white">8%</div>
          </div>
          
          <div className="flex items-center justify-between rounded-xl bg-[#0d0d0f] p-3 sm:p-4">
            <div>
              <div className="text-xs sm:text-sm font-medium text-white">{t('thirdLevel')}</div>
              <div className="text-[10px] sm:text-xs text-white/40">{t('thirdLevelDesc')}</div>
            </div>
            <div className="text-lg sm:text-xl font-semibold text-white">5%</div>
          </div>
        </div>

        <div className="mt-4 rounded-xl bg-[#0d0d0f] p-3 sm:p-4">
          <div className="text-xs sm:text-sm font-medium text-white mb-2">{t('important')}</div>
          <p className="text-[10px] sm:text-xs text-white/50 leading-relaxed">
            {t('importantDesc')}
          </p>
        </div>
      </section>

      {/* ACTIVITY HISTORY */}
      <section className="rounded-2xl bg-[#111113] p-4 sm:p-6">
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <div className="text-[10px] sm:text-xs uppercase tracking-wider text-white/40">
            {t('referralActivity')}
          </div>
          <button
            onClick={refresh}
            disabled={dataLoading}
            className="rounded-lg bg-[#0d0d0f] px-3 py-1.5 text-[10px] sm:text-xs text-white/60 hover:bg-[#161618] hover:text-white disabled:opacity-50 transition-colors"
          >
            {dataLoading ? t('loading') : t('refresh')}
          </button>
        </div>

        {history.length === 0 ? (
          <div className="text-center py-8 sm:py-12">
            <div className="text-sm sm:text-base text-white/50 mb-2">{t('noActivity')}</div>
            <p className="text-[10px] sm:text-xs text-white/30">
              {t('noActivityDesc')}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {history.slice(0, 10).map((tx) => (
              <div
                key={tx.id}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-xl bg-[#0d0d0f] p-3 sm:p-4"
              >
                <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                  <span className="rounded-full px-2 py-0.5 text-[10px] font-medium bg-[#14F195]/10 text-[#14F195]">
                    {t(tx.lineKey)}
                  </span>
                  {tx.level !== "—" && (
                    <span className="text-xs font-mono text-white/60">{tx.level}</span>
                  )}
                  {tx.referralAddress && (
                    <span className="text-[10px] font-mono text-white/50">
                      {tx.referralAddress.slice(0, 4)}…{tx.referralAddress.slice(-4)}
                    </span>
                  )}
                  <span className="text-[10px] text-white/40 hidden sm:inline">{tx.relativeTime}</span>
                </div>
                <div className="flex items-center justify-between sm:justify-end gap-3">
                  <span className="text-[10px] text-white/40 sm:hidden">{tx.relativeTime}</span>
                  {tx.type === "REFERRAL_REGISTERED" ? (
                    <span className="text-xs text-white/60">{t('newReferral')}</span>
                  ) : (
                    <span className="text-xs sm:text-sm font-semibold text-[#14F195]">
                      +{tx.amount.toFixed(4)} SOL
                    </span>
                  )}
                </div>
              </div>
            ))}

            {history.length > 10 && (
              <div className="text-center pt-2 text-[10px] sm:text-xs text-white/40">
                {t('showingOf', { count: 10, total: history.length })}
              </div>
            )}
          </div>
        )}
      </section>

      {/* TIPS */}
      <section className="rounded-2xl bg-[#111113] p-4 sm:p-6">
        <div className="text-[10px] sm:text-xs uppercase tracking-wider text-white/40 mb-3 sm:mb-4">
          {t('tipsForSuccess')}
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
          <div className="rounded-xl bg-[#0d0d0f] p-3 sm:p-4">
            <div className="text-xs sm:text-sm font-medium text-white mb-1">{t('tip1Title')}</div>
            <p className="text-[10px] sm:text-xs text-white/50">
              {t('tip1Desc')}
            </p>
          </div>
          
          <div className="rounded-xl bg-[#0d0d0f] p-3 sm:p-4">
            <div className="text-xs sm:text-sm font-medium text-white mb-1">{t('tip2Title')}</div>
            <p className="text-[10px] sm:text-xs text-white/50">
              {t('tip2Desc')}
            </p>
          </div>
          
          <div className="rounded-xl bg-[#0d0d0f] p-3 sm:p-4">
            <div className="text-xs sm:text-sm font-medium text-white mb-1">{t('tip3Title')}</div>
            <p className="text-[10px] sm:text-xs text-white/50">
              {t('tip3Desc')}
            </p>
          </div>
          
          <div className="rounded-xl bg-[#0d0d0f] p-3 sm:p-4">
            <div className="text-xs sm:text-sm font-medium text-white mb-1">{t('tip4Title')}</div>
            <p className="text-[10px] sm:text-xs text-white/50">
              {t('tip4Desc')}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

/* ------------------------------------------------------------ */
/* Components                                                    */
/* ------------------------------------------------------------ */

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-[#111113] p-3 sm:p-4">
      <div className="text-[9px] sm:text-[10px] uppercase tracking-wider text-white/40">{label}</div>
      <div className="mt-1 text-base sm:text-lg font-semibold text-white">{value}</div>
    </div>
  );
}
