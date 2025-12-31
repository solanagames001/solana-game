"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";

import {
  ConnectionProvider,
  WalletProvider,
  useWallet,
} from "@solana/wallet-adapter-react";

import { WalletModalProvider } from "@/lib/providers/WalletModalProvider";

// Импортируем адаптеры для популярных Solana-кошельков
// ВАЖНО: На мобильных устройствах явные адаптеры необходимы!
// Wallet Standard может не работать в мобильных браузерах и in-app браузерах
import { PhantomWalletAdapter } from "@solana/wallet-adapter-phantom";
import { SolflareWalletAdapter } from "@solana/wallet-adapter-solflare";
import { BackpackWalletAdapter } from "@solana/wallet-adapter-backpack";
import { LedgerWalletAdapter } from "@solana/wallet-adapter-ledger";
import { ExodusWalletAdapter } from "@solana/wallet-adapter-exodus";

import { CLUSTER } from "@/lib/sdk/pda";
import { captureRefFromUrl } from "@/lib/sdk/referral";
import { HELIUS_CONFIG, RPCTracker } from "@/lib/sdk/helius";

import Toaster from "@/components/Toaster";
import TxOverlayGlobal from "@/components/TxOverlayGlobal";
import ReferralNotifications from "@/components/ReferralNotifications";

type Props = { children: ReactNode };

/* ------------------------------------------------------------
   Wallet Persistence Key (cluster-scoped)
------------------------------------------------------------ */
const WALLET_NAME_KEY = `sg-wallet-name.v1:${CLUSTER}`;

/* ------------------------------------------------------------
   WalletPersistenceWrapper - сохраняет выбор кошелька
------------------------------------------------------------ */
function WalletPersistenceWrapper({ children }: { children: ReactNode }) {
  const { wallet, connected } = useWallet();

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Сохраняем кошелек при подключении
    if (wallet?.adapter?.name && connected) {
      try {
        localStorage.setItem(WALLET_NAME_KEY, wallet.adapter.name);
      } catch (e) {
        // Игнорируем ошибки localStorage (приватный режим и т.д.)
      }
    }
  }, [wallet?.adapter?.name, connected]);

  return <>{children}</>;
}

export default function Providers({ children }: Props) {
  /* ------------------------------------------------------------
     Mount guard (SSR / mobile safe)
  ------------------------------------------------------------ */
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  /* ------------------------------------------------------------
     RPC endpoint (HELIUS OPTIMIZED)
     
     Priority:
     1. Helius RPC (if API key provided)
     2. NEXT_PUBLIC_SOLANA_RPC (custom RPC)
     3. Public Solana RPC (fallback)
  ------------------------------------------------------------ */
  const endpoint = useMemo(() => {
    // OPTIMIZATION: Use Helius config for primary endpoint
    // This ensures all connections use the optimized endpoint
    if (CLUSTER === 'mainnet-beta') {
      // Use Helius primary endpoint (handles fallback internally)
      return HELIUS_CONFIG.endpoints.primary;
    }
    
    switch (CLUSTER) {
      case "testnet":
        const testnetRpc = process.env.NEXT_PUBLIC_SOLANA_RPC?.trim();
        return testnetRpc || "https://api.testnet.solana.com";
      default:
        const devnetRpc = process.env.NEXT_PUBLIC_SOLANA_RPC?.trim();
        return devnetRpc || "https://api.devnet.solana.com";
    }
  }, []);

  /* ------------------------------------------------------------
     Initialize RPC Tracker (for monitoring)
  ------------------------------------------------------------ */
  useEffect(() => {
    if (mounted && CLUSTER === 'mainnet-beta') {
      RPCTracker.init();
      
      // Log metrics every 5 minutes in development
      if (process.env.NODE_ENV !== 'production') {
        const metricsInterval = setInterval(() => {
          RPCTracker.logStats();
        }, 5 * 60 * 1000);
        
        return () => {
          clearInterval(metricsInterval);
          RPCTracker.destroy();
        };
      }
    }
  }, [mounted]);

  /* ------------------------------------------------------------
     Wallet adapters
     
     ВАЖНО: На мобильных устройствах явные адаптеры необходимы!
     - Desktop: Wallet Standard может авто-регистрировать кошельки
     - Mobile: Wallet Standard может не работать в мобильных браузерах
     - In-app браузеры (Telegram, Discord): требуют явные адаптеры
     
     Wallet Adapter автоматически дедуплицирует кошельки, если они
     уже зарегистрированы через Wallet Standard, поэтому дублирования не будет.
  ------------------------------------------------------------ */
  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
      new BackpackWalletAdapter(),
      new LedgerWalletAdapter(),
      new ExodusWalletAdapter(),
    ],
    []
  );

  /* ------------------------------------------------------------
     Referral capture (?ref=...)
  ------------------------------------------------------------ */
  useEffect(() => {
    if (!mounted) return;
    try {
      captureRefFromUrl();
    } catch {
      /* noop */
    }
  }, [mounted]);

  if (!mounted) return null;

  /* ------------------------------------------------------------
     Wallet error handler
     Фильтруем внутренние ошибки расширений кошельков
  ------------------------------------------------------------ */
  const handleWalletError = (error: Error) => {
    // Игнорируем внутренние ошибки расширений кошельков
    // Эти ошибки не влияют на работу приложения
    const ignoredErrors = [
      "provider injection",
      "Could not establish connection",
      "Receiving end does not exist",
      "User rejected",
      "WalletNotSelectedError",  // Возникает при autoConnect до выбора кошелька
      "WalletNotReadyError",     // Кошелек еще не готов
    ];
    
    const errorMessage = error?.message || error?.name || String(error);
    const shouldIgnore = ignoredErrors.some(msg => 
      errorMessage.toLowerCase().includes(msg.toLowerCase())
    );
    
    if (!shouldIgnore) {
      console.warn("[WalletProvider]", error);
    }
  };


  /* ------------------------------------------------------------
     PROVIDERS
  ------------------------------------------------------------ */
  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider
        wallets={wallets}
        autoConnect={true}
        onError={handleWalletError}
      >
        <WalletPersistenceWrapper>
          <WalletModalProvider>
            <TxOverlayGlobal />
            <Toaster />
            <ReferralNotifications />
            {children}
          </WalletModalProvider>
        </WalletPersistenceWrapper>
      </WalletProvider>
    </ConnectionProvider>
  );
}
