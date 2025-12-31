"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import type { TxEvent } from "@/lib/sdk/history/types";

/**
 * ActivationsSparkline — мини-гистограмма активаций за N дней.
 * Чистый Solana-стиль: мягкий glow, минимализм, адаптив.
 */
export default function ActivationsSparkline({
  items,
  days = 14,
}: {
  items: TxEvent[];
  days?: number;
}) {
  const t = useTranslations('activations');
  const { counts, total, max } = useMemo(() => {
    if (!items?.length) {
      return { counts: Array(days).fill(0), total: 0, max: 1 };
    }

    // Текущая дата (UTC)
    const now = new Date();
    const baseUTC = Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate()
    );

    // Последние N дней (UTC key YYYY-MM-DD)
    const daysArr: string[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(baseUTC - i * 86400000);
      daysArr.push(d.toISOString().slice(0, 10));
    }

    // Группируем только ACTIVATE
    const map = new Map<string, number>();

    for (const ev of items) {
      if (ev.kind !== "ACTIVATE") continue;

      const d = new Date(ev.ts);
      const key = new Date(
        Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
      )
        .toISOString()
        .slice(0, 10);

      map.set(key, (map.get(key) ?? 0) + 1);
    }

    const countsArr = daysArr.map((d) => map.get(d) ?? 0);
    const totalCount = countsArr.reduce((a, b) => a + b, 0);
    const maxVal = Math.max(1, ...countsArr);

    return { counts: countsArr, total: totalCount, max: maxVal };
  }, [items, days]);

  return (
    <div className="space-y-1.5 select-none">
      {/* Header */}
      <div className="text-[11px] sm:text-xs text-white/70 tracking-wide text-center sm:text-left">
        {t('title')} <span className="text-[#14F195]">{t('lastDays', { days })}</span> · {t('total')}{" "}
        <span className="text-[#00FFA3]">{total}</span>
      </div>

      {/* Bars */}
      <div
        className="
          relative flex items-end gap-[2px] overflow-hidden rounded-md
          border border-white/10 bg-[#0b0c0f]/70 backdrop-blur-sm
          h-16 sm:h-10 p-2 sm:p-1
          hover:border-[#14F195]/40 hover:shadow-[0_0_16px_#14F19540]
          transition
        "
      >
        {/* Мягкое свечение */}
        <div className="absolute inset-0 pointer-events-none blur-[8px] opacity-30 bg-gradient-to-t from-[#14F19533] to-transparent" />

        {counts.map((c, i) => {
          const height = (c / max) * 100;

          return (
            <div
              key={i}
              title={t('activationsCount', { count: c })}
              className="
                flex-1 rounded-t-sm bg-gradient-to-t
                from-[#14F195] to-[#00FFA3]
                transition-all duration-300
              "
              style={{
                height: `${height}%`,
                opacity: c > 0 ? 0.9 : 0.15,
                boxShadow: c > 0 ? "0 0 6px #14F19580" : "none",
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
