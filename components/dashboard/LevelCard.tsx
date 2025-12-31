/* eslint-disable react/display-name */
"use client";

import { memo, type MouseEvent, type KeyboardEvent } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/sdk/utils";

/* TYPES */

export type LevelStatus = "ACTIVE" | "AVAILABLE";

export type Level = {
  id: number;
  code: string;
  priceSol: number;
  status: LevelStatus;
  cycles: number;
};

export type CardProps = {
  level: Level;
  isActive: boolean;
  isNext: boolean;
  busyActivate: boolean;       // deprecated, kept for compatibility
  isActivating?: boolean;      // this card is being activated
  disabled?: boolean;          // button is disabled (other tx pending)
  onActivate: (id: number) => void;
};

/* BADGES */

function StatusBadge({
  isActive,
  isNext,
}: {
  isActive: boolean;
  isNext: boolean;
}) {
  const base =
    "inline-flex items-center rounded-md px-2 sm:px-2.5 py-0.5 sm:py-1 text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider transition";

  if (isActive) {
    return (
      <span
        className={cn(
          base,
          "text-black bg-[#14F195]",
          "shadow-[0_0_12px_rgba(20,241,149,0.6)]"
        )}
      >
        ACTIVE
      </span>
    );
  }

  if (isNext) {
    return (
      <span
        className={cn(
          base,
          "text-[#14F195] bg-[#14F195]/10",
          "shadow-[0_0_8px_rgba(20,241,149,0.3)]"
        )}
      >
        NEXT
      </span>
    );
  }

  return (
    <span className={cn(base, "text-white/40 bg-white/5")}>
      LEVEL
    </span>
  );
}

/* CARD */

function LevelCardImpl({
  level,
  isNext,
  isActive,
  busyActivate,
  isActivating,
  disabled,
  onActivate,
}: CardProps) {
  const t = useTranslations('levelCard');
  const router = useRouter();

  // Use new props if provided, fallback to busyActivate for compatibility
  const cardIsActivating = isActivating ?? busyActivate;
  const buttonDisabled = disabled ?? busyActivate;

  const goDetails = () => {
    if (cardIsActivating) return;
    router.push(`/levels/${level.id}`);
  };

  const cardClick = (e: MouseEvent<HTMLDivElement>) => {
    if (cardIsActivating) return;
    if ((e.target as HTMLElement).closest("button, a")) return;
    goDetails();
  };

  const keyCard = (e: KeyboardEvent<HTMLDivElement>) => {
    if (cardIsActivating) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      goDetails();
    }
  };

  const glowClass = isActive
    ? "shadow-[0_0_20px_rgba(20,241,149,0.4)]"
    : isNext
    ? "shadow-[0_0_12px_rgba(20,241,149,0.2)]"
    : "hover:shadow-[0_0_12px_rgba(20,241,149,0.15)]";

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={cardClick}
      onKeyDown={keyCard}
      aria-disabled={cardIsActivating}
      className={cn(
        "relative rounded-2xl p-3 sm:p-4 cursor-pointer transition-all duration-200 bg-[#111113]",
        cardIsActivating && "opacity-70 cursor-not-allowed",
        glowClass
      )}
    >
      {/* HEADER */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-[9px] sm:text-[10px] uppercase tracking-wider text-white/40">{t('level')}</div>
          <div className="text-lg sm:text-xl md:text-2xl font-semibold text-white mt-0.5">
            {level.code}
          </div>
        </div>

        <StatusBadge isActive={isActive} isNext={isNext} />
      </div>

      {/* PRICE & CYCLES */}
      <div className="mt-3 sm:mt-4 grid grid-cols-2 gap-1.5 sm:gap-2">
        <div className="rounded-xl bg-[#0d0d0f] p-2 sm:p-3">
          <div className="text-[9px] sm:text-[10px] uppercase tracking-wider text-white/40">{t('price')}</div>
          <div className="mt-0.5 sm:mt-1 font-mono text-xs sm:text-sm text-[#14F195]">
            {level.priceSol.toFixed(3)} SOL
          </div>
        </div>

        <div className="rounded-xl bg-[#0d0d0f] p-2 sm:p-3">
          <div className="text-[9px] sm:text-[10px] uppercase tracking-wider text-white/40">{t('cycles')}</div>
          <div className="mt-0.5 sm:mt-1 font-mono text-xs sm:text-sm text-white">{level.cycles}</div>
        </div>
      </div>

      {/* ACTIONS */}
      <div className="mt-3 sm:mt-4 flex flex-wrap gap-1.5 sm:gap-2 items-center">
        {!isActive && (
          <button
            disabled={buttonDisabled}
            onClick={(e) => {
              e.stopPropagation();
              if (buttonDisabled) return;
              onActivate(level.id);
            }}
            className={cn(
              "rounded-lg px-2.5 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-xs font-semibold",
              "bg-[#14F195] text-black",
              "hover:bg-[#12d986]",
              "transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
              "flex items-center gap-1.5 sm:gap-2"
            )}
          >
            {cardIsActivating && (
              <div className="w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-full border-2 border-black border-t-transparent animate-spin flex-shrink-0" />
            )}
            <span>{cardIsActivating ? t('activating') : t('activate')}</span>
          </button>
        )}

        <Link
          href={`/levels/${level.id}`}
          onClick={(e) => e.stopPropagation()}
          className={cn(
            "rounded-lg bg-[#1a1a1c] px-2.5 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-xs text-white/60",
            "hover:bg-[#222224] hover:text-white/90 transition-colors"
          )}
        >
          {t('details')}
        </Link>
      </div>

      {/* LOGO - keep original glow effect */}
      {isActive && (
        <img
          src="/logof.png"
          alt=""
          className="pointer-events-none absolute bottom-2 sm:bottom-3 right-2 sm:right-3 h-7 w-7 sm:h-9 sm:w-9 opacity-90 
                     drop-shadow-[0_0_10px_#14F19580]"
        />
      )}
    </div>
  );
}

/* MEMO */

function areEqual(p: CardProps, n: CardProps) {
  return (
    p.isActive === n.isActive &&
    p.isNext === n.isNext &&
    p.busyActivate === n.busyActivate &&
    p.isActivating === n.isActivating &&
    p.disabled === n.disabled &&
    p.level.id === n.level.id &&
    p.level.cycles === n.level.cycles &&
    p.level.priceSol === n.level.priceSol
  );
}

export const LevelCard = memo(LevelCardImpl, areEqual);
export default LevelCard;
