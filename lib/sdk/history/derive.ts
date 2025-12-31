// lib/sdk/history/derive.ts
// ------------------------------------------------------------
// Synthetic CYCLE_CLOSE generator (v3.10, CLEAN SDK edition)
// ------------------------------------------------------------
// • Synthetic = UI helper only
// • Строго X3 (3 ACTIVATE после последнего реального closure)
// • Никогда не дублирует реальные RECYCLE / CYCLE_CLOSE
// • Не предсказывает будущее
// ------------------------------------------------------------

import type { TxEvent, TxKind } from "./types";
import { isTxEvent } from "./helpers";

/**
 * Реальные события, которые ЗАКРЫВАЮТ цикл.
 */
const REAL_CLOSURE_KINDS: ReadonlySet<TxKind> = new Set([
  "RECYCLE",
  "RECYCLE_OPEN",
  "CYCLE_CLOSE",
]);

const CYCLE_SIZE = 3;

export function withSyntheticClosures(events: TxEvent[]): TxEvent[] {
  if (!Array.isArray(events) || events.length === 0) return [];

  /* ------------------------------------------------------------
     1. Dedup + validation
  ------------------------------------------------------------ */
  const seen = new Set<string>();
  const unique: TxEvent[] = [];

  for (const ev of events) {
    if (!isTxEvent(ev)) continue;

    const key = ev.id || ev.sig;
    if (!key || seen.has(key)) continue;

    seen.add(key);
    unique.push(ev);
  }

  if (unique.length === 0) return [];

  /* ------------------------------------------------------------
     2. Group by level
  ------------------------------------------------------------ */
  const byLevel = new Map<number, TxEvent[]>();

  for (const ev of unique) {
    const arr = byLevel.get(ev.levelId);
    if (arr) arr.push(ev);
    else byLevel.set(ev.levelId, [ev]);
  }

  /* ------------------------------------------------------------
     3. Generate synthetic closures (X3 windowed)
  ------------------------------------------------------------ */
  const synthetic: TxEvent[] = [];

  for (const [levelId, list] of byLevel) {
    const sorted = list.slice().sort((a, b) => a.ts - b.ts);

    let activates: TxEvent[] = [];

    for (let i = 0; i < sorted.length; i++) {
      const ev = sorted[i];

      if (ev.kind === "ACTIVATE") {
        activates.push(ev);

        if (activates.length === CYCLE_SIZE) {
          const next = sorted[i + 1];

          // если сразу после 3 ACTIVATE нет реального closure — добавляем synthetic
          if (!next || !REAL_CLOSURE_KINDS.has(next.kind)) {
            const last = activates[activates.length - 1];

            synthetic.push({
              id: `synthetic-close-${levelId}-${last.ts}`,
              sig: `synthetic-close-${levelId}-${last.ts}`,
              levelId,
              kind: "CYCLE_CLOSE",
              slot: null,
              ts: last.ts + 1,
              synthetic: true,
            });
          }

          // окно закрывается всегда
          activates = [];
        }
      } else if (REAL_CLOSURE_KINDS.has(ev.kind)) {
        // реальное закрытие всегда сбрасывает окно
        activates = [];
      }
    }
  }

  /* ------------------------------------------------------------
     4. Generate synthetic REFERRAL_ACTIVATION events
     Когда получаем реферальный бонус, это означает что кто-то активировал уровень
  ------------------------------------------------------------ */
  const referralBonusKinds: ReadonlySet<TxKind> = new Set([
    "REF_T1_13",
    "REF_T2_8",
    "REF_T3_5",
  ]);

  const referralActivations: TxEvent[] = [];
  const seenReferralActivations = new Set<string>();

  for (const ev of unique) {
    if (referralBonusKinds.has(ev.kind)) {
      // Создаем синтетическое событие о том, что кто-то активировал уровень
      const activationId = `ref-activation-${ev.levelId}-${ev.sig}`;
      
      if (!seenReferralActivations.has(activationId)) {
        seenReferralActivations.add(activationId);
        
        referralActivations.push({
          id: activationId,
          sig: ev.sig, // Используем ту же сигнатуру что и бонус
          levelId: ev.levelId,
          kind: "REFERRAL_ACTIVATION",
          slot: null,
          ts: ev.ts - 1, // Немного раньше бонуса, чтобы показывалось перед ним
          synthetic: true,
        });
      }
    }
  }

  /* ------------------------------------------------------------
     5. Merge & sort (DESC)
  ------------------------------------------------------------ */
  const result = [...unique, ...synthetic, ...referralActivations].sort(
    (a, b) => b.ts - a.ts
  );

  if (process.env.NODE_ENV !== "production") {
    console.debug(
      `[SDK/HISTORY] derived ${result.length} events (${synthetic.length} synthetic closures, ${referralActivations.length} referral activations)`
    );
  }

  return result;
}
