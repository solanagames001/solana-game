// lib/sdk/history/types.ts
// ------------------------------------------------------------
// Solana Game SDK v3.10 — History Event Types (CLEAN FINAL)
// ------------------------------------------------------------

/**
 * Типы событий истории.
 * Строго соответствует модели выплат v3.10.
 */
export type TxKind =
  | "ACTIVATE"         // Вход в очередь
  | "RECYCLE"          // Закрытие цикла → авто-рецикл
  | "RECYCLE_OPEN"     // Открытие нового цикла
  | "CYCLE_CLOSE"      // Synthetic: финал цикла

  // Выплаты игрокам
  | "REWARD_60"        // Owner payout (60%)
  | "REF_T1_13"        // Referral line 1 (13%)
  | "REF_T2_8"         // Referral line 2 (8%)
  | "REF_T3_5"         // Referral line 3 (5%)

  // Referral activations (synthetic)
  | "REFERRAL_ACTIVATION"  // Synthetic: кто-то из реферальной сети активировал уровень
  | "REFERRAL_REGISTERED"  // Synthetic: новый реферал зарегистрировался (стал upline1)

  // Treasury / Admin
  | "TREASURY_14";     // Treasury payout (14%)

/**
 * Унифицированное событие истории.
 *
 * Контракт:
 * - `id`        — уникальный идентификатор события (sig или synthetic id)
 * - `sig`       — транзакция (реальная или "pending-*")
 * - `levelId`   — номер уровня (1..16)
 * - `kind`      — тип события (TxKind)
 * - `slot`      — номер слота (если применимо), иначе null
 * - `ts`        — timestamp в миллисекундах (Date.now())
 * - `synthetic` — true, если событие вычислено клиентом
 */
export interface TxEvent {
  id: string;
  sig: string;
  levelId: number;
  kind: TxKind;
  slot: number | null;
  ts: number;          // milliseconds
  synthetic?: boolean;
}
