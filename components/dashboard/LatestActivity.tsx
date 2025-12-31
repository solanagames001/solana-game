"use client";

import { memo, useMemo } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";

import type { TxEvent } from "@/lib/sdk/history/types";
import { explorerTxUrl, explorerAddressUrl } from "@/lib/sdk/utils";

/* -------------------------------------------------------------------------- */
/* HELPERS                                                                    */
/* -------------------------------------------------------------------------- */

function fmtDate(ts: number): string {
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return String(ts);
  }
}

function isPending(ev: TxEvent): boolean {
  return typeof ev.sig === "string" && ev.sig.startsWith("pending-");
}

/* -------------------------------------------------------------------------- */
/* COMPONENT                                                                  */
/* -------------------------------------------------------------------------- */

function LatestActivityBase({
  items,
  limit = 5,
}: {
  items: TxEvent[];
  limit?: number;
}) {
  const tHistory = useTranslations('history');
  
  const list = useMemo(() => {
    if (!items || items.length === 0) return [];

    return [...items]
      .sort((a, b) => {
        const ap = isPending(a);
        const bp = isPending(b);
        if (ap !== bp) return ap ? -1 : 1;
        return b.ts - a.ts;
      })
      .slice(0, limit);
  }, [items, limit]);

  /* EMPTY STATE */
  if (list.length === 0) {
    return (
      <div className="rounded-xl bg-[#0d0d0f] px-4 py-6 text-center">
        <div className="text-sm text-white/40">
          No activity yet
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-end">
        <Link
          href="/history"
          prefetch={false}
          className="text-xs text-[#14F195]/70 hover:text-[#14F195] transition-colors"
        >
          {tHistory('viewAll')} →
        </Link>
      </div>

      <ul className="space-y-2">
        {list.map((ev) => {
          const pending = isPending(ev);
          
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
          let explorerHref: string | null = null;
          if (!pending) {
            if (ev.kind === "REFERRAL_REGISTERED" && displayAddress) {
              explorerHref = explorerAddressUrl(displayAddress);
            } else if (ev.kind !== "REFERRAL_REGISTERED" && ev.sig) {
              explorerHref = explorerTxUrl(ev.sig);
            }
          }

          return (
            <li
              key={ev.id}
              className="
                flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between
                rounded-xl bg-[#0d0d0f] px-4 py-3
              "
            >
              {/* LEFT */}
              <div className="flex flex-wrap items-center gap-1.5 text-xs text-white/60">
                {/* KIND */}
                <span className={`rounded-md px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${
                  ev.kind === "REFERRAL_REGISTERED" 
                    ? "bg-[#9945FF]/10 text-[#9945FF]" 
                    : ev.kind === "REFERRAL_ACTIVATION"
                    ? "bg-[#9945FF]/10 text-[#9945FF]"
                    : "bg-[#14F195]/10 text-[#14F195]"
                }`}>
                  {ev.kind === "REFERRAL_REGISTERED" 
                    ? tHistory('referralRegistered') || 'Referral Registered'
                    : ev.kind === "REFERRAL_ACTIVATION"
                    ? `${tHistory('referralActivated') || 'Referral Activated'} L${ev.levelId}`
                    : ev.kind === "ACTIVATE"
                    ? tHistory('activated') || 'Activated'
                    : ev.kind
                  }
                </span>

                {/* SYNTHETIC */}
                {ev.synthetic && (
                  <span className="rounded-md bg-white/5 px-1.5 py-0.5 text-[10px] text-white/40">
                    synthetic
                  </span>
                )}

                {/* PENDING */}
                {pending && (
                  <span className="rounded-md bg-yellow-500/10 px-1.5 py-0.5 text-[10px] text-yellow-400">
                    pending
                  </span>
                )}

                {/* DATE */}
                <span
                  className="truncate text-xs text-white/50"
                  title={fmtDate(ev.ts)}
                >
                  {fmtDate(ev.ts)}
                </span>

                {/* LEVEL - не показываем для REFERRAL_REGISTERED и REFERRAL_ACTIVATION (уровень уже в лейбле) */}
                {ev.kind !== "REFERRAL_REGISTERED" && ev.kind !== "REFERRAL_ACTIVATION" && (
                  <span className="text-xs text-white/40">
                    · L{String(ev.levelId).padStart(2, "0")}
                  </span>
                )}

                {/* SLOT */}
                {typeof ev.slot === "number" && (
                  <span className="text-xs text-white/30">
                    · slot {ev.slot}
                  </span>
                )}
              </div>

              {/* RIGHT */}
              <div className="text-right text-xs">
                {explorerHref ? (
                  <a
                    href={explorerHref}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#14F195]/70 hover:text-[#14F195] transition-colors"
                  >
                    Explorer ↗
                  </a>
                ) : (
                  <span className="text-white/20 select-none">
                    —
                  </span>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* MEMO                                                                       */
/* -------------------------------------------------------------------------- */

export const LatestActivity = memo(LatestActivityBase);
export default LatestActivity;
