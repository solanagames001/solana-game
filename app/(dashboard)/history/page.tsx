"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useTranslations } from "next-intl";

import HistoryList from "@/components/levels/HistoryList";
import type { TxEvent } from "@/lib/sdk/history/types";
import { loadLocalHistory } from "@/lib/sdk/history/local";
import { withSyntheticClosures } from "@/lib/sdk/history/derive";
import { toast } from "@/lib/sdk/toast";

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

function SkeletonRow() {
  return (
    <div className="rounded-xl bg-[#0d0d0f] p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
      <div className="flex items-center gap-2 sm:gap-3">
        <Skeleton className="h-5 sm:h-6 w-16 sm:w-20 rounded-full" />
        <Skeleton className="h-4 sm:h-5 w-10 sm:w-12 rounded" />
        <Skeleton className="h-3 sm:h-4 w-24 sm:w-32 rounded hidden sm:block" />
      </div>
      <div className="flex items-center gap-2">
        <Skeleton className="h-4 sm:h-5 w-16 sm:w-20 rounded" />
        <Skeleton className="h-6 sm:h-7 w-14 sm:w-16 rounded-lg" />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------ */
/* Filters                                                       */
/* ------------------------------------------------------------ */

type FilterKey = "ALL" | "ACTIVATIONS" | "EARNINGS" | "PENDING";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "ALL", label: "All" },
  { key: "ACTIVATIONS", label: "Activations" },
  { key: "EARNINGS", label: "Earnings" },
  { key: "PENDING", label: "Pending" },
];

const isPending = (ev: TxEvent): boolean =>
  ev.sig.startsWith("pending-");

const isEarning = (ev: TxEvent): boolean =>
  ["REWARD_60", "REF_T1_13", "REF_T2_8", "REF_T3_5", "CYCLE_CLOSE", "REFERRAL_ACTIVATION"].includes(ev.kind);

const isActivation = (ev: TxEvent): boolean =>
  ["ACTIVATE", "RECYCLE", "RECYCLE_OPEN"].includes(ev.kind);

/* ------------------------------------------------------------ */
/* Stats calculation                                             */
/* ------------------------------------------------------------ */

function calculateStats(history: TxEvent[]) {
  let totalActivations = 0;
  let totalEarnings = 0;
  let pendingCount = 0;
  let cyclesCompleted = 0;

  for (const ev of history) {
    if (isPending(ev)) {
      pendingCount++;
      continue;
    }

    if (isActivation(ev)) {
      totalActivations++;
    }

    if (ev.kind === "CYCLE_CLOSE") {
      cyclesCompleted++;
    }

    // Earnings are tracked separately in the system
    // This is a placeholder for UI purposes
  }

  return {
    totalActivations,
    totalEarnings,
    pendingCount,
    cyclesCompleted,
  };
}

/* ------------------------------------------------------------ */
/* Page Component                                                */
/* ------------------------------------------------------------ */

export default function HistoryPage() {
  const t = useTranslations('historyPage');
  const { publicKey } = useWallet();
  const wallet = publicKey?.toBase58() ?? null;

  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<FilterKey>("ALL");
  const [history, setHistory] = useState<TxEvent[]>([]);

  // Show skeleton for 0.5 seconds
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  /* ------------------------------------------------------------ */
  /* Load wallet-scoped history                                   */
  /* ------------------------------------------------------------ */

  useEffect(() => {
    if (!wallet) {
      setHistory([]);
      return;
    }

    const load = () => {
      const raw = loadLocalHistory(wallet);
      setHistory(withSyntheticClosures(raw));
    };

    load();

    window.addEventListener("levels-history-changed", load);
    window.addEventListener("storage", load);

    return () => {
      window.removeEventListener("levels-history-changed", load);
      window.removeEventListener("storage", load);
    };
  }, [wallet]);

  /* ------------------------------------------------------------ */
  /* Apply filter                                                 */
  /* ------------------------------------------------------------ */

  const filtered = useMemo(() => {
    switch (filter) {
      case "ACTIVATIONS":
        return history.filter(isActivation);
      case "EARNINGS":
        return history.filter(isEarning);
      case "PENDING":
        return history.filter(isPending);
      case "ALL":
      default:
        return history;
    }
  }, [history, filter]);

  /* ------------------------------------------------------------ */
  /* Stats                                                        */
  /* ------------------------------------------------------------ */

  const stats = useMemo(() => calculateStats(history), [history]);

  /* ------------------------------------------------------------ */
  /* Copy wallet                                                  */
  /* ------------------------------------------------------------ */

  const copyWallet = useCallback(async () => {
    if (!wallet) {
      toast.info(t('connectFirst'));
      return;
    }

    try {
      await navigator.clipboard.writeText(wallet);
      toast.success(t('walletCopied'));
    } catch {
      toast.error(t('copyFailed'));
    }
  }, [wallet, t]);

  /* ------------------------------------------------------------ */
  /* Skeleton Loading                                             */
  /* ------------------------------------------------------------ */

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black space-y-4 sm:space-y-6 text-white">
        {/* HEADER SKELETON */}
        <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Skeleton className="h-7 sm:h-9 w-32 sm:w-40 rounded-lg mb-2" />
            <Skeleton className="h-3 sm:h-4 w-48 sm:w-64 rounded" />
          </div>
          <Skeleton className="h-8 sm:h-9 w-36 sm:w-44 rounded-lg" />
        </header>

        {/* STATS SKELETON */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="rounded-xl bg-[#111113] p-3 sm:p-4">
              <Skeleton className="h-2 sm:h-3 w-14 sm:w-20 rounded mb-2" />
              <Skeleton className="h-5 sm:h-6 w-10 sm:w-14 rounded" />
            </div>
          ))}
        </div>

        {/* FILTERS SKELETON */}
        <div className="flex gap-2">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-8 sm:h-9 w-20 sm:w-24 rounded-full" />
          ))}
        </div>

        {/* LIST SKELETON */}
        <section className="rounded-2xl bg-[#111113] p-4 sm:p-5 space-y-2 sm:space-y-3">
          {[...Array(6)].map((_, i) => (
            <SkeletonRow key={i} />
          ))}
        </section>
      </div>
    );
  }

  /* ------------------------------------------------------------ */
  /* Render                                                       */
  /* ------------------------------------------------------------ */

  const FILTERS_TRANSLATED: { key: FilterKey; label: string }[] = [
    { key: "ALL", label: t('all') },
    { key: "ACTIVATIONS", label: t('activations') },
    { key: "EARNINGS", label: t('earnings') },
    { key: "PENDING", label: t('pending') },
  ];

  return (
    <div className="min-h-screen bg-black space-y-4 sm:space-y-6 text-white">
      {/* HEADER */}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
            {t('title')}
          </h1>
          <p className="text-[10px] sm:text-xs text-white/50 mt-0.5">
            {t('subtitle')}
          </p>
        </div>

        {/* WALLET BADGE */}
        <button
          onClick={copyWallet}
          className="w-full sm:w-auto flex items-center justify-between sm:justify-center gap-2 rounded-xl sm:rounded-lg bg-[#111113] px-4 py-3 sm:py-2 text-[11px] sm:text-xs hover:bg-[#161618] transition-colors"
        >
          <div className="flex items-center gap-2 min-w-0 flex-1 sm:flex-initial">
            <span className="text-white/50 flex-shrink-0">{t('wallet')}:</span>
            <span className="font-mono text-[#14F195] truncate">
              {wallet ? wallet : t('notConnected')}
            </span>
          </div>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white/40 flex-shrink-0">
            <rect x="9" y="9" width="13" height="13" rx="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
        </button>
      </header>

      {/* STATS CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        <div className="rounded-xl bg-[#111113] p-3 sm:p-4">
          <div className="text-[9px] sm:text-[10px] uppercase tracking-wider text-white/40">{t('totalEvents')}</div>
          <div className="mt-1 text-lg sm:text-xl font-semibold text-white">
            {history.length}
          </div>
        </div>

        <div className="rounded-xl bg-[#111113] p-3 sm:p-4">
          <div className="text-[9px] sm:text-[10px] uppercase tracking-wider text-white/40">{t('activations')}</div>
          <div className="mt-1 text-lg sm:text-xl font-semibold text-white">
            {stats.totalActivations}
          </div>
        </div>

        <div className="rounded-xl bg-[#111113] p-3 sm:p-4">
          <div className="text-[9px] sm:text-[10px] uppercase tracking-wider text-white/40">{t('cyclesDone')}</div>
          <div className="mt-1 text-lg sm:text-xl font-semibold text-white">
            {stats.cyclesCompleted}
          </div>
        </div>

        <div className="rounded-xl bg-[#111113] p-3 sm:p-4">
          <div className="text-[9px] sm:text-[10px] uppercase tracking-wider text-white/40">{t('pending')}</div>
          <div className="mt-1 text-lg sm:text-xl font-semibold text-white">
            {stats.pendingCount}
          </div>
        </div>
      </div>

      {/* FILTER TABS */}
      <div className="flex gap-1.5 sm:gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {FILTERS_TRANSLATED.map(({ key, label }) => {
          const active = filter === key;
          const count = key === "ALL" ? history.length
            : key === "ACTIVATIONS" ? history.filter(isActivation).length
            : key === "EARNINGS" ? history.filter(isEarning).length
            : history.filter(isPending).length;

          return (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={[
                "flex items-center gap-1 sm:gap-2 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-full text-[9px] sm:text-xs font-medium transition-all whitespace-nowrap flex-shrink-0",
                active
                  ? "bg-[#14F195] text-black shadow-[0_0_12px_rgba(20,241,149,0.4)]"
                  : "bg-[#111113] text-white/60 hover:bg-[#161618] hover:text-white",
              ].join(" ")}
            >
              <span>{label}</span>
              <span className={`px-1 sm:px-1.5 py-0.5 rounded text-[8px] sm:text-[10px] ${
                active ? "bg-black/20" : "bg-white/10"
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* HISTORY LIST */}
      <section className="rounded-2xl bg-[#111113] p-4 sm:p-5">
        {!wallet ? (
          <div className="text-center py-8 sm:py-12">
            <div className="text-sm sm:text-base text-white/60">{t('connectWallet')}</div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-8 sm:py-12">
            <div className="text-sm sm:text-base text-white/60">
              {filter === "ALL" 
                ? t('noTransactions')
                : (() => {
                    const filterKey = filter.toLowerCase() as 'activations' | 'earnings' | 'pending';
                    const filterText = t(filterKey);
                    const lowercasedFilter = filterText.charAt(0).toLowerCase() + filterText.slice(1);
                    return t('noEventsFound', { filter: lowercasedFilter });
                  })()}
            </div>
          </div>
        ) : (
          <HistoryList
            items={filtered}
            pageSize={15}
          />
        )}
      </section>

      {/* INFO CARD */}
      <section className="rounded-2xl bg-[#111113] p-4 sm:p-5">
        <div className="text-[10px] sm:text-xs uppercase tracking-wider text-white/40 mb-3 sm:mb-4">
          {t('transactionTypes')}
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <div className="rounded-xl bg-[#0d0d0f] p-3 sm:p-4">
            <div className="mb-2">
              <span className="text-xs sm:text-sm font-medium text-white">{t('activations')}</span>
            </div>
            <p className="text-[10px] sm:text-xs text-white/50">
              {t('activationsDesc')}
            </p>
          </div>

          <div className="rounded-xl bg-[#0d0d0f] p-3 sm:p-4">
            <div className="mb-2">
              <span className="text-xs sm:text-sm font-medium text-white">{t('earnings')}</span>
            </div>
            <p className="text-[10px] sm:text-xs text-white/50">
              {t('earningsDesc')}
            </p>
          </div>

          <div className="rounded-xl bg-[#0d0d0f] p-3 sm:p-4">
            <div className="mb-2">
              <span className="text-xs sm:text-sm font-medium text-white">{t('pending')}</span>
            </div>
            <p className="text-[10px] sm:text-xs text-white/50">
              {t('pendingDesc')}
            </p>
          </div>

          <div className="rounded-xl bg-[#0d0d0f] p-3 sm:p-4">
            <div className="mb-2">
              <span className="text-xs sm:text-sm font-medium text-white">{t('cyclesDone')}</span>
            </div>
            <p className="text-[10px] sm:text-xs text-white/50">
              {t('cyclesDesc')}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
