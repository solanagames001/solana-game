'use client';

import { useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import WalletModal from '@/components/WalletModal';

/* ----------------------------------------------------
   Wallet Guard Component
   Protects dashboard routes - requires wallet connection
---------------------------------------------------- */

export default function WalletGuard({ children }: { children: ReactNode }) {
  const { connected, connecting } = useWallet();
  const t = useTranslations('guard');
  const tWallet = useTranslations('wallet');
  const tCommon = useTranslations('common');
  const [mounted, setMounted] = useState(false);
  const [checkComplete, setCheckComplete] = useState(false);
  const [walletModalOpen, setWalletModalOpen] = useState(false);

  // Wait for mount to prevent hydration issues
  useEffect(() => {
    setMounted(true);
  }, []);

  // Give wallet adapter time to auto-connect
  useEffect(() => {
    if (!mounted) return;
    
    // Wait a bit for auto-connect to complete
    const timer = setTimeout(() => {
      setCheckComplete(true);
    }, 500);

    // If already connected, no need to wait
    if (connected) {
      setCheckComplete(true);
      clearTimeout(timer);
    }

    return () => clearTimeout(timer);
  }, [mounted, connected]);

  // Show loading while checking wallet state
  if (!mounted || !checkComplete || connecting) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full border-2 border-[#14F195] border-t-transparent animate-spin" />
          <p className="text-white/60 text-sm">
            {connecting ? tWallet('connecting') : tCommon('loading')}
          </p>
        </div>
      </div>
    );
  }

  // If not connected, show connect screen
  if (!connected) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-md w-full text-center"
        >
          {/* Logo */}
          <Link href="/" className="inline-block mb-8">
            <Image
              src="/logo.png"
              alt="Logo"
              width={160}
              height={40}
              className="opacity-90 hover:opacity-100 transition-opacity w-[160px] h-auto"
            />
          </Link>

          {/* Card */}
          <div className="rounded-2xl bg-[#111113] border border-white/10 p-8 sm:p-10">
            {/* Lock Icon */}
            <div className="mx-auto mb-6 w-20 h-20 rounded-full bg-[#14F195]/10 border border-[#14F195]/20 flex items-center justify-center">
              <svg className="w-10 h-10 text-[#14F195]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="3" y="11" width="18" height="11" rx="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                <circle cx="12" cy="16" r="1" fill="currentColor" />
              </svg>
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-3">
              {t('title')}
            </h1>
            
            <p className="text-white/50 text-sm sm:text-base mb-8 leading-relaxed">
              {t('description')}
            </p>

            {/* Connect Button */}
            <button
              onClick={() => setWalletModalOpen(true)}
              className="w-full py-4 rounded-xl bg-[#14F195] text-black font-semibold text-base
                         hover:bg-[#0fd182] transition-all duration-200
                         shadow-[0_0_30px_rgba(20,241,149,0.3)] hover:shadow-[0_0_40px_rgba(20,241,149,0.5)]"
            >
              {tWallet('connect')}
            </button>

            {/* Wallet Modal */}
            <WalletModal open={walletModalOpen} onClose={() => setWalletModalOpen(false)} />

            {/* Supported wallets */}
            <div className="mt-6 flex items-center justify-center gap-4">
              <span className="text-white/30 text-xs">{tWallet('supported')}:</span>
              <div className="flex gap-2">
                <span className="text-white/50 text-xs px-2 py-1 rounded bg-white/5">
                  Phantom
                </span>
              </div>
            </div>
          </div>

          {/* Back to home link */}
          <Link
            href="/"
            className="inline-flex items-center gap-2 mt-6 text-white/40 hover:text-white/60 text-sm transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {t('backHome')}
          </Link>
        </motion.div>
      </div>
    );
  }

  // Wallet is connected, render children
  return <>{children}</>;
}

