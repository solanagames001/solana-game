"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "@/lib/sdk/toast";

/* ------------------------------------------------------------ */
/* Skeleton                                                      */
/* ------------------------------------------------------------ */

function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`relative overflow-hidden bg-[#1a1a1a] ${className}`}
      style={{ borderRadius: "inherit" }}
    >
      <div
        className="absolute inset-0 -translate-x-full animate-[shimmer_0.8s_infinite]"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.06) 50%, transparent 100%)",
        }}
      />
    </div>
  );
}

/* ------------------------------------------------------------ */
/* Page                                                          */
/* ------------------------------------------------------------ */

export default function TelegramBotsPage() {
  const t = useTranslations('telegramPage');
  const tToast = useTranslations('toast');
  const [isLoading, setIsLoading] = useState(true);
  const [localToast, setLocalToast] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!localToast) return;
    const t = setTimeout(() => setLocalToast(null), 2000);
    return () => clearTimeout(t);
  }, [localToast]);

  const copyLink = useCallback(async (link: string) => {
    try {
      await navigator.clipboard.writeText(link);
      toast.success(tToast('linkCopied'));
      setLocalToast("Copied");
    } catch {
      toast.error(tToast('copyFailed'));
    }
  }, [tToast]);

  /* SKELETON */
  if (isLoading) {
    return (
      <div className="min-h-screen bg-black space-y-4 sm:space-y-6 text-white">
        <header>
          <Skeleton className="h-8 sm:h-10 w-32 sm:w-44 rounded-lg mb-2" />
          <Skeleton className="h-3 sm:h-4 w-48 sm:w-64 rounded" />
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="rounded-2xl bg-[#111113] p-4 sm:p-6">
              <Skeleton className="h-10 sm:h-12 w-10 sm:w-12 rounded-xl mb-4" />
              <Skeleton className="h-5 sm:h-6 w-32 sm:w-40 rounded mb-2" />
              <Skeleton className="h-3 sm:h-4 w-full rounded mb-1" />
              <Skeleton className="h-3 sm:h-4 w-3/4 rounded mb-4" />
              <Skeleton className="h-9 sm:h-10 w-full rounded-lg" />
            </div>
          ))}
        </div>

        <section className="rounded-2xl bg-[#111113] p-4 sm:p-6">
          <Skeleton className="h-5 sm:h-6 w-40 sm:w-52 rounded mb-4" />
          <div className="space-y-2">
            <Skeleton className="h-3 sm:h-4 w-full rounded" />
            <Skeleton className="h-3 sm:h-4 w-5/6 rounded" />
            <Skeleton className="h-3 sm:h-4 w-4/5 rounded" />
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black space-y-4 sm:space-y-6 text-white">
      {/* HEADER */}
      <header>
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">{t('title')}</h1>
        <p className="text-[10px] sm:text-xs text-white/50 mt-0.5">
          {t('subtitle')}
        </p>
      </header>

      {/* TELEGRAM CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        {/* COMMUNITY GROUP */}
        <div className="rounded-2xl bg-[#111113] p-4 sm:p-6">
          <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-[#0d0d0f] flex items-center justify-center mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-[#14F195] sm:w-7 sm:h-7">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>

          <h2 className="text-base sm:text-lg font-semibold text-white mb-1">{t('communityGroup')}</h2>
          <p className="text-[10px] sm:text-xs text-white/50 mb-4 leading-relaxed">
            {t('communityDesc')}
          </p>

          <div className="space-y-2">
            <a
              href="https://t.me/+x2jEqV03TFkyZTll"
              target="_blank"
              rel="noreferrer"
              className="block w-full rounded-lg bg-[#14F195] py-2.5 sm:py-3 text-center text-xs sm:text-sm font-semibold text-black hover:bg-[#12d986] transition-colors"
            >
              {t('joinGroup')}
            </a>
            
            <button
              onClick={() => copyLink("https://t.me/+x2jEqV03TFkyZTll")}
              className="w-full rounded-lg bg-[#0d0d0f] py-2 sm:py-2.5 text-[10px] sm:text-xs text-white/60 hover:bg-[#161618] hover:text-white transition-colors"
            >
              {t('copyLink')}
            </button>
          </div>
        </div>

        {/* SUPPORT */}
        <div className="rounded-2xl bg-[#111113] p-4 sm:p-6">
          <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-[#0d0d0f] flex items-center justify-center mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-[#14F195] sm:w-7 sm:h-7">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>

          <h2 className="text-base sm:text-lg font-semibold text-white mb-1">{t('support')}</h2>
          <p className="text-[10px] sm:text-xs text-white/50 mb-4 leading-relaxed">
            {t('supportDesc')}
          </p>

          <div className="space-y-2">
            <a
              href="https://t.me/SolanaGame_Administration"
              target="_blank"
              rel="noreferrer"
              className="block w-full rounded-lg bg-[#14F195] py-2.5 sm:py-3 text-center text-xs sm:text-sm font-semibold text-black hover:bg-[#12d986] transition-colors"
            >
              {t('contactSupport')}
            </a>
            
            <button
              onClick={() => copyLink("https://t.me/SolanaGame_Administration")}
              className="w-full rounded-lg bg-[#0d0d0f] py-2 sm:py-2.5 text-[10px] sm:text-xs text-white/60 hover:bg-[#161618] hover:text-white transition-colors"
            >
              {t('copyLink')}
            </button>
          </div>
        </div>
      </div>

      {/* WHAT YOU GET */}
      <section className="rounded-2xl bg-[#111113] p-4 sm:p-6">
        <div className="text-[10px] sm:text-xs uppercase tracking-wider text-white/40 mb-3 sm:mb-4">
          {t('whatYouGet')}
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
          <div className="rounded-xl bg-[#0d0d0f] p-3 sm:p-4">
            <div className="text-xs sm:text-sm font-medium text-white mb-1">{t('realTimeUpdates')}</div>
            <p className="text-[10px] sm:text-xs text-white/50">
              {t('realTimeUpdatesDesc')}
            </p>
          </div>
          
          <div className="rounded-xl bg-[#0d0d0f] p-3 sm:p-4">
            <div className="text-xs sm:text-sm font-medium text-white mb-1">{t('communitySupport')}</div>
            <p className="text-[10px] sm:text-xs text-white/50">
              {t('communitySupportDesc')}
            </p>
          </div>
          
          <div className="rounded-xl bg-[#0d0d0f] p-3 sm:p-4">
            <div className="text-xs sm:text-sm font-medium text-white mb-1">{t('directAccess')}</div>
            <p className="text-[10px] sm:text-xs text-white/50">
              {t('directAccessDesc')}
            </p>
          </div>
          
          <div className="rounded-xl bg-[#0d0d0f] p-3 sm:p-4">
            <div className="text-xs sm:text-sm font-medium text-white mb-1">{t('networkGrowth')}</div>
            <p className="text-[10px] sm:text-xs text-white/50">
              {t('networkGrowthDesc')}
            </p>
          </div>
        </div>
      </section>

      {/* TOAST */}
      {localToast && (
        <div className="fixed bottom-4 left-1/2 z-[1401] -translate-x-1/2 rounded-xl bg-[#14F195] px-4 py-2 text-xs sm:text-sm text-black font-medium shadow-[0_0_20px_rgba(20,241,149,0.5)]">
          {localToast}
        </div>
      )}
    </div>
  );
}
