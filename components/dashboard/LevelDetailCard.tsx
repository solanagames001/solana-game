"use client";

import React, { useMemo } from "react";
import { useTranslations } from "next-intl";

type Props = {
  levelId: string | number;
  priceSol: number;
  statusLabel?: string;

  // matrix-derived (optional!)
  slotsFilled?: number;
  slotsTotal: number;
  cyclesCompleted?: number;

  playerExists: boolean | null;
  checkingPlayer: boolean;
  activeLevels: Set<number>;
};

/* ============================================================
   LevelDetailCard — v3.10 CLEAN
   • Не угадывает matrix
   • Честно показывает отсутствие данных
============================================================ */

export default function LevelDetailCard({
  levelId,
  priceSol,
  statusLabel,
  slotsFilled,
  slotsTotal,
  cyclesCompleted,
  playerExists,
  checkingPlayer,
  activeLevels,
}: Props) {
  const t = useTranslations('levelCard');
  const numericLevel = Number(levelId) || 0;
  const levelLabel = `L${String(numericLevel).padStart(2, "0")}`;

  /* ------------------------------------------------------------
     ACTIVE CHECK (Set from usePlayer)
  ------------------------------------------------------------ */
  const isLevelActive = useMemo(() => {
    return Boolean(playerExists) && activeLevels?.has(numericLevel);
  }, [playerExists, activeLevels, numericLevel]);

  /* ------------------------------------------------------------
     PROGRESS %
     (only if slotsFilled is known)
  ------------------------------------------------------------ */
  const progressPct = useMemo(() => {
    if (
      slotsFilled == null ||
      !slotsTotal ||
      slotsTotal <= 0
    ) {
      return null;
    }
    const filled = Math.min(slotsFilled, slotsTotal);
    return Math.round((filled / slotsTotal) * 100);
  }, [slotsFilled, slotsTotal]);

  /* ------------------------------------------------------------
     STATUS LABEL
  ------------------------------------------------------------ */
  const finalStatus = useMemo(() => {
    if (statusLabel) return statusLabel;
    if (checkingPlayer) return t('checking');
    if (playerExists === false) return t('notRegistered');
    if (isLevelActive) return t('activated');
    return t('notActivated');
  }, [statusLabel, checkingPlayer, playerExists, isLevelActive, t]);

  /* ------------------------------------------------------------
     CARD STYLE (synced with LevelCard)
  ------------------------------------------------------------ */
  const cardBorder = isLevelActive
    ? "border-white/70 shadow-[0_0_20px_rgba(255,255,255,0.75)]"
    : "border-white/10";

  const bgClass = isLevelActive
    ? "bg-[#050608]/90"
    : "bg-[#0b0c0f]/70 backdrop-blur-sm";

  return (
    <div
      className={[
        "rounded-2xl p-6 select-none border transition-all duration-300",
        cardBorder,
        bgClass,
      ].join(" ")}
    >
      {/* HEADER */}
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="text-sm text-white/60">{t('level')}</div>

          <div className="flex items-center gap-3">
            <div className="text-3xl font-semibold text-white">
              {levelLabel}
            </div>

            <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs text-white/70">
              {finalStatus}
            </span>
          </div>
        </div>

        {/* STATS */}
        <div className="grid w-full grid-cols-3 gap-3 md:w-auto">
          <Stat label={t('price')} value={priceSol.toFixed(3)} />

          <Stat
            label={t('slots')}
            value={
              slotsFilled == null
                ? "—"
                : `${slotsFilled}/${slotsTotal}`
            }
          />

          <Stat
            label={t('cycles')}
            value={
              cyclesCompleted == null
                ? "—"
                : String(cyclesCompleted)
            }
          />
        </div>
      </div>

      {/* PROGRESS BAR */}
      <div className="mb-2 h-2 w-full overflow-hidden rounded-full bg-white/10">
        {progressPct != null && (
          <div
            className="h-full bg-gradient-to-r from-[#ffffff] to-[#00FFA3]
                       shadow-[0_0_10px_rgba(255,255,255,0.7)]
                       transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        )}
      </div>

      {/* STATUS INFO */}
      {isLevelActive && (
        <div className="mt-1 text-sm text-white/80">
          {t('levelActive')}
        </div>
      )}
    </div>
  );
}

/* ============================================================
   SMALL STAT
============================================================ */

const Stat = React.memo(function Stat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/30 p-3">
      <div className="text-xs text-white/60">{label}</div>
      <div className="text-lg font-semibold text-white">{value}</div>
    </div>
  );
});
