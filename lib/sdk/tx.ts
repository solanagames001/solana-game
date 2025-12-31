// lib/sdk/tx.ts
// ------------------------------------------------------------
// Solana Game SDK v3.10 — TRANSACTION UTILITIES (PHANTOM OPTIMIZED)
// ------------------------------------------------------------
// • Pre-simulation before sending (Phantom trust)
// • Compute unit validation (< 200k for trust)
// • Optimized for minimal RPC calls
// • Automatic retry with backoff
// ------------------------------------------------------------
"use client";

import { Connection, Transaction, PublicKey } from "@solana/web3.js";
import { HELIUS_CONFIG } from "./helius";

/* ------------------------------------------------------------ */

export type WalletLike = {
  publicKey: PublicKey | null;
  sendTransaction?: (
    tx: Transaction,
    connection: Connection,
    opts?: { maxRetries?: number }
  ) => Promise<string>;
  signTransaction?: (tx: any) => Promise<any>;
};

/* ------------------------------------------------------------ */

function wrapWalletError(e: any, note?: string): Error {
  const msg =
    (typeof e?.message === "string" && e.message) ||
    (typeof e === "string" && e) ||
    "Wallet error";

  return new Error(note ? `${msg} (${note})` : msg);
}

/* ------------------------------------------------------------ */
/* SIMULATION (Phantom Trust + Compute Unit Check)              */
/* ------------------------------------------------------------ */

interface SimulationResult {
  success: boolean;
  computeUnits?: number;
  error?: string;
  logs?: string[];
}

/**
 * Pre-simulate transaction before sending
 * 
 * PHANTOM TRUST OPTIMIZATION:
 * - Catches errors before Phantom sees them
 * - Validates compute units are under limit
 * - Reduces "suspicious transaction" warnings
 */
async function simulateTransaction(
  connection: Connection,
  tx: Transaction
): Promise<SimulationResult> {
  try {
    const simulation = await Promise.race([
      connection.simulateTransaction(tx),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error("Simulation timeout")),
          HELIUS_CONFIG.limits.transaction.simulationTimeout
        )
      ),
    ]);

    if (simulation.value.err) {
      return {
        success: false,
        error: JSON.stringify(simulation.value.err),
        logs: simulation.value.logs || [],
        computeUnits: simulation.value.unitsConsumed,
      };
    }

    const computeUnits = simulation.value.unitsConsumed || 0;
    const maxCU = HELIUS_CONFIG.limits.transaction.maxComputeUnits;

    // Warn if compute units are high (Phantom may flag as suspicious)
    if (computeUnits > maxCU) {
      console.warn(
        `[tx.simulate] High compute units: ${computeUnits} > ${maxCU}`
      );
      return {
        success: false,
        error: `Compute units too high: ${computeUnits} (max: ${maxCU})`,
        computeUnits,
        logs: simulation.value.logs || [],
      };
    }

    return {
      success: true,
      computeUnits,
      logs: simulation.value.logs || [],
    };
  } catch (e: any) {
    // Simulation timeout or network error - allow transaction to proceed
    // Phantom will do its own simulation
    console.warn("[tx.simulate] Simulation failed, proceeding anyway:", e);
    return {
      success: true, // Allow to proceed
      error: e?.message,
    };
  }
}

/* ------------------------------------------------------------ */

export async function sendTxWithPriority(
  connection: Connection,
  wallet: WalletLike,
  tx: Transaction,
  note?: string
): Promise<{ signature: string }> {
  if (!wallet?.publicKey) {
    throw new Error("Wallet not connected");
  }

  // Получаем свежий blockhash
  let blockhash: string;
  let lastValidBlockHeight: number;
  try {
    const blockhashResult = await connection.getLatestBlockhash("confirmed");
    blockhash = blockhashResult.blockhash;
    lastValidBlockHeight = blockhashResult.lastValidBlockHeight;
  } catch (err: any) {
    console.error("[tx.sendTxWithPriority] Failed to get blockhash:", err);
    throw new Error(`Failed to get blockhash: ${err?.message || "Unknown error"}`);
  }

  tx.feePayer = wallet.publicKey;
  tx.recentBlockhash = blockhash;

  // PHANTOM TRUST OPTIMIZATION:
  // Pre-simulate to catch errors and validate compute units
  // This reduces Phantom's "suspicious transaction" warnings
  if (HELIUS_CONFIG.features.optimizedMode) {
    const simResult = await simulateTransaction(connection, tx);
    
    if (!simResult.success && simResult.error) {
      // Log for debugging but don't block - Phantom will show its own error
      console.warn("[tx.sendTxWithPriority] Pre-simulation warning:", simResult.error);
      
      // Only block if compute units are definitely too high
      if (simResult.computeUnits && 
          simResult.computeUnits > HELIUS_CONFIG.limits.transaction.maxComputeUnits * 2) {
        throw new Error(`Transaction too complex: ${simResult.computeUnits} compute units`);
      }
    } else if (simResult.success && simResult.computeUnits) {
      console.log(`[tx.sendTxWithPriority] Simulation OK, CU: ${simResult.computeUnits}`);
    }
  }

  if (wallet.sendTransaction) {
    try {
      // На мобильных устройствах может быть задержка, увеличиваем таймаут
      const signature = await Promise.race([
        wallet.sendTransaction(tx, connection, {
          maxRetries: 2,
        }),
        new Promise<string>((_, reject) => 
          setTimeout(() => reject(new Error("Transaction send timeout (30s)")), 30000)
        ),
      ]) as string;

      if (note) console.log(`[TX] ${note}: ${signature}`);
      return { signature };
    } catch (e: any) {
      console.error("[tx.sendTxWithPriority] sendTransaction error:", e);
      
      // Проверяем, не была ли транзакция отклонена пользователем
      if (e?.message?.includes("User rejected") || 
          e?.message?.includes("user rejected") ||
          e?.code === 4001) {
        throw new Error("Transaction was cancelled by user");
      }
      
      throw wrapWalletError(e, note);
    }
  }

  if (!wallet.signTransaction) {
    throw new Error("Wallet does not support transactions");
  }

  try {
    const signed = await Promise.race([
      wallet.signTransaction(tx),
      new Promise<any>((_, reject) => 
        setTimeout(() => reject(new Error("Transaction sign timeout (30s)")), 30000)
      ),
    ]) as Transaction;

    const raw = signed.serialize();

    const signature = await connection.sendRawTransaction(raw, {
      maxRetries: 2,
    });

    return { signature };
  } catch (e: any) {
    console.error("[tx.sendTxWithPriority] signTransaction error:", e);
    
    // Проверяем, не была ли транзакция отклонена пользователем
    if (e?.message?.includes("User rejected") || 
        e?.message?.includes("user rejected") ||
        e?.code === 4001) {
      throw new Error("Transaction was cancelled by user");
    }
    
    throw wrapWalletError(e, note);
  }
}

/* ------------------------------------------------------------ */
/* EXPORTS                                                      */
/* ------------------------------------------------------------ */

export { simulateTransaction };
export type { SimulationResult };

/* ------------------------------------------------------------ */

export async function waitForSignatureFinalized(
  connection: Connection,
  signature: string
): Promise<{ ok: boolean; err?: string; logs?: string[] }> {
  try {
    const res = await connection.confirmTransaction(signature, "finalized");

    if (res.value.err) {
      // Пытаемся получить логи транзакции для лучшего парсинга ошибок
      let logs: string[] = [];
      try {
        const tx = await connection.getTransaction(signature, {
          commitment: "confirmed",
          maxSupportedTransactionVersion: 0,
        });
        logs = tx?.meta?.logMessages || [];
      } catch {
        // Ignore log fetch errors
      }

      // Правильно извлекаем сообщение об ошибке
      let errStr = "";
      try {
        if (typeof res.value.err === "string") {
          errStr = res.value.err;
        } else if (res.value.err) {
          // Пытаемся извлечь полезную информацию из объекта ошибки
          const errObj = res.value.err as any;
          if (errObj.InstructionError && Array.isArray(errObj.InstructionError)) {
            const [index, customErr] = errObj.InstructionError;
            if (customErr?.Custom !== undefined) {
              errStr = `Instruction ${index} failed with code ${customErr.Custom}`;
            } else if (customErr) {
              errStr = JSON.stringify(customErr);
            }
          } else {
            errStr = JSON.stringify(res.value.err);
          }
        } else {
          errStr = "Unknown transaction error";
        }
      } catch {
        errStr = "Transaction failed";
      }
      return { ok: false, err: errStr, logs };
    }

    return { ok: true };
  } catch (e: any) {
    let logs: string[] = [];
    try {
      const tx = await connection.getTransaction(signature, {
        commitment: "confirmed",
        maxSupportedTransactionVersion: 0,
      });
      logs = tx?.meta?.logMessages || [];
    } catch {
      // Ignore log fetch errors
    }
    return { ok: false, err: e?.message, logs };
  }
}
