"use client";

import { memo, useEffect, useMemo, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useTranslations } from "next-intl";

import { loadLocalHistory } from "@/lib/sdk/history/local";
import { withSyntheticClosures } from "@/lib/sdk/history/derive";
import { explorerTxUrl, explorerAddressUrl } from "@/lib/sdk/utils";
import { toast } from "@/lib/sdk/toast";

import type { TxEvent, TxKind } from "@/lib/sdk/history/types";
import {
  priceLamportsForLevel,
  lamportsToSol,
} from "@/lib/sdk/prices";

/* ------------------------------------------------------------ */
/* STYLE MAP                                                    */
/* ------------------------------------------------------------ */

const KIND_CONFIG: Record<TxKind, { label: string; color: string }> = {
  ACTIVATE:     { label: "Activated", color: "text-[#14F195] bg-[#14F195]/10" },
  RECYCLE:      { label: "Recycled", color: "text-cyan-400 bg-cyan-400/10" },
  RECYCLE_OPEN: { label: "Re-opened", color: "text-cyan-400 bg-cyan-400/10" },
  CYCLE_CLOSE:  { label: "Cycle Done", color: "text-[#14F195] bg-[#14F195]/10" },

  REWARD_60:    { label: "+60% Owner", color: "text-[#14F195] bg-[#14F195]/10" },
  REF_T1_13:    { label: "+13% Ref L1", color: "text-purple-400 bg-purple-400/10" },
  REF_T2_8:     { label: "+8% Ref L2", color: "text-purple-400 bg-purple-400/10" },
  REF_T3_5:     { label: "+5% Ref L3", color: "text-purple-400 bg-purple-400/10" },

  REFERRAL_ACTIVATION: { label: "Referral Activated", color: "text-[#9945FF] bg-[#9945FF]/10" },
  REFERRAL_REGISTERED: { label: "Referral Registered", color: "text-[#9945FF] bg-[#9945FF]/10" },

  TREASURY_14:  { label: "Platform", color: "text-white/40 bg-white/5" },
};

const KIND_PERC: Partial<Record<TxKind, number>> = {
  REWARD_60:   0.60,
  REF_T1_13:   0.13,
  REF_T2_8:    0.08,
  REF_T3_5:    0.05,
  TREASURY_14: 0.14,
};

/* ------------------------------------------------------------ */
/* HELPERS                                                      */
/* ------------------------------------------------------------ */

const isPending = (ev: TxEvent) =>
  typeof ev.sig === "string" && ev.sig.startsWith("pending-");

const isSynthetic = (ev: TxEvent) => ev.synthetic === true;

const sortDesc = (a: TxEvent, b: TxEvent) => {
  const ap = isPending(a);
  const bp = isPending(b);
  if (ap !== bp) return ap ? -1 : 1;
  return b.ts - a.ts;
};

// fmtDate will be defined inside Row component to use translations

/* ------------------------------------------------------------ */
/* PROPS                                                        */
/* ------------------------------------------------------------ */

export type HistoryListProps = {
  items?: TxEvent[];
  compact?: boolean;
  pageSize?: number;
  onCopied?: (msg: string) => void;
};

/* ------------------------------------------------------------ */
/* MAIN                                                         */
/* ------------------------------------------------------------ */

export default function HistoryList({
  items: itemsProp,
  compact = false,
  pageSize = 12,
  onCopied,
}: HistoryListProps) {
  const { publicKey } = useWallet();
  const wallet = publicKey?.toBase58();
  const t = useTranslations('toast');
  const tHistory = useTranslations('history');

  const controlled = Array.isArray(itemsProp);
  const [itemsState, setItemsState] = useState<TxEvent[]>([]);

  /* controlled */
  useEffect(() => {
    if (controlled) setItemsState(itemsProp ?? []);
  }, [controlled, itemsProp]);

  /* uncontrolled (wallet-scoped) */
  useEffect(() => {
    if (controlled || !wallet) return;

    const reload = () => {
      const raw = loadLocalHistory(wallet);
      setItemsState(withSyntheticClosures(raw));
    };

    reload();
    window.addEventListener("history-updated", reload);

    return () => {
      window.removeEventListener("history-updated", reload);
    };
  }, [controlled, wallet]);

  const items = useMemo(
    () => [...itemsState].sort(sortDesc),
    [itemsState]
  );

  /* pagination */
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const [page, setPage] = useState(1);

  useEffect(() => setPage(1), [total, pageSize, wallet]);

  const safePage = Math.min(Math.max(1, page), totalPages);

  const slice = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, safePage, pageSize]);

  if (total === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      {/* PAGINATION HEADER */}
      {totalPages > 1 && (
        <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] sm:text-xs text-white/50">
          <span>
            {tHistory('showing', { 
              start: (safePage - 1) * pageSize + 1, 
              end: Math.min(safePage * pageSize, total), 
              total 
            })}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={safePage <= 1}
              className="px-2 py-1 rounded bg-[#0d0d0f] hover:bg-[#161618] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              ←
            </button>
            <span className="px-2">{safePage}/{totalPages}</span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={safePage >= totalPages}
              className="px-2 py-1 rounded bg-[#0d0d0f] hover:bg-[#161618] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              →
            </button>
          </div>
        </div>
      )}

      {/* LIST */}
      <ul className="space-y-2">
        {slice.map((ev) => (
          <Row
            key={ev.id}
            ev={ev}
            compact={compact}
            onCopied={onCopied}
            t={t}
            tHistory={tHistory}
          />
        ))}
      </ul>
    </div>
  );
}

/* ------------------------------------------------------------ */
/* ROW COMPONENT                                                */
/* ------------------------------------------------------------ */

const Row = memo(function Row({
  ev,
  compact,
  onCopied,
  t,
  tHistory,
}: {
  ev: TxEvent;
  compact?: boolean;
  t: (key: string) => string;
  tHistory: (key: string) => string;
  onCopied?: (msg: string) => void;
}) {
  const fmtDate = (ts: number) => {
    try {
      const date = new Date(ts);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return tHistory('justNow');
      if (diffMins < 60) return `${diffMins}${tHistory('mAgo')}`;
      if (diffHours < 24) return `${diffHours}${tHistory('hAgo')}`;
      if (diffDays < 7) return `${diffDays}${tHistory('dAgo')}`;
      
      return date.toLocaleDateString("en-US", { 
        month: "short", 
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch {
      return String(ts);
    }
  };

  const config = KIND_CONFIG[ev.kind] ?? { 
    label: ev.kind, 
    color: "text-white/60 bg-white/5"
  };

  // Для REFERRAL_ACTIVATION используем специальный формат с номером уровня
  let displayLabel = config.label;
  if (ev.kind === "ACTIVATE") {
    displayLabel = tHistory('activated');
  } else if (ev.kind === "REFERRAL_ACTIVATION") {
    const baseLabel = tHistory('referralActivated') || 'Referral Activated';
    displayLabel = `${baseLabel} L${ev.levelId}`;
  } else if (ev.kind === "REFERRAL_REGISTERED") {
    // Используем перевод для REFERRAL_REGISTERED
    displayLabel = tHistory('referralRegistered') || 'Referral Registered';
  }

  const perc = KIND_PERC[ev.kind];
  let amount: string | null = null;

  // REFERRAL_ACTIVATION и REFERRAL_REGISTERED не показывают сумму (это не выплаты)
  if (perc != null && ev.kind !== "REFERRAL_ACTIVATION" && ev.kind !== "REFERRAL_REGISTERED") {
    const lamports = priceLamportsForLevel(ev.levelId);
    const shareLamports = (lamports * BigInt(Math.round(perc * 100))) / 100n;
    amount = `+${lamportsToSol(shareLamports).toFixed(3)} SOL`;
  }

  // Для REFERRAL_REGISTERED извлекаем адрес реферала из сигнатуры
  let displayAddress: string | null = null;
  if (ev.kind === "REFERRAL_REGISTERED" && ev.sig) {
    // Формат: referral-registered-line{1|2|3}-<address>-<timestamp>
    const newFormatMatch = ev.sig.match(/^referral-registered-line[123]-([A-Za-z0-9]{32,44})-\d+$/);
    if (newFormatMatch) {
      displayAddress = newFormatMatch[1];
    } else {
      // Старый формат: referral-registered-<address>-<timestamp>
      const oldFormatMatch = ev.sig.match(/^referral-registered-([A-Za-z0-9]{32,44})-\d+$/);
      if (oldFormatMatch) {
        displayAddress = oldFormatMatch[1];
      }
    }
  }

  // Для REFERRAL_REGISTERED используем ссылку на адрес кошелька реферала
  // Для остальных событий - ссылка на транзакцию (если есть реальная подпись)
  // ВАЖНО: Не создаем ссылку на транзакцию для REFERRAL_REGISTERED, так как это синтетическое событие
  let explorer: string | null = null;
  if (ev.kind === "REFERRAL_REGISTERED" && displayAddress) {
    explorer = explorerAddressUrl(displayAddress);
  } else if (ev.kind !== "REFERRAL_REGISTERED" && ev.sig && !isPending(ev) && !isSynthetic(ev) && !displayAddress) {
    explorer = explorerTxUrl(ev.sig);
  }

  const canCopy = !!(ev.sig || displayAddress) && !isPending(ev) && !isSynthetic(ev);

  const copy = async () => {
    if (!canCopy) return;
    const textToCopy = displayAddress || ev.sig;
    if (!textToCopy) return;
    try {
      await navigator.clipboard.writeText(textToCopy);
      toast.success(displayAddress ? t('addressCopied') : t('signatureCopied'));
    } catch {
      toast.error(t('copyFailed'));
    }
  };

  const pending = isPending(ev);
  const synthetic = isSynthetic(ev);

  return (
    <li
      className={[
        "rounded-xl bg-[#0d0d0f] transition-all",
        compact ? "p-2 sm:p-3" : "p-3 sm:p-4",
        pending ? "opacity-60" : "hover:bg-[#121416]",
      ].join(" ")}
    >
      {/* MOBILE LAYOUT */}
      <div className="flex flex-col gap-2 sm:hidden">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${config.color}`}>
              {displayLabel}
            </span>
            {/* LEVEL - не показываем для REFERRAL_REGISTERED и REFERRAL_ACTIVATION (уровень уже в лейбле) */}
            {ev.kind !== "REFERRAL_REGISTERED" && ev.kind !== "REFERRAL_ACTIVATION" && (
              <span className="text-[10px] text-white/40">
                L{String(ev.levelId).padStart(2, "0")}
              </span>
            )}
          </div>
          {pending && (
            <span className="text-[9px] text-amber-400 animate-pulse">
              pending
            </span>
          )}
        </div>

        <div className="flex items-center justify-between">
          <span className="text-[10px] text-white/40">{fmtDate(ev.ts)}</span>
          
          <div className="flex items-center gap-2">
            {amount && (
              <span className="text-xs font-semibold text-[#14F195]">
                {amount}
              </span>
            )}
            {/* Signature/Address button for mobile */}
            {canCopy && (
              <button
                onClick={copy}
                className="rounded-lg bg-[#161618] px-2 py-1 text-[10px] text-white/50 
                           hover:bg-[#1a1a1c] hover:text-white/70 transition-colors font-mono"
                title={displayAddress || ev.sig || "No address"}
              >
                {displayAddress 
                  ? `${displayAddress.slice(0, 4)}…${displayAddress.slice(-4)}`
                  : (ev.sig ? `${ev.sig.slice(0, 8)}…` : "—")
                }
              </button>
            )}
            {explorer && (
              <a
                href={explorer}
                target="_blank"
                rel="noreferrer"
                className="rounded-md bg-[#14F195]/10 px-2 py-1 text-[10px] text-[#14F195] hover:bg-[#14F195]/20 transition-colors"
              >
                {tHistory('view')} ↗
              </a>
            )}
          </div>
        </div>
      </div>

      {/* DESKTOP LAYOUT */}
      <div className="hidden sm:flex sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {/* KIND BADGE */}
          <span className={`flex-shrink-0 rounded-full px-2.5 py-1 text-[10px] font-medium ${config.color}`}>
            {displayLabel}
          </span>

          {/* LEVEL - не показываем для REFERRAL_REGISTERED и REFERRAL_ACTIVATION (уровень уже в лейбле) */}
          {ev.kind !== "REFERRAL_REGISTERED" && ev.kind !== "REFERRAL_ACTIVATION" && (
            <span className="flex-shrink-0 text-xs font-mono text-white/60">
              L{String(ev.levelId).padStart(2, "0")}
            </span>
          )}

          {/* SYNTHETIC BADGE */}
          {synthetic && (
            <span className="flex-shrink-0 rounded-full bg-cyan-400/10 px-1.5 py-0.5 text-[9px] text-cyan-400">
              synthetic
            </span>
          )}

          {/* TIMESTAMP */}
          <span className="flex-shrink-0 text-[10px] text-white/40">{fmtDate(ev.ts)}</span>

          {/* PENDING */}
          {pending && (
            <span className="flex-shrink-0 text-[10px] text-amber-400 animate-pulse">
              pending…
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          {/* AMOUNT */}
          {amount && (
            <span className="flex-shrink-0 text-xs sm:text-sm font-semibold text-[#14F195]">
              {amount}
            </span>
          )}

          {/* SIGNATURE / ADDRESS */}
          <button
            disabled={!canCopy}
            onClick={copy}
            className="rounded-lg bg-[#161618] px-2 py-1 text-[10px] text-white/50 
                       hover:bg-[#1a1a1c] hover:text-white/70
                       disabled:opacity-30 disabled:cursor-not-allowed transition-colors
                       font-mono max-w-[200px] truncate"
            title={displayAddress || ev.sig || "No address"}
          >
            {/* Для REFERRAL_REGISTERED показываем адрес, для остальных - сигнатуру */}
            {displayAddress ? (
              <>
                <span className="hidden sm:inline">{displayAddress}</span>
                <span className="sm:hidden">{displayAddress.slice(0, 4)}…{displayAddress.slice(-4)}</span>
              </>
            ) : (
              <>
                <span className="hidden sm:inline">{ev.sig || "—"}</span>
                <span className="sm:hidden">{ev.sig ? `${ev.sig.slice(0, 8)}…` : "—"}</span>
              </>
            )}
          </button>

          {/* EXPLORER LINK */}
          {explorer && (
            <a
              href={explorer}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg bg-[#14F195]/10 px-2.5 py-1 text-[10px] text-[#14F195] 
                         hover:bg-[#14F195]/20 transition-colors"
            >
              Explorer ↗
            </a>
          )}
        </div>
      </div>
    </li>
  );
});
