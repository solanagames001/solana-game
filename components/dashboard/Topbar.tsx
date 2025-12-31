"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  useWallet,
  useConnection,
  type AnchorWallet,
} from "@solana/wallet-adapter-react";
import { useTranslations } from "next-intl";

import { createPlayer, toast } from "@/lib/sdk";
import { useWalletBalance } from "@/lib/sdk/hooks/useWalletBalance";
import LanguageSwitcher from "@/components/LanguageSwitcher";

/* ----------------------------------------------------
   helper: безопасная отправка событий
---------------------------------------------------- */
function fireSafe(name: string, detail?: unknown) {
  try {
    requestAnimationFrame(() =>
      window.dispatchEvent(new CustomEvent(name, { detail }))
    );
  } catch (err) {
    console.warn("[fireSafe] error:", err);
  }
}

export default function Topbar() {
  const t = useTranslations('common');
  const tToast = useTranslations('toast');
  const { connection } = useConnection();
  const wallet = useWallet();

  const [hasPlayer, setHasPlayer] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  /* ----------------------------------------------------
     hydration
  ---------------------------------------------------- */
  useEffect(() => {
    setHydrated(true);
  }, []);

  /* ----------------------------------------------------
     listen dashboard player-state
  ---------------------------------------------------- */
  useEffect(() => {
    const onPlayerState = (e: Event) => {
      const detail = (e as any).detail;
      if (typeof detail?.hasPlayer === "boolean") {
        setHasPlayer(detail.hasPlayer);
      }
    };

    const onBusy = (e: Event) => {
      const detail = (e as any).detail;
      if (typeof detail?.busy === "boolean") {
        setBusy(detail.busy);
      }
    };

    window.addEventListener("dashboard:player-state", onPlayerState);
    window.addEventListener("dashboard:tx-busy", onBusy);

    return () => {
      window.removeEventListener("dashboard:player-state", onPlayerState);
      window.removeEventListener("dashboard:tx-busy", onBusy);
    };
  }, []);



  /* ----------------------------------------------------
     wallet balance (HELIUS OPTIMIZED)
  ---------------------------------------------------- */
  const { balance } = useWalletBalance();

  /* ----------------------------------------------------
     register (через CLEAN SDK)
  ---------------------------------------------------- */
  const handleRegister = useCallback(async () => {
    if (!wallet.publicKey || !wallet.signTransaction) {
      toast.error(tToast("connectWalletFirst"));
      return;
    }

    try {
      setBusy(true);

      const aw = wallet.adapter as AnchorWallet;
      await createPlayer(connection, aw);

      fireSafe("dashboard:player-state", { hasPlayer: true });
      fireSafe("dashboard:refresh");

      toast.success(tToast("playerRegistered"));
    } catch (err) {
      console.error("[Topbar] register failed:", err);
      toast.error(tToast("registrationFailed"));
    } finally {
      setBusy(false);
    }
  }, [wallet, connection, tToast]);

  if (!hydrated) return null;

  /* ----------------------------------------------------
     RENDER
  ---------------------------------------------------- */
  return (
    <header className="h-16 sm:h-18 bg-black flex items-center justify-between px-4 sm:px-6 px-safe pt-safe text-white select-none">
      {/* LEFT */}
      <div className="flex items-center gap-3 sm:gap-4">
        {/* Logo on mobile, Home button on desktop */}
        <Link href="/" className="lg:hidden">
          <img
            src="/logo.png"
            alt="Logo"
            width={140}
            height={32}
            className="object-contain w-[140px] h-auto"
          />
        </Link>

        <Link
          href="/"
          className="hidden lg:block rounded-xl bg-[#111113] px-4 sm:px-5 py-2.5 text-xs sm:text-sm text-white/50 hover:text-white hover:bg-[#161618] transition-colors"
        >
          {t('home')}
        </Link>
      </div>

      {/* RIGHT */}
      <div className="flex items-center gap-2 sm:gap-4">
        {/* BALANCE */}
        <div className="flex items-center gap-1.5 sm:gap-3">
          <span className="hidden sm:block text-[10px] sm:text-xs text-white/30 uppercase tracking-wider">{t('balance')}</span>
          <div className="flex items-baseline gap-1">
            <span className="text-base sm:text-2xl font-semibold tracking-tight text-white">
              {balance === null ? "—" : balance.toFixed(2)}
            </span>
            <span className="text-[10px] sm:text-sm text-white/30 font-medium">SOL</span>
          </div>
        </div>

        {/* REGISTER */}
        {hasPlayer === false && (
          <button
            onClick={handleRegister}
            disabled={busy}
            aria-label={t('register')}
            className={`
              rounded-xl px-3 sm:px-5 py-2 sm:py-2.5 text-[11px] sm:text-sm font-semibold text-black
              bg-[#14F195] hover:bg-[#12d986] transition-colors
              flex items-center gap-2
              disabled:opacity-60 disabled:cursor-not-allowed
            `}
          >
            {busy && (
              <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full border-2 border-black border-t-transparent animate-spin flex-shrink-0" />
            )}
            <span>{busy ? t('registering') : t('register')}</span>
          </button>
        )}

        {/* Language Switcher */}
        <LanguageSwitcher />
      </div>
    </header>
  );
}
