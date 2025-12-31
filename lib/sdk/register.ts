// lib/sdk/register.ts
// ------------------------------------------------------------
// Solana Game v3.10 — register_player() SDK helper (CLEAN FINAL)
// ------------------------------------------------------------
// FIX (CRITICAL):
// • referrer_player account position must be stable.
// • If no referrer -> pass a placeholder account (readonly) to keep indices.
// • If referrer exists -> pass referrer PLAYER PDA (not wallet pubkey).
// ------------------------------------------------------------

"use client";

import {
  Connection,
  SystemProgram,
  Transaction,
  TransactionInstruction,
  type AccountMeta,
  PublicKey,
} from "@solana/web3.js";

import type { AnchorWallet } from "@solana/wallet-adapter-react";

import { toast } from "./toast";
import {
  PROGRAM_ID,
  derivePlayerPda,
  deriveConfigPda,
  deriveGlobalStatsPda,
  deriveTxGuardRegister,
} from "./pda";

import { sendTxWithPriority, waitForSignatureFinalized } from "./tx";

import { getReferrer, clearReferrer } from "./referral";

/* ------------------------------------------------------------
   CONSTANTS (on-chain IDL)
------------------------------------------------------------ */

// discriminator register_player
const REGISTER_DISC = Buffer.from([242, 146, 194, 234, 234, 145, 228, 42]);

/* ------------------------------------------------------------
   HELPERS
------------------------------------------------------------ */

function u64ToLeBuffer(n: bigint): Buffer {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(n);
  return buf;
}

/**
 * Option<Pubkey> encoder
 * • None  -> [0]
 * • Some  -> [1, pubkey(32)]
 */
function encodeOptionPubkey(pk: PublicKey | null): Buffer {
  if (!pk) return Buffer.from([0]);
  return Buffer.concat([Buffer.from([1]), pk.toBuffer()]);
}

/* ------------------------------------------------------------
   PUBLIC API — createPlayer
------------------------------------------------------------ */

// Minimum balance required for registration: 0.0030 SOL
const MIN_BALANCE_FOR_REGISTRATION = 0.0030 * 1_000_000_000; // 3,000,000 lamports

export async function createPlayer(
  connection: Connection,
  wallet: AnchorWallet
): Promise<string> {
  if (!wallet?.publicKey) {
    throw new Error("createPlayer: wallet not connected");
  }

  const authority = wallet.publicKey;

  // Check balance before registration
  const balance = await connection.getBalance(authority);
  if (balance < MIN_BALANCE_FOR_REGISTRATION) {
    const errorMsg = "insufficientFundsForRegistration";
    toast.error(errorMsg);
    throw new Error(errorMsg);
  }

  // Show creating profile notification
  toast.info("creatingProfile");

  const [playerPda] = derivePlayerPda(authority);
  const [configPda] = deriveConfigPda();
  const [statsPda] = deriveGlobalStatsPda();

  // nonce must be u64; Date.now ok for register (tx_guard uniqueness)
  const nonce = BigInt(Date.now());
  const [txGuardPda] = deriveTxGuardRegister(authority, nonce);

  /* ----------------------------------------------------------
     REFERRER
     getReferrer() returns REFERRER WALLET pubkey.
     We need to derive PLAYER PDA and pass it both in data and accounts.
     Rust code expects referrer_player account key to match the referrer PDA in data.
  ---------------------------------------------------------- */

  const referrerWalletPk = getReferrer(); // PublicKey | null
  const referrerPlayerPda = referrerWalletPk
    ? derivePlayerPda(referrerWalletPk)[0]
    : null;

  // IMPORTANT: data encodes Option<Pubkey> of referrer PLAYER PDA (must match account key)
  const data = Buffer.concat([
    REGISTER_DISC,
    encodeOptionPubkey(referrerPlayerPda),
    u64ToLeBuffer(nonce),
  ]);

  /* ----------------------------------------------------------
     ACCOUNTS (ORDER MUST MATCH Rust)
     We keep referrer_player slot ALWAYS present to avoid index shift.
  ---------------------------------------------------------- */

  // placeholder for referrer_player when None:
  // must be a safe, existing readonly pubkey (NOT SystemProgram.programId).
  // Using config PDA is safe and always exists on-chain.
  const referrerPlayerOrPlaceholder = referrerPlayerPda ?? configPda;

  const keys: AccountMeta[] = [
    // 0 player
    { pubkey: playerPda, isWritable: true, isSigner: false },

    // 1 authority
    { pubkey: authority, isWritable: true, isSigner: true },

    // 2 tx_guard
    { pubkey: txGuardPda, isWritable: true, isSigner: false },

    // 3 config
    { pubkey: configPda, isWritable: true, isSigner: false },

    // 4 global_stats
    { pubkey: statsPda, isWritable: true, isSigner: false },

    // 5 referrer_player (ALWAYS PRESENT; readonly)
    { pubkey: referrerPlayerOrPlaceholder, isWritable: false, isSigner: false },

    // 6 system_program
    { pubkey: SystemProgram.programId, isWritable: false, isSigner: false },
  ];

  try {
    const ix = new TransactionInstruction({
      programId: PROGRAM_ID,
      keys,
      data,
    });

    const tx = new Transaction().add(ix);

    const { signature } = await sendTxWithPriority(
      connection,
      wallet,
      tx,
      "Register player"
    );

    const res = await waitForSignatureFinalized(connection, signature);

    if (!res.ok) {
      const msg = `Registration error: ${res.err ?? "unknown"}`;
      toast.error(msg);
      throw new Error(msg);
    }

    // referrer одноразовый — чистим ТОЛЬКО после finalized OK
    clearReferrer();

    toast.success("playerRegistered");
    return signature;
  } catch (err: any) {
    console.error("[sdk/register.createPlayer]", err);
    // Only show error if it's not the insufficient funds error (already shown)
    if (err?.message !== "insufficientFundsForRegistration") {
      toast.error("registrationFailed");
    }
    throw err;
  }
}
