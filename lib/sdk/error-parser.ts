// lib/sdk/error-parser.ts
"use client";

import { AnchorError } from "@coral-xyz/anchor";

/**
 * Карта ошибок из IDL для быстрого поиска по коду
 * Соответствует ошибкам из idl.json
 */
const ERROR_MAP: Record<number, string> = {
  6000: "Invalid distribution sum (must be 100)",
  6001: "Unauthorized",
  6002: "Invalid level",
  6003: "Invalid price",
  6004: "Level already activated",
  6005: "Slots are already full",
  6006: "Not enough slots filled to recycle",
  6007: "Queue is empty",
  6008: "Level not activated",
  6009: "Overflow",
  6010: "QueuePage key mismatch",
  6011: "Account cast failed",
  6012: "Queue page is full",
  6013: "Player already in queue",
  6014: "Next queue page already exists (rollover conflict)",
  6015: "Minimum entry delay not satisfied",
  6016: "Recipient must be a system wallet (no data)",
  6017: "Rollover requires more than one new page (not supported in one tx)",
};

/**
 * Парсит ошибку Anchor из логов транзакции
 */
export function parseAnchorError(err: any): { code: number; message: string } | null {
  if (!err) return null;

  // Пытаемся парсить через AnchorError.parse если есть логи
  if (err.logs && Array.isArray(err.logs)) {
    try {
      const anchorError = AnchorError.parse(err.logs);
      if (anchorError) {
        return {
          code: anchorError.error.code.number,
          message: anchorError.error.errorMessage || ERROR_MAP[anchorError.error.code.number] || "Unknown error",
        };
      }
    } catch {
      // Ignore parsing errors
    }
  }

  // Пытаемся извлечь из transactionLogs
  if (err.transactionLogs && Array.isArray(err.transactionLogs)) {
    try {
      const anchorError = AnchorError.parse(err.transactionLogs);
      if (anchorError) {
        return {
          code: anchorError.error.code.number,
          message: anchorError.error.errorMessage || ERROR_MAP[anchorError.error.code.number] || "Unknown error",
        };
      }
    } catch {
      // Ignore parsing errors
    }
  }

  // Пытаемся извлечь из message
  const message = err.message || err.toString() || "";
  
  // Ищем код ошибки в сообщении (например, "Error Code: AlreadyActivated. Error Number: 6004")
  const errorCodeMatch = message.match(/Error Number: (\d+)/);
  if (errorCodeMatch) {
    const code = parseInt(errorCodeMatch[1], 10);
    if (ERROR_MAP[code]) {
      return {
        code,
        message: ERROR_MAP[code],
      };
    }
  }

  // Ищем код ошибки в JSON ошибке (из waitForSignatureFinalized)
  try {
    const jsonErr = typeof err === "string" ? JSON.parse(err) : err;
    if (jsonErr && typeof jsonErr.InstructionError === "object") {
      const instructionErr = jsonErr.InstructionError;
      if (Array.isArray(instructionErr) && instructionErr[1]) {
        const customErr = instructionErr[1];
        if (customErr && typeof customErr.Custom === "number") {
          const code = customErr.Custom;
          if (ERROR_MAP[code]) {
            return {
              code,
              message: ERROR_MAP[code],
            };
          }
        }
      }
    }
  } catch {
    // Not a JSON error
  }

  return null;
}

/**
 * Форматирует сообщение об ошибке для пользователя
 */
export function formatActivationError(err: any, levelId: number): string {
  const parsed = parseAnchorError(err);
  
  if (parsed) {
    // Специальная обработка для "Level already activated"
    if (parsed.code === 6004) {
      return `Level ${levelId} is already activated`;
    }
    
    return `Level ${levelId} activation failed: ${parsed.message}`;
  }

  // КРИТИЧЕСКОЕ: Проверяем логи ПЕРВЫМ делом (там самая полезная информация)
  if (err?.logs && Array.isArray(err.logs)) {
    const logsStr = err.logs.join(" ");
    
    // Проверяем "insufficient lamports" (наиболее частая ошибка)
    const insufficientLamportsMatch = logsStr.match(/Transfer: insufficient lamports (\d+), need (\d+)/);
    if (insufficientLamportsMatch) {
      const haveLamports = parseInt(insufficientLamportsMatch[1], 10);
      const needLamports = parseInt(insufficientLamportsMatch[2], 10);
      const missingLamports = needLamports - haveLamports;
      const missingSOL = (missingLamports / 1_000_000_000).toFixed(4);
      const needSOL = (needLamports / 1_000_000_000).toFixed(4);
      
      return `Insufficient SOL balance. Level ${levelId} requires ${needSOL} SOL. You need ${missingSOL} SOL more.`;
    }
    
    // Проверяем другие варианты insufficient
    if (logsStr.includes("insufficient lamports") || logsStr.includes("insufficient funds")) {
      return `Insufficient SOL balance. Level ${levelId} requires more SOL. Please add SOL to your wallet.`;
    }
    
    if (logsStr.includes("already activated") || logsStr.includes("AlreadyActivated")) {
      return `Level ${levelId} is already activated.`;
    }
  }

  // Извлекаем сообщение из ошибки (правильная обработка объектов)
  let message = "";
  if (typeof err === "string") {
    message = err;
  } else if (err?.message && typeof err.message === "string") {
    message = err.message;
  } else if (err?.error && typeof err.error === "string") {
    message = err.error;
  } else if (err?.toString && typeof err.toString === "function") {
    const str = err.toString();
    if (str !== "[object Object]") {
      message = str;
    }
  } else if (err?.name && typeof err.name === "string") {
    message = err.name;
  }
  
  // Если всё ещё нет сообщения - пытаемся JSON
  if (!message || message === "[object Object]") {
    try {
      const jsonStr = JSON.stringify(err);
      if (jsonStr && jsonStr !== "{}" && jsonStr !== "null") {
        // Не показываем JSON пользователю, просто используем как fallback
        message = "";
      } else {
        message = "";
      }
    } catch {
      message = "";
    }
  }
  
  // Обработка ошибок построения инструкции (в message)
  if (message.includes("ConfigV3 not found") || message.includes("Failed to fetch ConfigV3")) {
    return `Failed to connect to blockchain. Please check your internet connection and try again.`;
  }
  
  if (message.includes("timeout") || message.includes("Timeout")) {
    return `Request timeout. Please check your internet connection and try again.`;
  }
  
  if (message.includes("Pool fetch timeout") || message.includes("TailPage fetch timeout") || message.includes("HeadPage fetch timeout")) {
    return `Network timeout. Please check your connection and try again.`;
  }
  
  if (message.includes("insufficient funds") || message.includes("Insufficient funds") || message.includes("insufficient lamports")) {
    return `Insufficient SOL balance. Level ${levelId} requires more SOL.`;
  }

  if (message.includes("Attempt to debit an account but found no record of a prior credit")) {
    return `Insufficient SOL balance for transaction fees.`;
  }

  if (message.includes("Transaction simulation failed")) {
    return `Transaction simulation failed. Please check your balance and try again.`;
  }

  if (message.includes("User rejected") || message.includes("user rejected")) {
    return "Transaction was cancelled by user.";
  }

  // Общая ошибка - показываем детали для отладки, но без технических деталей для пользователя
  console.error("[formatActivationError] Unparsed error for level", levelId, ":", err);
  
  // Упрощаем сообщение для пользователя
  if (!message || message === "[object Object]") {
    return `Activation failed. Please check your wallet balance and try again. If the problem persists, check your internet connection.`;
  }
  
  // Ограничиваем длину сообщения для пользователя
  const userMessage = message.length > 100 ? message.substring(0, 100) + "..." : message;
  return `Activation failed: ${userMessage || "Unknown error"}. Please try again.`;
}
