"use client";

import Link from "next/link";
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";

import { useWallet } from "@solana/wallet-adapter-react";
import { useTranslations } from 'next-intl';
import { useToast } from "@/lib/hooks/useToast";
import { usePlayer } from "@/lib/sdk/hooks/usePlayer";

import WalletModal from "@/components/WalletModal";
import MobileMenu from "@/components/MobileMenu";
import LanguageSwitcher from "@/components/LanguageSwitcher";

/* ---------------------------------------------------- */
/* Header — Premium Dark Design                        */
/* ---------------------------------------------------- */

export default function Header() {
  const router = useRouter();
  const pathname = usePathname() || "";
  const t = useTranslations('header');
  const tCommon = useTranslations('common');
  const toast = useToast();

  const { connected, connecting, publicKey, disconnect } = useWallet();
  const { address, playerExists, busyRegister, register } = usePlayer();

  const [mounted, setMounted] = useState(false);
  const [walletModalOpen, setWalletModalOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  /* ---------------- callbacks ---------------- */

  const copyAddress = useCallback(async () => {
    if (!address) return;
    try {
      await navigator.clipboard.writeText(address);
      toast.success("addressCopied");
    } catch {
      toast.error("copyFailed");
    }
  }, [address, toast]);

  const safeDisconnect = useCallback(async () => {
    try {
      await disconnect();
      // Очищаем сохраненный кошелек при отключении
      if (typeof window !== 'undefined') {
        try {
          localStorage.removeItem('sg-wallet-name.v1:devnet');
          localStorage.removeItem('sg-wallet-name.v1:mainnet-beta');
          localStorage.removeItem('sg-wallet-name.v1:testnet');
        } catch {}
      }
    } catch {}
  }, [disconnect]);

  const onRegister = useCallback(async () => {
    if (!connected || !publicKey) {
      setWalletModalOpen(true);
      return;
    }
    try {
      // creatingProfile notification is shown in createPlayer function
      const sig = await register();
      if (!sig) return;
      toast.success("profileCreated");
      router.push("/dashboard");
    } catch (err) {
      // Errors (including insufficient funds) are already handled in createPlayer
      // with toast notifications, so we just log here
      console.error("[Header.onRegister]", err);
    }
  }, [connected, publicKey, register, router, toast]);

  const goDashboard = useCallback(() => {
    router.push("/dashboard");
  }, [router]);

  /* ---------------- routes ---------------- */

  const firstSegment = pathname.split("/")[1];
  const CABINET_ROUTES = new Set([
    "dashboard",
    "levels",
    "history",
    "information",
    "partner-bonus",
    "telegram-bots",
    "promo",
  ]);

  // Hide header on dashboard routes
  if (CABINET_ROUTES.has(firstSegment)) return null;

  // Show minimal header during SSR/hydration (logo only)
  if (!mounted) {
    return (
      <header className="sticky top-0 z-50 bg-black/80 backdrop-blur-xl border-b border-white/5 pt-safe">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 px-safe">
          <Link href="/" aria-label="Home" className="flex items-center">
            <Image
              src="/logo.png"
              alt="Solana Game"
              width={160}
              height={40}
              priority
              loading="eager"
              className="opacity-90 w-[160px] h-auto"
            />
          </Link>
          <div className="w-32 h-10" /> {/* Placeholder for buttons */}
        </div>
      </header>
    );
  }

  /* ---------------- render logic ---------------- */

  const showConnecting = connecting;
  const showConnect = !connected && !connecting;
  const showRegister = connected && playerExists === false;
  // Show Dashboard immediately when connected (even while playerExists is loading)
  const showDashboard = connected && playerExists !== false;

  /* ---------------- render ---------------- */

  return (
    <>
      <header className="sticky top-0 z-50 bg-black/80 backdrop-blur-xl border-b border-white/5 pt-safe">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 px-safe">
          {/* Logo */}
          <Link href="/" aria-label="Home" className="flex items-center">
            <Image
              src="/logo.png"
              alt="Solana Game"
              width={160}
              height={40}
              priority
              loading="eager"
              className="opacity-90 hover:opacity-100 transition-opacity w-[160px] h-auto"
            />
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden sm:flex items-center gap-3">
            {/* Connecting State */}
            {showConnecting && (
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-black">
                <div className="w-4 h-4 rounded-full border-2 border-[#14F195] border-t-transparent animate-spin" />
                <span className="text-sm text-white/60">{t('connecting')}</span>
              </div>
            )}

            {/* Connect Button */}
            {showConnect && (
              <button
                onClick={() => setWalletModalOpen(true)}
                className="px-5 py-2.5 rounded-lg bg-black text-[#14F195] text-sm font-medium
                           border border-[#14F195]/30 hover:border-[#14F195]/60 transition-all duration-200
                           hover:shadow-[0_0_20px_rgba(20,241,149,0.15)]"
              >
                {t('connectWallet')}
              </button>
            )}

            {/* Register Button */}
            {showRegister && (
              <button
                onClick={onRegister}
                disabled={busyRegister}
                className="px-5 py-2.5 rounded-lg bg-black text-[#14F195] text-sm font-medium
                           border border-[#14F195]/30 hover:border-[#14F195]/60 transition-all duration-200
                           hover:shadow-[0_0_20px_rgba(20,241,149,0.15)]
                           disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {busyRegister ? (
                  <span className="flex items-center gap-2">
                    <div className="w-3.5 h-3.5 rounded-full border-2 border-[#14F195] border-t-transparent animate-spin" />
                    {tCommon('registering')}
                  </span>
                ) : (
                  tCommon('register')
                )}
              </button>
            )}

            {/* Dashboard Button - shows immediately when connected */}
            {showDashboard && (
              <button
                onClick={goDashboard}
                className="px-4 py-2.5 rounded-lg bg-black text-white text-sm font-medium
                           hover:bg-white/5 transition-colors"
              >
                {t('dashboard')}
              </button>
            )}

            {/* Wallet Address & Disconnect */}
            {connected && address && (
              <div className="flex items-center gap-1 pl-3 pr-1.5 py-1.5 rounded-lg bg-black">
                {/* Green indicator */}
                <div className="w-2 h-2 rounded-full bg-[#14F195] animate-pulse mr-1" />
                
                {/* Address */}
                <button
                  onClick={copyAddress}
                  className="text-xs font-mono text-[#14F195] hover:text-white transition-colors"
                  title="Click to copy"
                >
                  {address}
                </button>

                {/* Disconnect */}
                <button
                  onClick={safeDisconnect}
                  className="ml-2 p-1.5 rounded-md bg-white/5 hover:bg-white/10 transition-colors group"
                  title="Disconnect"
                >
                  <svg 
                    className="w-3.5 h-3.5 text-white/40 group-hover:text-white/70 transition-colors" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2"
                  >
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" strokeLinecap="round" strokeLinejoin="round" />
                    <polyline points="16 17 21 12 16 7" strokeLinecap="round" strokeLinejoin="round" />
                    <line x1="21" y1="12" x2="9" y2="12" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
            )}

            {/* Language Switcher - after disconnect button */}
            <LanguageSwitcher />
          </nav>

          {/* Mobile: Language Switcher + Menu Button */}
          <div className="sm:hidden flex items-center gap-2">
            {/* Language Switcher */}
            <LanguageSwitcher />
            
            {/* Menu Button */}
            <button
              type="button"
              className="h-10 w-10 rounded-lg bg-black flex items-center justify-center
                         hover:bg-white/5 transition-colors active:scale-95 border border-white/10"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label="Open menu"
            >
              <svg 
                width="18" 
                height="18" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="white" 
                strokeWidth="2" 
                strokeLinecap="round"
              >
                <line x1="4" y1="6" x2="20" y2="6" />
                <line x1="4" y1="12" x2="20" y2="12" />
                <line x1="4" y1="18" x2="20" y2="18" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      <MobileMenu
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        onRegister={onRegister}
        onDashboard={goDashboard}
        onConnect={() => setWalletModalOpen(true)}
        onDisconnect={safeDisconnect}
        connected={connected}
        connecting={connecting}
        hasPlayer={playerExists === true}
        registerLoading={busyRegister}
        address={address}
      />

      <WalletModal
        open={walletModalOpen}
        onClose={() => setWalletModalOpen(false)}
      />
    </>
  );
}
