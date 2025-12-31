"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { cn } from "@/lib/sdk/utils";

type Accent = "green" | "cyan";

interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  accent?: Accent;
}

/* -------------------------------------------------------------------------- */
/*                                   CONFIG                                   */
/* -------------------------------------------------------------------------- */

const ACCENT_COLORS: Record<Accent, string> = {
  green: "#14F195",
  cyan: "#00FFA3",
};

/**
 * KPI Card — строгая минималистичная Solana-карточка.
 * - hover отключён на touch-устройствах
 * - мягкая анимация
 * - зелёный/циановый glow
 */
export default function KpiCard({
  title,
  value,
  subtitle,
  accent = "green",
}: KpiCardProps) {
  const accentColor = ACCENT_COLORS[accent];

  const [isTouch, setIsTouch] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const touch =
      window.matchMedia("(hover: none)").matches ||
      "ontouchstart" in window;
    setIsTouch(touch);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={
        !isTouch
          ? {
              scale: 1.02,
              borderColor: `${accentColor}60`,
              boxShadow: `0 0 18px ${accentColor}50`,
            }
          : {}
      }
      transition={{ duration: 0.25, ease: "easeOut" }}
      className={cn(
        "rounded-2xl border border-white/10 bg-[#0b0c0f]/70",
        "backdrop-blur-sm p-4 sm:p-6",
        "transition-colors"
      )}
      aria-label={`${title}: ${value}`}
      tabIndex={0}
    >
      {/* Title */}
      <div className="text-xs sm:text-sm text-white/60">{title}</div>

      {/* Value */}
      <div
        className="mt-1 sm:mt-2 text-xl sm:text-2xl font-semibold text-white truncate"
        style={{
          textShadow: `0 0 6px ${accentColor}80, 0 0 12px ${accentColor}40`,
        }}
      >
        {value}
      </div>

      {/* Subtitle */}
      {subtitle && (
        <div className="mt-0.5 sm:mt-1 text-[11px] sm:text-xs text-white/50 truncate">
          {subtitle}
        </div>
      )}
    </motion.div>
  );
}
