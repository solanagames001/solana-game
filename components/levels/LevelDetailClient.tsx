"use client";

import { useCallback, useMemo } from "react";
import { useConnection } from "@solana/wallet-adapter-react";
import { useTranslations } from "next-intl";
import { toast } from "@/lib/sdk/toast";

import { usePlayer } from "@/lib/sdk/hooks/usePlayer";
import { priceLamportsForLevel, lamportsToSol } from "@/lib/sdk/prices";

import LevelDetailCard from "@/components/dashboard/LevelDetailCard";
import NotifierBlock from "@/components/dashboard/NotifierBlock";

type Props = {
  levelId: number;
};

/* ============================================================
   LevelDetailClient (v3.10 CLEAN)
   • Не считает matrix
   • Не хранит фейковые slots/cycles
   • Согласован с LevelMatrix
============================================================ */

export default function LevelDetailClient({ levelId }: Props) {
  const { connection } = useConnection();
  const t = useTranslations('toast');

  const {
    playerExists,
    activeLevels,
    checkingPlayer,
    note,
    refreshPlayer,
    register,
    activate,
    busyRegister,
    busyActivate,
  } = usePlayer();

  /* ---------------- PRICE (SOL) ---------------- */
  const priceSol = useMemo(() => {
    const lamports = priceLamportsForLevel(levelId);
    return lamportsToSol(lamports);
  }, [levelId]);

  /* ---------------- ACTIVE? ---------------- */
  const isActive = useMemo(() => {
    if (!playerExists) return false;
    if (!activeLevels) return false;
    return activeLevels.has(levelId);
  }, [playerExists, activeLevels, levelId]);

  /* ---------------- STATUS LABEL ---------------- */
  const tLevelCard = useTranslations('levelCard');
  const statusLabel = useMemo(() => {
    if (checkingPlayer) return tLevelCard('checking');
    if (playerExists === false) return tLevelCard('notRegistered');
    if (isActive) return tLevelCard('activated');
    return tLevelCard('notActivated');
  }, [checkingPlayer, playerExists, isActive, tLevelCard]);

  /* ---------------- HELP MESSAGE ---------------- */
  const helpMessage = useMemo(() => {
    if (note) {
      // Переводим статусы активации
      if (note.startsWith('ACTIVATION_FINALIZED:')) {
        return `${t('activationFinalized')} · ${note.replace('ACTIVATION_FINALIZED:', '')}`;
      }
      if (note.startsWith('ACTIVATING_LEVEL:')) {
        return t('activatingLevel', { level: note.replace('ACTIVATING_LEVEL:', '') });
      }
      if (note.startsWith('Registration finalized')) {
        return `${t('registrationFinalized')} · ${note.replace('Registration finalized · ', '')}`;
      }
      return note;
    }
    if (checkingPlayer) return t('checkingPlayerState');
    if (playerExists === false) return t('playerNotFound');
    if (isActive) return t('levelAlreadyActivated');
    return t('pressActivate');
  }, [note, checkingPlayer, playerExists, isActive, t]);

  /* ---------------- REGISTER ---------------- */
  const handleRegister = useCallback(() => {
    if (busyRegister || checkingPlayer) return;
    register();
  }, [busyRegister, checkingPlayer, register]);

  /* ---------------- ACTIVATE ---------------- */
  const handleActivate = useCallback(async () => {
    if (busyActivate || checkingPlayer) return;

    const sig = await activate(levelId);
    if (!sig) return;

    toast.success(t('activationSent'));
    refreshPlayer();
  }, [busyActivate, checkingPlayer, activate, levelId, refreshPlayer, t]);

  /* ============================================================
     RENDER
  ============================================================ */

  return (
    <div className="space-y-6">
      {/* STATUS */}
      <NotifierBlock title="Status" message={helpMessage} />

      {/* MAIN CARD */}
      <LevelDetailCard
        levelId={levelId}
        priceSol={priceSol}
        statusLabel={statusLabel}

        /* matrix-derived values intentionally omitted */
        slotsFilled={undefined}
        slotsTotal={3}
        cyclesCompleted={undefined}

        playerExists={playerExists}
        checkingPlayer={checkingPlayer}
        activeLevels={activeLevels}
      />

      {/* ACTIONS */}
      <div className="flex flex-wrap gap-2 mt-2">

        {/* REGISTER */}
        {playerExists === false && (
          <button
            onClick={handleRegister}
            disabled={busyRegister || checkingPlayer}
            className="px-4 py-2 rounded-full border border-white/15 bg-white/5
                       text-white/80 text-sm transition
                       hover:border-[#14F195]/40 hover:text-[#14F195]
                       disabled:opacity-50 disabled:cursor-not-allowed
                       flex items-center justify-center gap-2"
          >
            {busyRegister && (
              <div className="w-3.5 h-3.5 rounded-full border-2 border-white/60 border-t-transparent animate-spin flex-shrink-0" />
            )}
            <span>{busyRegister ? "Registering…" : "Register"}</span>
          </button>
        )}

        {/* ACTIVATE */}
        {playerExists && !isActive && (
          <button
            onClick={handleActivate}
            disabled={busyActivate || checkingPlayer}
            className="px-4 py-2 rounded-full border border-[#14F195]/40 bg-[#14F195]/10
                       text-white/90 text-sm transition
                       hover:bg-[#14F195]/20 hover:shadow-[0_0_10px_#14F19550]
                       disabled:opacity-50 disabled:cursor-not-allowed
                       flex items-center justify-center gap-2"
          >
            {busyActivate && (
              <div className="w-3.5 h-3.5 rounded-full border-2 border-[#14F195] border-t-transparent animate-spin flex-shrink-0" />
            )}
            <span>{busyActivate ? "Activating…" : `Activate (${priceSol} SOL)`}</span>
          </button>
        )}

        {/* ACTIVE LABEL */}
        {playerExists && isActive && (
          <span className="px-3 py-2 text-sm text-white/70">
            Level activated.
          </span>
        )}
      </div>
    </div>
  );
}
