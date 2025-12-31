"use client";

import React, { useMemo, useEffect, useState } from "react";
import { useConnection } from "@solana/wallet-adapter-react";

import { fetchConfigV3Nullable } from "@/lib/sdk/fetch";

interface PartnerStatsProps {
  balances: {
    ref1: number;
    ref2: number;
    ref3: number;
  };
  loading: boolean;
}

/**
 * PartnerStats — полностью синхронизированная версия с твоим CLEAN SDK v3.10.
 * Использует корректные поля: perc_ref1 / perc_ref2 / perc_ref3.
 */
const PartnerStats = React.memo(function PartnerStats({
  balances,
  loading,
}: PartnerStatsProps) {
  const { connection } = useConnection();

  // fallback значения, если ончейн не загрузится
  const [percents, setPercents] = useState({
    ref1: 13,
    ref2: 8,
    ref3: 5,
  });

  /* ------------------------------------------------------------
     Загружаем ончейн ConfigV3 → подставляем проценты
  ------------------------------------------------------------ */
  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const cfg = await fetchConfigV3Nullable(connection);

        if (cfg && mounted) {
          setPercents({
            ref1: cfg.perc_ref1,
            ref2: cfg.perc_ref2,
            ref3: cfg.perc_ref3,
          });
        }
      } catch (e) {
        console.warn("[PartnerStats] ConfigV3 load failed:", e);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [connection]);

  /* ------------------------------------------------------------
     STATIC UI CONFIG
  ------------------------------------------------------------ */
  const LEVELS = useMemo(
    () => [
      { key: "ref1", label: "Ref 1", color: "#14F195" },
      { key: "ref2", label: "Ref 2", color: "#00FFA3" },
      { key: "ref3", label: "Ref 3", color: "#00E6E6" },
    ],
    []
  );

  const cards = useMemo(() => {
    return LEVELS.map((lvl) => ({
      ...lvl,
      percent: percents[lvl.key as keyof typeof percents],
      value: balances[lvl.key as keyof typeof balances] ?? 0,
    }));
  }, [balances, percents, LEVELS]);

  /* ------------------------------------------------------------
     RENDER
  ------------------------------------------------------------ */
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
      {cards.map((lvl) => (
        <div
          key={lvl.key}
          className="
            rounded-2xl border border-white/10 bg-[#0b0c0f]/70 
            p-4 sm:p-6 backdrop-blur-sm
            transition-all duration-300 
            hover:border-[#14F195]/30 hover:shadow-[0_0_15px_#14F19540]
          "
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs sm:text-sm text-white/60">{lvl.label}</div>
            <div className="text-xs text-white/40">{lvl.percent}%</div>
          </div>

          {/* Value */}
          <div
            className="text-xl sm:text-2xl font-semibold"
            style={{
              color: lvl.color,
              opacity: loading ? 0.35 : 1,
              textShadow: `0 0 8px ${lvl.color}66`,
            }}
          >
            {loading ? (
              <span className="animate-pulse">…</span>
            ) : (
              `${lvl.value.toFixed(2)} SOL`
            )}
          </div>

          <div className="mt-1 text-[11px] sm:text-xs text-white/50">
            Начисления по {lvl.label}
          </div>
        </div>
      ))}
    </div>
  );
});

export default PartnerStats;
