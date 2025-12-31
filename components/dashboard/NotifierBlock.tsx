"use client";

import React from "react";

type NotifierProps = {
  title: string;
  message?: string;
  children?: React.ReactNode;
  status?: "info" | "success" | "warning" | "error";
};

/* ============================================================
   Unified Solana Game Neon Styles (v3.10)
   — согласовано с LevelCard, TxOverlay, KpiCard
============================================================ */

const STATUS_STYLES = {
  info:
    "border-white/20 bg-white/5 hover:border-white/40 hover:shadow-[0_0_15px_rgba(255,255,255,0.25)]",
  success:
    "border-[#14F195]/40 bg-[#14F195]/10 hover:border-[#14F195]/60 hover:shadow-[0_0_18px_rgba(20,241,149,0.45)]",
  warning:
    "border-[#EAB308]/40 bg-[#EAB308]/10 hover:border-[#EAB308]/60 hover:shadow-[0_0_15px_rgba(234,179,8,0.45)]",
  error:
    "border-[#EF4444]/40 bg-[#EF4444]/10 hover:border-[#EF4444]/60 hover:shadow-[0_0_15px_rgba(239,68,68,0.45)]",
} as const;

const TITLE_COLOR = {
  info: "white",
  success: "#14F195",
  warning: "#EAB308",
  error: "#EF4444",
} as const;

/* ============================================================
   NotifierBlock — FINAL v3.10
============================================================ */

const NotifierBlock = React.memo(function NotifierBlock({
  title,
  message,
  children,
  status = "info",
}: NotifierProps) {
  return (
    <div
      aria-live="polite"
      className={[
        "rounded-2xl p-4 md:p-5 backdrop-blur-sm",
        "transition-all duration-300 select-none border",
        STATUS_STYLES[status],
      ].join(" ")}
    >
      {/* Title */}
      <div
        className="text-sm font-semibold mb-1 tracking-wide"
        style={{ color: TITLE_COLOR[status] }}
      >
        {title}
      </div>

      {/* Message */}
      {message && (
        <div className="text-sm text-white/80 leading-relaxed break-words">
          {message}
        </div>
      )}

      {/* Custom children */}
      {children}
    </div>
  );
});

export default NotifierBlock;
