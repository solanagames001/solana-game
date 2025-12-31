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

  // Извлекаем сообщение из ошибки (правильная обработка объектов)
  let message = "";
  if (typeof err === "string") {
    message = err;
  } else if (err?.message) {
    message = String(err.message);
  } else if (err?.error) {
    message = String(err.error);
  } else if (err?.toString && err.toString() !== "[object Object]") {
    message = err.toString();
  } else if (err?.name) {
    message = err.name;
  } else {
    // Пытаемся извлечь из JSON
    try {
      message = JSON.stringify(err);
    } catch {
      message = "Unknown error";
    }
  }
  
  // Обработка ошибок построения инструкции
  if (message.includes("ConfigV3 not found") || message.includes("Failed to fetch ConfigV3")) {
    return `Failed to connect to blockchain. Please check your internet connection and try again.`;
  }
  
  if (message.includes("timeout") || message.includes("Timeout")) {
    return `Request timeout. Please check your internet connection and try again.`;
  }
  
  if (message.includes("Pool fetch timeout") || message.includes("TailPage fetch timeout") || message.includes("HeadPage fetch timeout")) {
    return `Network timeout. Please check your connection and try again.`;
  }
  
  if (message.includes("insufficient funds") || message.includes("Insufficient funds")) {
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

  // Проверяем логи на наличие полезной информации
  if (err?.logs && Array.isArray(err.logs)) {
    const logsStr = err.logs.join(" ");
    if (logsStr.includes("insufficient funds")) {
      return `Insufficient SOL balance. Level ${levelId} requires more SOL.`;
    }
    if (logsStr.includes("already activated") || logsStr.includes("AlreadyActivated")) {
      return `Level ${levelId} is already activated.`;
    }
  }

  // Общая ошибка - показываем детали для отладки, но без технических деталей для пользователя
  console.error("[formatActivationError] Unparsed error for level", levelId, ":", err);
  
  // Упрощаем сообщение для пользователя
  if (message.includes("Unexpected error") || message.includes("unexpected error") || message === "[object Object]") {
    return `Activation failed. Please try again. If the problem persists, check your internet connection and wallet balance.`;
  }
  
  // Ограничиваем длину сообщения для пользователя
  const userMessage = message.length > 100 ? message.substring(0, 100) + "..." : message;
  return `Activation failed: ${userMessage || "Unknown error"}. Please try again.`;
}

