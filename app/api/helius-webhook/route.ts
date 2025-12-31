// app/api/helius-webhook/route.ts
// ------------------------------------------------------------
// Solana Game v3.10 — HELIUS WEBHOOK ENDPOINT
// Receives real-time transaction updates from Helius
// Replaces expensive polling with push notifications
// ------------------------------------------------------------

import { NextRequest, NextResponse } from 'next/server';

/* ------------------------------------------------------------
   TYPES
------------------------------------------------------------ */

interface HeliusWebhookPayload {
  type: string;
  timestamp: string;
  accountData?: Array<{
    account: string;
    nativeBalanceChange: number;
    tokenBalanceChanges: unknown[];
  }>;
  description?: string;
  feePayer?: string;
  fee?: number;
  signature?: string;
  slot?: number;
  nativeTransfers?: Array<{
    fromUserAccount: string;
    toUserAccount: string;
    amount: number;
  }>;
  tokenTransfers?: unknown[];
  instructions?: Array<{
    programId: string;
    accounts: string[];
    data: string;
  }>;
  events?: unknown;
}

/* ------------------------------------------------------------
   IN-MEMORY CACHE FOR WEBHOOK DATA
   In production, use Redis or a database
------------------------------------------------------------ */

// Store recent transactions by wallet
const recentTransactions = new Map<string, {
  signature: string;
  timestamp: number;
  type: string;
  status: 'pending' | 'confirmed' | 'finalized';
}[]>();

// Store activation status by wallet
const activationStatus = new Map<string, {
  isActivated: boolean;
  lastCheck: number;
  levels: number[];
}>();

// Max entries per wallet
const MAX_TRANSACTIONS_PER_WALLET = 100;

/* ------------------------------------------------------------
   HELPERS
------------------------------------------------------------ */

function cleanOldTransactions(wallet: string): void {
  const txs = recentTransactions.get(wallet);
  if (!txs) return;
  
  // Keep only last MAX_TRANSACTIONS_PER_WALLET
  if (txs.length > MAX_TRANSACTIONS_PER_WALLET) {
    txs.splice(0, txs.length - MAX_TRANSACTIONS_PER_WALLET);
  }
  
  // Remove transactions older than 24 hours
  const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
  const filtered = txs.filter(tx => tx.timestamp > oneDayAgo);
  recentTransactions.set(wallet, filtered);
}

function addTransaction(
  wallet: string, 
  signature: string, 
  type: string,
  status: 'pending' | 'confirmed' | 'finalized' = 'confirmed'
): void {
  if (!recentTransactions.has(wallet)) {
    recentTransactions.set(wallet, []);
  }
  
  const txs = recentTransactions.get(wallet)!;
  
  // Check if already exists
  const existing = txs.find(tx => tx.signature === signature);
  if (existing) {
    existing.status = status;
    existing.timestamp = Date.now();
    return;
  }
  
  txs.push({
    signature,
    timestamp: Date.now(),
    type,
    status,
  });
  
  cleanOldTransactions(wallet);
}

/* ------------------------------------------------------------
   WEBHOOK HANDLER
------------------------------------------------------------ */

export async function POST(request: NextRequest) {
  try {
    // Verify webhook signature (optional but recommended)
    const authHeader = request.headers.get('authorization');
    const expectedToken = process.env.HELIUS_WEBHOOK_SECRET;
    
    if (expectedToken && authHeader !== `Bearer ${expectedToken}`) {
      console.warn('[helius-webhook] Invalid authorization header');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload: HeliusWebhookPayload[] | HeliusWebhookPayload = await request.json();
    const transactions = Array.isArray(payload) ? payload : [payload];

    console.log(`[helius-webhook] Received ${transactions.length} transaction(s)`);

    for (const tx of transactions) {
      // Extract relevant data
      const signature = tx.signature;
      const feePayer = tx.feePayer;
      const type = tx.type || 'unknown';

      if (!signature || !feePayer) continue;

      // Store transaction
      addTransaction(feePayer, signature, type, 'finalized');

      // Process native transfers (for activation tracking)
      if (tx.nativeTransfers?.length) {
        for (const transfer of tx.nativeTransfers) {
          // Track sender
          addTransaction(transfer.fromUserAccount, signature, 'transfer_out', 'finalized');
          
          // Track receiver
          addTransaction(transfer.toUserAccount, signature, 'transfer_in', 'finalized');
        }
      }

      // Check for program interactions (level activations)
      if (tx.instructions?.length) {
        const programId = process.env.NEXT_PUBLIC_PROGRAM_ID;
        
        for (const ix of tx.instructions) {
          if (ix.programId === programId) {
            // This is our program interaction
            console.log(`[helius-webhook] Program interaction detected: ${signature}`);
            
            // Update activation status
            const playerWallet = feePayer;
            const currentStatus = activationStatus.get(playerWallet) || {
              isActivated: false,
              lastCheck: 0,
              levels: [],
            };
            
            currentStatus.isActivated = true;
            currentStatus.lastCheck = Date.now();
            activationStatus.set(playerWallet, currentStatus);
          }
        }
      }
    }

    return NextResponse.json({ 
      success: true, 
      processed: transactions.length 
    });

  } catch (error) {
    console.error('[helius-webhook] Error processing webhook:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/* ------------------------------------------------------------
   GET ENDPOINT - Check transaction status
------------------------------------------------------------ */

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const wallet = searchParams.get('wallet');
  const signature = searchParams.get('signature');

  if (!wallet && !signature) {
    return NextResponse.json(
      { error: 'Missing wallet or signature parameter' },
      { status: 400 }
    );
  }

  // Check specific signature
  if (signature) {
    // Search all wallets for this signature
    for (const [walletAddr, txs] of recentTransactions) {
      const tx = txs.find(t => t.signature === signature);
      if (tx) {
        return NextResponse.json({
          found: true,
          wallet: walletAddr,
          ...tx,
        });
      }
    }
    
    return NextResponse.json({
      found: false,
      status: 'pending',
      note: 'Transaction not yet received via webhook. Wait for confirmation.',
      retryAfter: 5,
    });
  }

  // Get wallet transactions
  if (wallet) {
    const txs = recentTransactions.get(wallet) || [];
    const activation = activationStatus.get(wallet);

    return NextResponse.json({
      wallet,
      transactions: txs.slice(-20), // Last 20 transactions
      activation: activation || { isActivated: false },
      cacheHit: true,
    });
  }

  return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
}

