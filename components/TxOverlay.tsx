"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

/* ============================================================================
   🔥 Фирменный вращающийся бейдж c логотипом
   ============================================================================
*/
function RotatingBadge() {
  const size = 160;  // 🔥 уменьшили с 200 → 160
  const r = 60;      // радиус текста уменьшен
  const cx = size / 2;
  const cy = size / 2;

  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="animate-spin-slow drop-shadow-[0_0_10px_rgba(20,241,149,0.35)]"
        style={{ transformOrigin: "center" }}
      >
        <defs>
          <path
            id="badge-circle"
            d={`M ${cx} ${cy} m -${r},0 a ${r},${r} 0 1,1 ${r * 2},0 a ${r},${r} 0 1,1 -${r * 2},0`}
          />
        </defs>

        {/* внешнее кольцо */}
        <circle
          cx={cx}
          cy={cy}
          r={r + 10}
          strokeWidth="1"
          className="fill-transparent stroke-[#14F195]/30"
        />

        {/* текст */}
        <text
          className="uppercase tracking-[0.28em] text-[6px] fill-[#14F195]"
          style={{ fontFamily: "Montserrat, sans-serif" }}
        >
          <textPath href="#badge-circle" startOffset="0%">
            SOLANA • MATRIX • X3 • SMART • BLOCKCHAIN • FAST • SOLANA • EXPRESS •
          </textPath>
        </text>

        {/* внутреннее кольцо */}
        <circle
          cx={cx}
          cy={cy}
          r={28}
          strokeWidth="1"
          className="fill-black stroke-white/20"
        />
      </svg>

      {/* логотип */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <Image
          src="/logof.png"
          alt="Logo"
          width={48}       // 🔥 уменьшили 55 → 48
          height={48}
          className="object-contain opacity-95"
        />
      </div>
    </div>
  );
}

/* ============================================================================
   🔥 TxOverlay — заменили спиннер на фирменный RotatingBadge
   ============================================================================
*/
export default function TxOverlay({
  show,
  label = "Processing transaction…",
}: {
  show: boolean;
  label?: string;
}) {
  const [mounted, setMounted] = useState(show);

  // синхронизируем busy indicator
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.dispatchEvent(
      new CustomEvent("dashboard:tx-busy", { detail: { busy: show } })
    );
  }, [show]);

  // анимация размонтирования
  useEffect(() => {
    if (show) {
      setMounted(true);
    } else {
      const t = setTimeout(() => setMounted(false), 400);
      return () => clearTimeout(t);
    }
  }, [show]);

  if (!mounted) return null;

  return (
    <div
      aria-hidden={!show}
      aria-busy={show}
      className={`fixed inset-0 z-[1000] flex items-center justify-center transition-opacity duration-400 
        ${show ? "opacity-100" : "opacity-0"}`}
      style={{
        background: show ? "rgba(0,0,0,0.55)" : "rgba(0,0,0,0)",
        backdropFilter: "blur(6px)",
      }}
    >
      <div
        className={`flex flex-col items-center gap-6 rounded-2xl border border-white/10 
          bg-[#0b0c0f]/90 px-10 py-8 shadow-[0_0_30px_rgba(20,241,149,0.35)]
          transition-all duration-400
          ${show ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-95 translate-y-1"}`}
      >
        {/* 🔥 НАШ БЕЙДЖ */}
        <RotatingBadge />

        {/* Текст */}
        <div className="text-base text-white/90 mt-2">{label}</div>
      </div>
    </div>
  );
}
