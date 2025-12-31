// components/dashboard/LevelMatrix.tsx
// ------------------------------------------------------------
// LevelMatrix v3.10 — CLEAN, FINAL
// ------------------------------------------------------------
// • Работает с MatrixState из CLEAN SDK
// • Никаких legacy-импортов
// • Реагирует на событие "levels-state-changed"
// • Поддерживает compact и full режимы
// ------------------------------------------------------------

"use client";

import { memo, useEffect, useState, useRef } from "react";
import type { MatrixState, MatrixSlot } from "@/lib/sdk/types/matrix";

/* ------------------------------------------------------------
   SLOT ROLES (owner → ref1 → ref2)
------------------------------------------------------------ */

type SlotRole = "owner" | "ref1" | "ref2";

function slotRole(index: number): SlotRole {
  return index === 1 ? "owner" : index === 2 ? "ref1" : "ref2";
}

function roleColors(role: SlotRole): { from: string; to: string } {
  switch (role) {
    case "owner":
      return { from: "#14F195", to: "#00FFA3" };
    case "ref1":
      return { from: "#00FFA3", to: "#14F195" };
    case "ref2":
    default:
      return { from: "#00E6E6", to: "#00FFA3" };
  }
}

/* ------------------------------------------------------------
   PROPS
------------------------------------------------------------ */

type Props = {
  matrix: MatrixState;
  compact?: boolean;
  className?: string;
};

/* ------------------------------------------------------------
   COMPONENT
------------------------------------------------------------ */

function LevelMatrixImpl({ matrix, compact = false, className = "" }: Props) {
  const { cycle } = matrix;

  // Используем matrix напрямую для синхронного обновления
  // tick используется только для форсирования перерисовки при событиях
  const [tick, setTick] = useState(0);
  const prevMatrixRef = useRef<MatrixState | null>(null);

  /* ----------------------------------------------------------
     SYNCHRONIZE WITH MATRIX PROP CHANGES
     Реагируем на изменения matrix prop напрямую
  ---------------------------------------------------------- */
  useEffect(() => {
    const prev = prevMatrixRef.current;
    if (!prev) {
      prevMatrixRef.current = matrix;
      return;
    }

    // Проверяем изменения в состоянии слотов
    const slotsChanged = matrix.slots.some((slot, idx) => 
      slot.state !== prev.slots[idx]?.state
    );
    
    const cycleChanged = 
      matrix.cycle.filled !== prev.cycle.filled ||
      matrix.cycle.closed !== prev.cycle.closed ||
      matrix.cycle.index !== prev.cycle.index;

    if (slotsChanged || cycleChanged) {
      prevMatrixRef.current = matrix;
      // Форсируем перерисовку для плавной анимации
      setTick((x) => x + 1);
    } else {
      prevMatrixRef.current = matrix;
    }
  }, [matrix]);

  /* ----------------------------------------------------------
     GLOBAL REFRESH LISTENER
     Дополнительная синхронизация через события
  ---------------------------------------------------------- */
  useEffect(() => {
    const handler = (e: any) => {
      const lvlId = e?.detail?.levelId;

      // -1 = глобальное обновление, либо обновление конкретного уровня
      if (lvlId === matrix.levelId || lvlId === -1) {
        setTick((x) => x + 1);
      }
    };

    window.addEventListener("levels-state-changed", handler);
    return () => window.removeEventListener("levels-state-changed", handler);
  }, [matrix.levelId]);

  /* ----------------------------------------------------------
     VISUAL SLOTS
     Если цикл закрыт → все слоты визуально FILLED
     (slots.length всегда ожидается = 3)
  ---------------------------------------------------------- */
  const visualSlots: MatrixSlot[] = cycle.closed
    ? matrix.slots.map((s) => ({ ...s, state: "FILLED" }))
    : matrix.slots;

  const slotClasses = (
    state: "EMPTY" | "FILLED",
    isCompact: boolean
  ) => {
    const base =
      "rounded-md border transition-all duration-300 ease-out will-change-transform";
    const size = isCompact ? "h-2.5" : "h-4";

    if (state === "FILLED") {
      const pulse = cycle.closed
        ? "animate-[pulse_1.6s_ease-in-out_infinite]"
        : "";
      return `${base} ${size} ${pulse} border-transparent`;
    }

    return `${base} ${size} border-white/10 bg-white/5`;
  };

  /* ==========================================================
     COMPACT VIEW (LevelCard)
  ========================================================== */
  if (compact) {
    return (
      <div
        key={tick}
        className={`flex items-center gap-2 text-[11px] text-white/60 ${className}`}
        aria-live="polite"
      >
        <div className="grid grid-cols-3 gap-1.5 w-[78px] shrink-0">
          {visualSlots.map((s) => {
            const role = slotRole(s.index);
            const colors = roleColors(role);
            const title = `Slot ${s.index} — ${s.state} · ${role}`;

            const style =
              s.state === "FILLED"
                ? {
                    backgroundImage: `linear-gradient(90deg, ${colors.from}, ${colors.to})`,
                    boxShadow: "0 0 6px rgba(20, 241, 149, 0.45)",
                    borderColor: colors.to,
                  }
                : undefined;

            return (
              <div
                key={s.index}
                className={slotClasses(s.state, true)}
                style={style}
                title={title}
                aria-label={title}
                role="img"
              />
            );
          })}
        </div>

        <span>
          {cycle.filled}/3 {cycle.closed ? "· closed" : ""}
        </span>
      </div>
    );
  }

  /* ==========================================================
     FULL VIEW (Level page)
  ========================================================== */

  return (
    <div
      key={tick}
      className={`flex items-center gap-3 ${className}`}
      aria-live="polite"
    >
      <div className="grid grid-cols-3 gap-2 w-[120px] shrink-0">
        {visualSlots.map((s) => {
          const role = slotRole(s.index);
          const colors = roleColors(role);
          const title = `Slot ${s.index} — ${s.state} · ${role}`;

          const style =
            s.state === "FILLED"
              ? {
                  backgroundImage: `linear-gradient(90deg, ${colors.from}, ${colors.to})`,
                  boxShadow: "0 0 8px rgba(20, 241, 149, 0.55)",
                  borderColor: colors.to,
                }
              : undefined;

          return (
            <div
              key={s.index}
              className={slotClasses(s.state, false)}
              style={style}
              title={title}
              aria-label={title}
              role="img"
            />
          );
        })}
      </div>

      <div className="text-sm text-white/70">
        Cycle #{cycle.index} · {cycle.filled}/3{" "}
        {cycle.closed ? "· closed" : ""}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------
   MEMOIZATION
------------------------------------------------------------ */

function areEqual(prev: Readonly<Props>, next: Readonly<Props>): boolean {
  const A = prev.matrix;
  const B = next.matrix;

  if (
    prev.compact !== next.compact ||
    prev.className !== next.className ||
    A.levelId !== B.levelId ||
    A.cycle.index !== B.cycle.index ||
    A.cycle.filled !== B.cycle.filled ||
    A.cycle.closed !== B.cycle.closed
  ) {
    return false;
  }

  // сравниваем только состояния трёх слотов
  for (let i = 0; i < 3; i++) {
    if (A.slots[i]?.state !== B.slots[i]?.state) return false;
  }

  return true;
}

export default memo(LevelMatrixImpl, areEqual);
