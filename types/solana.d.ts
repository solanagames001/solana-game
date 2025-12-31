/* eslint-disable @typescript-eslint/no-explicit-any */

/* ========== @solana/web3.js ========== */
declare module "@solana/web3.js" {
  export class PublicKey {
    constructor(value: string | Uint8Array | Buffer);
    toBase58(): string;
    toBuffer(): Buffer;
    static findProgramAddressSync(seeds: (Buffer | Uint8Array)[], programId: PublicKey): [PublicKey, number];
    static default: PublicKey;
  }

  export class Transaction {
    add(...ix: any[]): Transaction;
    serialize(opts?: { requireAllSignatures?: boolean; verifySignatures?: boolean }): Buffer;
    // популярные поля в рантайме
    feePayer: PublicKey | undefined;
    recentBlockhash?: string;
    instructions?: any[];
  }

  export class TransactionInstruction {
    constructor(opts: any);
  }

  export class SystemProgram {
    static programId: PublicKey;
  }

  export class ComputeBudgetProgram {
    static setComputeUnitPrice(opts: any): TransactionInstruction;
    static setComputeUnitLimit(opts: any): TransactionInstruction;
  }

  export type Commitment = any;
  export type AccountMeta = any;
  export type SignatureResult = any;
  export type Context = any;

  export class Connection {
    constructor(endpoint: string, commitment?: Commitment | string);
    getAccountInfo(pubkey: PublicKey, opts?: any): Promise<any>;
    getBalance(pubkey: PublicKey): Promise<number>;
    getLatestBlockhash(commitmentOrConfig?: any): Promise<{ blockhash: string; lastValidBlockHeight?: number }>;
    sendRawTransaction(rawTx: Uint8Array, opts?: any): Promise<string>;
    confirmTransaction(strategy: any, commitment?: any): Promise<any>;
    onSignature(signature: string, cb: (result: SignatureResult, context: Context) => void, opts?: any): Promise<number>;
    removeSignatureListener(id: number): Promise<void>;
    getSignatureStatuses(signatures: string[], opts?: any): Promise<any>;
    simulateTransaction(tx: Transaction, opts?: { replaceRecentBlockhash?: boolean; sigVerify?: boolean }): Promise<any>;
    getTransaction(signature: string, opts?: any): Promise<any>;
  }

  export const clusterApiUrl: (cluster: string) => string;
}

/* ========== @coral-xyz/anchor ========== */
declare module "@coral-xyz/anchor" {
  export const web3: any;
  export const utils: any;

  export class Program {
    constructor(idl: any, programId: any, provider: any);
    addEventListener(name: string, cb: Function): Promise<number>;
    removeEventListener(id: number): Promise<void>;
  }

  export class AnchorProvider {
    constructor(connection: any, wallet: any, opts?: any);
  }

  export class AnchorError extends Error {
    error: {
      code: { number: number };
      errorMessage?: string;
    };
    static parse(logs: string[]): AnchorError | null;
  }

  export interface Wallet {
    publicKey: any;
    signTransaction: any;
    signAllTransactions: any;
  }

  export interface AnchorWallet extends Wallet {}
  export type Idl = any;
}

/* ========== @solana/wallet-adapter-base ========== */
declare module "@solana/wallet-adapter-base" {
  export const WalletAdapterNetwork: any;
  export type WalletAdapterNetwork = any;       // чтобы можно было использовать как тип
  export type WalletName = any;
  export const WalletReadyState: any;
}

/* ========== @solana/wallet-adapter-react ========== */
declare module "@solana/wallet-adapter-react" {
  export const ConnectionProvider: any;
  export const WalletProvider: any;

  export const useWallet: any;
  export const useConnection: any;
  export const useAnchorWallet: any;

  export type Wallet = any;
  export type AnchorWallet = any;
}

/* ========== реэкспортные обёртки ========== */
declare module "@solana/wallet-adapter-react-ui";
declare module "@solana/wallet-adapter-wallets";
