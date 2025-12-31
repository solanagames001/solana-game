"use client";

// ------------------------------------------------------------
// Solana Game v3.10 — activate_level_v3 builder (HELIUS OPTIMIZED)
// Полностью повторяет:
//  - activate_level_v3_smart.js
//  - activate_level_v3_ref_smart.js
// 
// HELIUS OPTIMIZATION:
// - Uses HeliusRPCOptimizer for cached account fetches
// - Batches multiple account reads where possible
// - Respects rate limits and backoff
// ------------------------------------------------------------

import {
  Connection,
  PublicKey,
  SystemProgram,
  TransactionInstruction,
} from "@solana/web3.js";

import {
  PROGRAM_ID,
  derivePlayerPda,
  deriveLevelStatePda,
  deriveConfigPda,
  deriveLevelPoolPda,
  deriveQueuePagePda,
  deriveTxGuardActivate,
} from "./pda";

import { MAX_LEVELS, priceLamportsForLevel } from "./prices";
import { HeliusRPCOptimizer, HELIUS_CONFIG } from "./helius";

/* ------------------------------------------------------------ */
/* Utils                                                        */
/* ------------------------------------------------------------ */

const pkEq = (a: PublicKey, b: PublicKey) => a.toBase58() === b.toBase58();

// “нулевой” pubkey (в web3 это 111..)
const ZERO_PUBKEY = SystemProgram.programId;

/* ------------------------------------------------------------ */
/* DISCRIMINATOR                                                */
/* ------------------------------------------------------------ */

const DISCR_ACTIVATE_LEVEL_V3 = Buffer.from([0, 26, 75, 130, 110, 192, 143, 66]);

/* ------------------------------------------------------------ */
/* Binary readers (script-aligned)                              */
/* ------------------------------------------------------------ */

function readU64LE(buf: Buffer, off: number): bigint {
  return buf.readBigUInt64LE(off);
}

function readConfigAdminTreasury(buf: Buffer) {
  return {
    admin: new PublicKey(buf.slice(8, 40)),
    treasury: new PublicKey(buf.slice(40, 72)),
  };
}

function readLevelPoolHeadTail(buf: Buffer) {
  let off = 8 + 32 + 1 + 1;

  const readOpt = () => {
    const tag = buf[off++];
    if (tag === 0) return null;
    const pk = new PublicKey(buf.slice(off, off + 32));
    off += 32;
    return pk;
  };

  return { head: readOpt(), tail: readOpt() };
}

function readQueuePageMeta(buf: Buffer) {
  let off = 8 + 1 + 32;

  const pageIndex = buf.readUInt32LE(off);
  off += 4;

  const nextTag = buf[off++];
  if (nextTag === 1) off += 32;

  const len = buf.readUInt32LE(off);
  off += 4;

  const firstPlayerPda = len > 0 ? new PublicKey(buf.slice(off, off + 32)) : null;

  return { pageIndex, firstPlayerPda };
}

function readPlayerFull(buf: Buffer) {
  const authority = new PublicKey(buf.slice(8, 40));
  const off = 8 + 32 + 1 + 8 + 8;

  return {
    authority,
    upline1: new PublicKey(buf.slice(off, off + 32)),
    upline2: new PublicKey(buf.slice(off + 32, off + 64)),
    upline3: new PublicKey(buf.slice(off + 64, off + 96)),
  };
}

/* ------------------------------------------------------------ */
/* Helpers                                                      */
/* ------------------------------------------------------------ */

async function accountExists(connection: Connection, pk: PublicKey): Promise<boolean> {
  try {
    // HELIUS OPTIMIZATION: Use cached account info
    const acc = await HeliusRPCOptimizer.getAccountInfo(connection, pk, "confirmed");
    return !!(acc && acc.data && acc.data.length > 0);
  } catch {
    return false;
  }
}

async function hasOpenLevel(connection: Connection, levelStatePda: PublicKey): Promise<boolean> {
  try {
    // HELIUS OPTIMIZATION: Use cached account info
    const acc = await HeliusRPCOptimizer.getAccountInfo(connection, levelStatePda, "confirmed");
    
    if (!acc || !acc.data || acc.data.length < 16) return false;

    try {
      // LevelState.activated_at > 0
      const activatedAt = readU64LE(Buffer.from(acc.data), 8);
      return activatedAt > 0n;
    } catch {
      return false;
    }
  } catch {
    return false;
  }
}

function normalizeUpline(wallet: PublicKey, admin: PublicKey): PublicKey {
  // Если в Player записан “нулевой” pubkey (111..), считаем что это admin
  return pkEq(wallet, ZERO_PUBKEY) ? admin : wallet;
}

/* ------------------------------------------------------------ */
/* BUILDER                                                      */
/* ------------------------------------------------------------ */

async function buildActivateLevelV3Ix(
  connection: Connection,
  authority: PublicKey,
  level: number
): Promise<TransactionInstruction> {
  if (!Number.isInteger(level) || level < 1 || level > MAX_LEVELS) {
    throw new RangeError(`Invalid level ${level}`);
  }

  /* ---------- Core PDAs ---------- */

  const [playerPda] = derivePlayerPda(authority);
  const [levelStatePda] = deriveLevelStatePda(playerPda, level);

  const [configPda] = deriveConfigPda();
  const [levelPoolPda] = deriveLevelPoolPda(configPda, level);

  /* ---------- Config ---------- */
  // HELIUS OPTIMIZATION: Config is cached for longer (rarely changes)

  let cfgAcc;
  try {
    cfgAcc = await HeliusRPCOptimizer.getAccountInfo(connection, configPda, "confirmed");
  } catch (err) {
    throw new Error(`Failed to fetch ConfigV3: ${err instanceof Error ? err.message : "Unknown error"}`);
  }
  
  if (!cfgAcc || !cfgAcc.data) throw new Error("ConfigV3 not found");

  const { admin, treasury } = readConfigAdminTreasury(Buffer.from(cfgAcc.data));

  /* ---------- LevelPool ---------- */

  let [headPage] = deriveQueuePagePda(levelPoolPda, 0);
  let tailPage = headPage;
  let isFirstActivation = false;

  try {
    // HELIUS OPTIMIZATION: Use cached account info
    const poolAcc = await HeliusRPCOptimizer.getAccountInfo(connection, levelPoolPda, "confirmed") as any;
    
    if (poolAcc?.data?.length) {
      const { head, tail } = readLevelPoolHeadTail(Buffer.from(poolAcc.data));
      if (head) {
        headPage = head;
      } else {
        // Если headPage отсутствует, это первая активация уровня
        isFirstActivation = true;
        console.log(`[activate-builder] Level ${level}: First activation detected (no headPage)`);
      }
      if (tail) {
        tailPage = tail;
      } else {
        // Если tailPage отсутствует, это первая активация уровня
        isFirstActivation = true;
        console.log(`[activate-builder] Level ${level}: First activation detected (no tailPage)`);
      }
    } else {
      // LevelPool не существует - это первая активация уровня
      isFirstActivation = true;
      console.log(`[activate-builder] Level ${level}: First activation detected (no levelPool)`);
    }
  } catch (err) {
    console.warn("[activate-builder] Failed to read levelPool, assuming first activation:", err);
    // Если не удалось прочитать, предполагаем что это первая активация
    isFirstActivation = true;
  }

  // newPage = derive(pageIndex(tail)+1) как в скрипте
  // ВАЖНО: Если tailPage заполнена (64 игрока), нужно создать новую страницу
  // Для первой активации newPage будет создана контрактом
  let newPage = headPage;
  let tailPageIsFull = false;
  
  // Если это первая активация, newPage будет создана контрактом (pageIndex=0)
  // headPage и tailPage должны быть одинаковыми и указывать на newPage
  if (isFirstActivation) {
    [newPage] = deriveQueuePagePda(levelPoolPda, 0);
    // Для первой активации headPage и tailPage должны указывать на newPage
    headPage = newPage;
    tailPage = newPage;
    console.log(`[activate-builder] Level ${level}: First activation - newPage will be created by contract: ${newPage.toBase58()}`);
    console.log(`[activate-builder] Level ${level}: First activation - headPage=tailPage=newPage`);
  } else {
    // Для существующей очереди проверяем tailPage
    try {
      // HELIUS OPTIMIZATION: Use cached account info
      const tailAcc = await HeliusRPCOptimizer.getAccountInfo(connection, tailPage, "confirmed") as any;
      
      if (tailAcc?.data?.length) {
        const meta = readQueuePageMeta(Buffer.from(tailAcc.data));
        const nextPageIndex = meta.pageIndex + 1;
        [newPage] = deriveQueuePagePda(levelPoolPda, nextPageIndex);
        
        // Проверяем, заполнена ли tailPage (64 игрока = QUEUE_PAGE_CAPACITY_DEFAULT)
        // Читаем длину массива players из данных страницы
        try {
          const pageData = Buffer.from(tailAcc.data);
          // Структура QueuePage: bump(1) + level_pool(32) + page_index(4) + next_page(1+32?) + players_len(4) + players(32*len)
          let off = 8 + 1 + 32 + 4; // discriminator + bump + level_pool + page_index
          const nextTag = pageData[off];
          off += 1;
          if (nextTag === 1) off += 32; // next_page Some
          const playersLen = pageData.readUInt32LE(off);
          
          // QUEUE_PAGE_CAPACITY_DEFAULT = 64
          tailPageIsFull = playersLen >= 64;
          
          console.log(`[activate-builder] Level ${level}: tailPage pageIndex=${meta.pageIndex}, playersLen=${playersLen}, isFull=${tailPageIsFull}, nextTag=${nextTag}`);
          
          // Если tailPage заполнена И next_page уже существует, это означает что
          // следующая страница уже создана, нужно использовать её
          if (tailPageIsFull && nextTag === 1) {
            // next_page уже существует, используем его
            // next_page находится ДО чтения players_len
            const nextPageOffset = 8 + 1 + 32 + 4 + 1; // discriminator + bump + level_pool + page_index + nextTag
            const nextPagePk = new PublicKey(pageData.slice(nextPageOffset, nextPageOffset + 32));
            newPage = nextPagePk;
            console.log(`[activate-builder] Level ${level}: Using existing nextPage: ${newPage.toBase58()}`);
          } else if (tailPageIsFull) {
            // tailPage заполнена, но next_page еще не создан - создадим новую
            [newPage] = deriveQueuePagePda(levelPoolPda, meta.pageIndex + 1);
            console.log(`[activate-builder] Level ${level}: Creating new page: ${newPage.toBase58()} (pageIndex=${meta.pageIndex + 1})`);
          } else {
            console.log(`[activate-builder] Level ${level}: tailPage not full, newPage will be used if needed: ${newPage.toBase58()}`);
          }
        } catch (err) {
          console.warn("[activate-builder] Failed to read tailPage players length:", err);
          // Если не удалось прочитать, предполагаем что не заполнена
          tailPageIsFull = false;
        }
      }
    } catch (err) {
      console.warn("[activate-builder] Failed to read tailPage, using default newPage:", err);
      // Если не удалось прочитать tailPage, используем headPage как fallback
      // Это может произойти на мобильных при медленном соединении
      // В этом случае контракт сам определит правильную newPage
    }
  }

  /* ---------- OWNER ---------- */

  let ownerPlayerPda = playerPda;
  let ownerWallet = authority;

  // Для первой активации owner = активатор (self)
  if (!isFirstActivation) {
    try {
      // HELIUS OPTIMIZATION: Use cached account info
      const headAcc = await HeliusRPCOptimizer.getAccountInfo(connection, headPage, "confirmed") as any;
      
      if (headAcc?.data?.length) {
        const meta = readQueuePageMeta(Buffer.from(headAcc.data));
        if (meta.firstPlayerPda) {
          ownerPlayerPda = meta.firstPlayerPda;

          try {
            // HELIUS OPTIMIZATION: Use cached account info
            const ownerAcc = await HeliusRPCOptimizer.getAccountInfo(connection, ownerPlayerPda, "confirmed") as any;
            
            if (ownerAcc?.data?.length) {
              const owner = readPlayerFull(Buffer.from(ownerAcc.data));
              ownerWallet = owner.authority;
            }
          } catch (err) {
            console.warn("[activate-builder] Failed to read owner player:", err);
            // Продолжаем с дефолтными значениями
          }
        }
      }
    } catch (err) {
      console.warn("[activate-builder] Failed to read headPage, using defaults:", err);
      // Продолжаем с дефолтными значениями
    }
  } else {
    if (HELIUS_CONFIG.features.logRpcWarnings) {
      console.log(`[activate-builder] Level ${level}: First activation - owner is activator (self)`);
    }
  }

  const [ownerLevelStatePda] = deriveLevelStatePda(ownerPlayerPda, level);

  /* ---------- OWNER uplines ---------- */

  let u1 = admin;
  let u2 = admin;
  let u3 = admin;

  try {
    // HELIUS OPTIMIZATION: Use cached account info
    const ownerAcc2 = await HeliusRPCOptimizer.getAccountInfo(connection, ownerPlayerPda, "confirmed") as any;
    
    if (ownerAcc2?.data?.length) {
      try {
        const o = readPlayerFull(Buffer.from(ownerAcc2.data));
        u1 = normalizeUpline(o.upline1, admin);
        u2 = normalizeUpline(o.upline2, admin);
        u3 = normalizeUpline(o.upline3, admin);
      } catch {
        // keep admin fallbacks
      }
    }
  } catch (err) {
    console.warn("[activate-builder] Failed to read owner player for uplines:", err);
    // keep admin fallbacks
  }

  /* ---------- Resolve ref wallets (RULE: if no open level => admin) ---------- */

  const [adminPlayerPda] = derivePlayerPda(admin);
  const [adminLevelStatePda] = deriveLevelStatePda(adminPlayerPda, level);

  async function resolveRefWallet(wallet: PublicKey): Promise<PublicKey> {
    if (pkEq(wallet, admin)) return admin;
    const [p] = derivePlayerPda(wallet);
    const [ls] = deriveLevelStatePda(p, level);
    return (await hasOpenLevel(connection, ls)) ? wallet : admin;
  }

  const ref1Wallet = await resolveRefWallet(u1);
  const ref2Wallet = await resolveRefWallet(u2);
  const ref3Wallet = await resolveRefWallet(u3);

  /* ---------- ref*_level_state (MUST correspond to RESOLVED ref wallets) ---------- */
  // По скрипту: всегда передаём 3 PDA; если PDA отсутствует — подставляем adminLevelStatePda

  async function refLevelStateOrAdminByWallet(resolvedRefWallet: PublicKey): Promise<PublicKey> {
    if (pkEq(resolvedRefWallet, admin)) return adminLevelStatePda;

    const [p] = derivePlayerPda(resolvedRefWallet);
    const [ls] = deriveLevelStatePda(p, level);

    return (await accountExists(connection, ls)) ? ls : adminLevelStatePda;
  }

  const ref1LevelStatePda = await refLevelStateOrAdminByWallet(ref1Wallet);
  const ref2LevelStatePda = await refLevelStateOrAdminByWallet(ref2Wallet);
  const ref3LevelStatePda = await refLevelStateOrAdminByWallet(ref3Wallet);

  /* ---------- TxGuard + data ---------- */

  const priceLamports = priceLamportsForLevel(level);
  const nonce = BigInt(Date.now());

  const [txGuardPda] = deriveTxGuardActivate(playerPda, level, nonce);

  // data = discr(8) + level(u8) + price(u64 LE) + nonce(u64 LE)
  const data = Buffer.concat([
    DISCR_ACTIVATE_LEVEL_V3,
    Buffer.from([level]),
    Buffer.alloc(8),
    Buffer.alloc(8),
  ]);

  data.writeBigUInt64LE(BigInt(priceLamports), 9);
  data.writeBigUInt64LE(nonce, 17);

  /* ---------- ACCOUNTS (STRICT 21) ---------- */

  const keys = [
    { pubkey: playerPda, isSigner: false, isWritable: true }, // 0
    { pubkey: levelStatePda, isSigner: false, isWritable: true }, // 1
    { pubkey: txGuardPda, isSigner: false, isWritable: true }, // 2
    { pubkey: authority, isSigner: true, isWritable: true }, // 3

    { pubkey: configPda, isSigner: false, isWritable: true }, // 4
    { pubkey: levelPoolPda, isSigner: false, isWritable: true }, // 5

    { pubkey: admin, isSigner: false, isWritable: true }, // 6
    { pubkey: treasury, isSigner: false, isWritable: true }, // 7

    { pubkey: ref1Wallet, isSigner: false, isWritable: true }, // 8
    { pubkey: ref2Wallet, isSigner: false, isWritable: true }, // 9
    { pubkey: ref3Wallet, isSigner: false, isWritable: true }, // 10

    { pubkey: tailPage, isSigner: false, isWritable: true }, // 11
    { pubkey: newPage, isSigner: false, isWritable: true }, // 12
    { pubkey: headPage, isSigner: false, isWritable: true }, // 13

    { pubkey: ownerPlayerPda, isSigner: false, isWritable: true }, // 14
    { pubkey: ownerLevelStatePda, isSigner: false, isWritable: true }, // 15
    { pubkey: ownerWallet, isSigner: false, isWritable: true }, // 16

    { pubkey: ref1LevelStatePda, isSigner: false, isWritable: false }, // 17
    { pubkey: ref2LevelStatePda, isSigner: false, isWritable: false }, // 18
    { pubkey: ref3LevelStatePda, isSigner: false, isWritable: false }, // 19

    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }, // 20
  ];

  return new TransactionInstruction({
    programId: PROGRAM_ID,
    keys,
    data,
  });
}

/* ------------------------------------------------------------ */
/* EXPORTS                                                      */
/* ------------------------------------------------------------ */

export { buildActivateLevelV3Ix };
export default buildActivateLevelV3Ix;
