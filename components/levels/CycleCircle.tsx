"use client";

import React, { useMemo, useId } from "react";

type Props = {
  value: number;   // filled slots
  total: number;   // total slots (3 for X3)
  size?: number;   // px
};

/**
 * CycleCircle — мини-индикатор заполнения слотов (0–3).
 * Используется в LevelDetail и Dashboard.
 */
export default function CycleCircle({ value, total, size = 74 }: Props) {
  const gradId = useId(); // уникальный id градиента для SSR-safe
  const safeTotal = total > 0 ? total : 1;
  const progress = Math.min(1, Math.max(0, value / safeTotal));

  const radius = useMemo(() => (size - 8) / 2, [size]); // 4px stroke each side
  const circumference = useMemo(() => 2 * Math.PI * radius, [radius]);

  const offset = useMemo(
    () => circumference - circumference * progress,
    [circumference, progress]
  );

  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      {/* Background circle */}
      <svg
        width={size}
        height={size}
        className="absolute inset-0"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#1e2838"
          strokeWidth="4"
          fill="none"
        />
      </svg>

      {/* Progress circle */}
      <svg
        width={size}
        height={size}
        className="absolute inset-0"
      >
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#14F195" />
            <stop offset="100%" stopColor="#00FFA3" />
          </linearGradient>
        </defs>

        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={`url(#${gradId})`}
          strokeWidth="4"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{
            transition: "stroke-dashoffset 0.45s ease",
            filter: "drop-shadow(0 0 6px rgba(20,241,149,0.45))",
          }}
        />
      </svg>

      {/* Progress % */}
      <div className="text-xs font-semibold text-white/80 select-none">
        {Math.round(progress * 100)}%
      </div>
    </div>
  );
}
