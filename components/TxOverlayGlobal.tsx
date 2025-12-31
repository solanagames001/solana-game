"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

/* ============================================================================
   Фирменный вращающийся бейдж c логотипом (compact version)
   ============================================================================
*/
function RotatingBadge() {
  const size = 120;
  const r = 45;
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
            id="badge-circle-global"
            d={`M ${cx} ${cy} m -${r},0 a ${r},${r} 0 1,1 ${r * 2},0 a ${r},${r} 0 1,1 -${r * 2},0`}
          />
        </defs>

        {/* внешнее кольцо */}
        <circle
          cx={cx}
          cy={cy}
          r={r + 8}
          strokeWidth="1"
          className="fill-transparent stroke-[#14F195]/30"
        />

        {/* текст */}
        <text
          className="uppercase tracking-[0.25em] text-[5px] fill-[#14F195]"
          style={{ fontFamily: "Montserrat, sans-serif" }}
        >
          <textPath href="#badge-circle-global" startOffset="0%">
            SOLANA • X3 • BLOCKCHAIN • PROCESSING •
          </textPath>
        </text>

        {/* внутреннее кольцо */}
        <circle
          cx={cx}
          cy={cy}
          r={22}
          strokeWidth="1"
          className="fill-black stroke-white/20"
        />
      </svg>

      {/* логотип */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <Image
          src="/logof.png"
          alt="Logo"
          width={36}
          height={36}
          className="object-contain opacity-95"
        />
      </div>

      <style jsx global>{`
        .animate-spin-slow {
          animation: spin 20s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

/* ============================================================================
   TxOverlayGlobal — unified design with RotatingBadge
   ============================================================================
 */
export default function TxOverlayGlobal({
  show = false,
  label = "Processing transaction…",
}: {
  show?: boolean;
  label?: string;
}) {
  const [mounted, setMounted] = useState(show);

  // Синхронизируем состояние с Topbar (busy indicator)
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.dispatchEvent(
      new CustomEvent("dashboard:tx-busy", { detail: { busy: show } })
    );
  }, [show]);

  // Управляем размонтированием (анимация исчезновения)
  useEffect(() => {
    if (show) {
      setMounted(true);
    } else {
      const timeout = setTimeout(() => setMounted(false), 400);
      return () => clearTimeout(timeout);
    }
  }, [show]);

  if (!mounted) return null;

  return (
    <div
      aria-hidden={!show}
      role="alert"
      aria-busy={show}
      className={`fixed inset-0 z-[1000] flex items-center justify-center
        transition-opacity duration-400 ease-out
        ${show ? "opacity-100" : "opacity-0"}`}
      style={{
        background: show ? "rgba(0,0,0,0.55)" : "rgba(0,0,0,0)",
        backdropFilter: "blur(6px)",
      }}
    >
      <div
        className={`flex flex-col items-center gap-4 rounded-2xl border border-white/10 
          bg-[#0b0c0f]/90 px-8 py-6 shadow-[0_0_30px_rgba(20,241,149,0.25)]
          transform transition-all duration-400 ease-out
          ${show ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-95 translate-y-1"}`}
      >
        {/* Фирменный бейдж */}
        <RotatingBadge />

        {/* Текст */}
        <div className="text-sm text-white/90">{label}</div>
      </div>
    </div>
  );
}
