// lib/sdk/activate.ts
"use client";

import { Connection, Transaction, ComputeBudgetProgram } from "@solana/web3.js";
import { toast } from "./toast";

import buildActivateLevelV3Ix from "./activate-builder";

import {
  sendTxWithPriority,
  waitForSignatureFinalized,
  type WalletLike,
} from "./tx";

import { MAX_LEVELS } from "./prices";
import { recordActivate } from "./history/record";
import { formatActivationError, parseAnchorError } from "./error-parser";

/* ------------------------------------------------------------ */
/* Compute Budget - prevent CU limit errors under high traffic  */
/* ------------------------------------------------------------ */

const COMPUTE_UNITS_ACTIVATE = 400_000; // Default: 200k, we request 400k for safety

/* ------------------------------------------------------------ */

export async function activateLevel(
  connection: Connection,
  wallet: WalletLike,
  levelId: number
): Promise<string | null> {
  try {
    /* ---------------- Wallet check -------------------------- */
    if (!wallet?.publicKey) {
      toast.error("walletNotConnected");
      return null;
    }

    /* ---------------- Level check --------------------------- */
    if (!Number.isInteger(levelId) || levelId < 1 || levelId > MAX_LEVELS) {
      toast.error("invalidLevel");
      return null;
    }

    const walletBase58 = wallet.publicKey.toBase58();

    /* ---------------- Compute Budget instruction ------------ */
    const computeBudgetIx = ComputeBudgetProgram.setComputeUnitLimit({
      units: COMPUTE_UNITS_ACTIVATE,
    });

    /* ---------------- Build instruction --------------------- */
    let ix;
    try {
      console.log(`[sdk/activate] Building instruction for level ${levelId}...`);
      ix = await buildActivateLevelV3Ix(
        connection,
        wallet.publicKey,
        levelId
      );
      console.log(`[sdk/activate] Instruction built successfully for level ${levelId}`);
    } catch (buildErr: any) {
      console.error(`[sdk/activate] buildActivateLevelV3Ix failed for level ${levelId}:`, buildErr);
      
      // Сохраняем детали ошибки для отладки
      const errorDetails = {
        level: levelId,
        step: "build",
        error: buildErr?.message || String(buildErr),
        stack: buildErr?.stack,
        name: buildErr?.name,
      };
      if (typeof window !== 'undefined') {
        localStorage.setItem('last-activation-error', JSON.stringify(errorDetails));
      }
      
      // Обрабатываем ошибки построения инструкции
      const errorMsg = formatActivationError(buildErr, levelId);
      toast.error(errorMsg);
      return null;
    }

    // ComputeBudget instruction MUST be first in the transaction
    const tx = new Transaction().add(computeBudgetIx).add(ix);

    /* ---------------- Send tx (simulation happens in sendTxWithPriority) ------------------------------- */
    let signature: string;
    try {
      const result = await sendTxWithPriority(
        connection,
        wallet,
        tx,
        `Activate L${levelId}`
      );
      signature = result.signature;
    } catch (err: any) {
      console.error("[sdk/activate] send failed:", err);
      
      // Сохраняем детали ошибки для отладки
      const errorDetails = {
        level: levelId,
        step: "send",
        error: err?.message || String(err),
        logs: err?.logs || err?.transactionLogs,
        code: err?.code,
        name: err?.name,
      };
      if (typeof window !== 'undefined') {
        localStorage.setItem('last-activation-error', JSON.stringify(errorDetails));
      }
      
      // Пытаемся получить логи из ошибки
      const errorObj: any = { message: err?.message };
      if (err?.logs) errorObj.logs = err.logs;
      if (err?.transactionLogs) errorObj.logs = err.transactionLogs;
      
      const errorMsg = formatActivationError(errorObj, levelId);
      toast.error(errorMsg);
      return null;
    }

    toast.success(`ACTIVATION_SENT_LEVEL:${levelId}`);

    /* ---------------- Finalization -------------------------- */
    const res = await waitForSignatureFinalized(connection, signature);

    if (!res.ok) {
      // Сохраняем детали ошибки для отладки
      const errorDetails = {
        level: levelId,
        step: "finalize",
        error: res.err || "Unknown error",
        logs: res.logs,
        signature,
      };
      if (typeof window !== 'undefined') {
        localStorage.setItem('last-activation-error', JSON.stringify(errorDetails));
      }
      
      // Пытаемся парсить ошибку из логов
      const errorObj = res.logs ? { logs: res.logs, message: res.err } : { message: res.err };
      const parsed = parseAnchorError(errorObj);
      
      // Используем formatActivationError для всех ошибок finalization
      const errorMsg = formatActivationError({ message: res.err, logs: res.logs }, levelId);
      toast.error(errorMsg);
      return null;
    }

    /* ---------------- History ------------------------------- */
    try {
      recordActivate(walletBase58, levelId, signature);
    } catch (historyErr) {
      // Не критично, если история не записалась, но логируем для отладки
      console.warn("[sdk/activate] Failed to record activation in history:", historyErr);
    }

    return signature;
  } catch (err: any) {
    console.error(`[sdk/activate] Unexpected error for level ${levelId}:`, err);
    console.error(`[sdk/activate] Error stack:`, err?.stack);
    console.error(`[sdk/activate] Error details:`, {
      message: err?.message,
      name: err?.name,
      code: err?.code,
      logs: err?.logs,
      transactionLogs: err?.transactionLogs,
    });
    
    // Сохраняем детали ошибки для отладки
    const errorDetails = {
      level: levelId,
      step: "unexpected",
      error: err?.message || String(err),
      stack: err?.stack,
      name: err?.name,
      code: err?.code,
      logs: err?.logs || err?.transactionLogs,
    };
    if (typeof window !== 'undefined') {
      localStorage.setItem('last-activation-error', JSON.stringify(errorDetails));
    }
    
    // Пытаемся парсить ошибку Anchor
    const errorMsg = formatActivationError(err, levelId);
    toast.error(errorMsg);
    
    return null;
  }
}
