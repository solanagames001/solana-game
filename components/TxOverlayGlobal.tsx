"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { txLoading } from "@/lib/sdk/tx-loading";

/* ============================================================================
   Фирменный вращающийся бейдж c логотипом (compact version)
   ============================================================================
*/
function RotatingBadge({ badgeText }: { badgeText: string }) {
  const size = 120;
  const r = 45; // Уменьшен радиус для более компактного круга
  const cx = size / 2;
  const cy = size / 2;
  
  // Растягиваем текст по всему кругу - добавляем больше пробелов между словами
  // Длина окружности: 2 * π * r ≈ 2 * 3.14 * 45 ≈ 283 единицы
  // Нужно равномерно распределить текст по всей окружности
  const expandedText = badgeText.split(' • ').join(' • • • • • ');

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

        {/* текст - растянут по всему кругу */}
        <text
          className="uppercase fill-[#14F195]"
          style={{ 
            fontFamily: "Montserrat, sans-serif",
            fontSize: "6px",
            letterSpacing: "0.5em"
          }}
        >
          <textPath 
            href="#badge-circle-global" 
            startOffset="0%"
            textLength={2 * Math.PI * r * 0.95} // 95% от длины окружности
            lengthAdjust="spacingAndGlyphs"
          >
            {expandedText}
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

/**
 * Парсит текст и переводит его, если это известный паттерн
 */
function translateLabel(label: string, t: ReturnType<typeof useTranslations<"overlay">>): string {
  // Паттерны для активации уровней
  const activatingMatch = label.match(/Activating level (\d+)\.\.\./);
  if (activatingMatch) {
    return t("activatingLevel", { level: activatingMatch[1] });
  }

  const buildingMatch = label.match(/Building transaction for level (\d+)\.\.\./);
  if (buildingMatch) {
    return t("buildingTransaction", { level: buildingMatch[1] });
  }

  const sendingMatch = label.match(/Sending transaction for level (\d+)\.\.\./);
  if (sendingMatch) {
    return t("sendingTransaction", { level: sendingMatch[1] });
  }

  const confirmingMatch = label.match(/Confirming transaction for level (\d+)\.\.\./);
  if (confirmingMatch) {
    return t("confirmingTransaction", { level: confirmingMatch[1] });
  }

  // Паттерны для регистрации
  if (label === "Registering player...") {
    return t("registeringPlayer");
  }

  if (label === "Checking balance...") {
    return t("checkingBalance");
  }

  if (label === "Creating player profile...") {
    return t("creatingProfile");
  }

  if (label === "Sending registration transaction...") {
    return t("sendingRegistration");
  }

  if (label === "Confirming registration...") {
    return t("confirmingRegistration");
  }

  // Дефолтный текст
  if (label === "Processing transaction…" || label === "Processing transaction...") {
    return t("processing");
  }

  // Если паттерн не найден, возвращаем исходный текст
  return label;
}

/* ============================================================================
   TxOverlayGlobal — unified design with RotatingBadge
   Uses global txLoading state manager
   ============================================================================
 */
export default function TxOverlayGlobal() {
  const t = useTranslations("overlay");
  const [loadingState, setLoadingState] = useState(() => txLoading.getState());
  const [mounted, setMounted] = useState(loadingState.isLoading);

  // Subscribe to global loading state
  useEffect(() => {
    const unsubscribe = txLoading.subscribe((state) => {
      setLoadingState(state);
      if (state.isLoading) {
        setMounted(true);
      }
    });
    return unsubscribe;
  }, []);

  // Синхронизируем состояние с Topbar (busy indicator)
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.dispatchEvent(
      new CustomEvent("dashboard:tx-busy", { detail: { busy: loadingState.isLoading } })
    );
  }, [loadingState.isLoading]);

  // Управляем размонтированием (анимация исчезновения)
  useEffect(() => {
    if (loadingState.isLoading) {
      setMounted(true);
    } else {
      const timeout = setTimeout(() => setMounted(false), 400);
      return () => clearTimeout(timeout);
    }
  }, [loadingState.isLoading]);

  if (!mounted) return null;

  // Получаем текст на круге из переводов
  const badgeText = t("badgeText");
  // Переводим текст статуса
  const translatedLabel = translateLabel(loadingState.label, t);

  return (
    <div
      aria-hidden={!loadingState.isLoading}
      role="alert"
      aria-busy={loadingState.isLoading}
      className={`fixed inset-0 z-[1000] flex items-center justify-center
        transition-opacity duration-400 ease-out pointer-events-none
        ${loadingState.isLoading ? "opacity-100" : "opacity-0"}`}
      style={{
        background: loadingState.isLoading ? "rgba(0,0,0,0.75)" : "rgba(0,0,0,0)",
        backdropFilter: "blur(8px)",
      }}
    >
      <div
        className={`flex flex-col items-center gap-4 rounded-2xl border border-white/10 
          bg-[#0b0c0f]/95 px-8 py-6 shadow-[0_0_30px_rgba(20,241,149,0.25)]
          transform transition-all duration-400 ease-out pointer-events-auto
          ${loadingState.isLoading ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-95 translate-y-1"}`}
      >
        {/* Фирменный бейдж */}
        <RotatingBadge badgeText={badgeText} />

        {/* Текст - переведённый */}
        <div className="text-sm text-white/90 font-medium">{translatedLabel}</div>
      </div>
    </div>
  );
}
