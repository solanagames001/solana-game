// components/dashboard/PayoutBreakdown.tsx
"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useConnection } from "@solana/wallet-adapter-react";
import { useTranslations } from "next-intl";

import {
  fetchConfigV3Nullable,
  priceLamportsForLevel,
  lamportsToSol,
  type ConfigV3Account,
  toast,
} from "@/lib/sdk";

/* ------------------------------------------------------------
   LOCAL TYPES
------------------------------------------------------------ */

type Dist = {
  owner: number;
  ref1: number;
  ref2: number;
  ref3: number;
  treasury: number;
};

/* ------------------------------------------------------------
   MAIN COMPONENT
------------------------------------------------------------ */

export default function PayoutBreakdown({ levelId }: { levelId: number }) {
  const { connection } = useConnection();
  const t = useTranslations('toast');

  /* Default distribution (fallback if ConfigV3 is missing) */
  const [dist, setDist] = useState<Dist>({
    owner: 60,
    ref1: 13,
    ref2: 8,
    ref3: 5,
    treasury: 14,
  });

  /* ------------------------------------------------------------
     Load ConfigV3 (on-chain)
  ------------------------------------------------------------ */

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const cfg = (await fetchConfigV3Nullable(
          connection
        )) as ConfigV3Account | null;
        if (!cfg || !mounted) return;

        setDist((prev) => ({
          owner:
            typeof cfg.perc_admin === "number"
              ? cfg.perc_admin
              : prev.owner,
          ref1:
            typeof cfg.perc_ref1 === "number"
              ? cfg.perc_ref1
              : prev.ref1,
          ref2:
            typeof cfg.perc_ref2 === "number"
              ? cfg.perc_ref2
              : prev.ref2,
          ref3:
            typeof cfg.perc_ref3 === "number"
              ? cfg.perc_ref3
              : prev.ref3,
          treasury:
            typeof cfg.perc_treasury === "number"
              ? cfg.perc_treasury
              : prev.treasury,
        }));
      } catch (err) {
        console.warn("[PayoutBreakdown] Failed to load ConfigV3:", err);
        toast.error(t('loadError'));
      }
    })();

    return () => {
      mounted = false;
    };
  }, [connection]);

  /* ------------------------------------------------------------
     Validate
  ------------------------------------------------------------ */

  if (!Number.isInteger(levelId) || levelId < 1 || levelId > 16) {
    return null;
  }

  /* ------------------------------------------------------------
     Price (from SDK FIXED prices)
  ------------------------------------------------------------ */

  let priceSol = 0;

  try {
    const lamports = priceLamportsForLevel(levelId); // bigint
    priceSol = lamportsToSol(lamports); // number (SOL)
  } catch (e) {
    console.warn("[PayoutBreakdown] invalid levelId:", levelId, e);
    return null;
  }

  /* ------------------------------------------------------------
     Compute payouts
  ------------------------------------------------------------ */

  const payouts = useMemo(() => {
    const round = (n: number) => +n.toFixed(6);

    return {
      owner: round((priceSol * dist.owner) / 100),
      ref1: round((priceSol * dist.ref1) / 100),
      ref2: round((priceSol * dist.ref2) / 100),
      ref3: round((priceSol * dist.ref3) / 100),
      treasury: round((priceSol * dist.treasury) / 100),
    };
  }, [priceSol, dist]);

  const ROLE_LABEL: Record<keyof Dist, string> = {
    owner: "Owner",
    ref1: "Ref 1",
    ref2: "Ref 2",
    ref3: "Ref 3",
    treasury: "Treasury",
  };

  /* ------------------------------------------------------------
     UI
  ------------------------------------------------------------ */

  return (
    <div className="rounded-2xl border border-white/10 bg-[#0b0c0f]/70 p-5 backdrop-blur-sm shadow-[0_0_16px_rgba(20,241,149,0.10)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-semibold text-lg">
          Level L{String(levelId).padStart(2, "0")}
        </h3>
        <div className="text-[#14F195] font-bold text-lg">
          {priceSol.toFixed(3)} SOL
        </div>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-3 text-xs font-medium text-gray-400 border-b border-white/10 pb-1 mb-2">
        <span>Роль</span>
        <span className="text-right">% доля</span>
        <span className="text-right">Сумма (SOL)</span>
      </div>

      {/* Rows */}
      {(Object.keys(payouts) as Array<keyof typeof payouts>).map((key) => (
        <div
          key={key}
          className="grid grid-cols-3 py-1.5 border-b border-white/5 last:border-none"
        >
          <span className="text-gray-300">{ROLE_LABEL[key]}</span>
          <span className="text-right text-gray-400">
            {dist[key].toFixed(2)}%
          </span>
          <span className="text-right text-[#14F195] font-semibold">
            {payouts[key].toFixed(3)}
          </span>
        </div>
      ))}

      {/* Total */}
      <div className="flex justify-end mt-4 text-gray-400 text-xs">
        Всего: {priceSol.toFixed(3)} SOL
      </div>
    </div>
  );
}
