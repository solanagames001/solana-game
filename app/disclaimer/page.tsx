'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

/* ----------------------------------------------------
   Skeleton Components
---------------------------------------------------- */
function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      className={`relative overflow-hidden bg-[#1a1a1a] ${className}`}
      style={{ borderRadius: 'inherit' }}
    >
      <div
        className="absolute inset-0 -translate-x-full animate-[shimmer_0.8s_infinite]"
        style={{
          background:
            'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.06) 50%, transparent 100%)',
        }}
      />
    </div>
  );
}

function PageSkeleton() {
  return (
    <div className="min-h-screen bg-black p-4 sm:p-6">
      <div className="max-w-4xl mx-auto">
        <Skeleton className="h-8 w-32 rounded-lg mb-4" />
        <Skeleton className="h-12 w-80 rounded-lg mb-4" />
        <Skeleton className="h-5 w-full max-w-xl rounded mb-8" />
        
        <div className="space-y-6">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="rounded-2xl bg-[#111113] p-6">
              <Skeleton className="h-6 w-48 rounded mb-4" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-full rounded" />
                <Skeleton className="h-4 w-full rounded" />
                <Skeleton className="h-4 w-3/4 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ----------------------------------------------------
   Disclaimer Sections (now using translations)
---------------------------------------------------- */
function getDisclaimerSections(t: any) {
  return [
    {
      title: t('sections.natureOfPlatform.title'),
      content: t('sections.natureOfPlatform.content'),
    },
    {
      title: t('sections.noFinancialAdvice.title'),
      content: t('sections.noFinancialAdvice.content'),
    },
    {
      title: t('sections.riskAcknowledgment.title'),
      content: t('sections.riskAcknowledgment.content'),
    },
    {
      title: t('sections.noGuarantees.title'),
      content: t('sections.noGuarantees.content'),
    },
    {
      title: t('sections.yourResponsibilities.title'),
      content: t('sections.yourResponsibilities.content'),
    },
    {
      title: t('sections.jurisdictionalRestrictions.title'),
      content: t('sections.jurisdictionalRestrictions.content'),
    },
    {
      title: t('sections.thirdPartyServices.title'),
      content: t('sections.thirdPartyServices.content'),
    },
    {
      title: t('sections.limitationOfLiability.title'),
      content: t('sections.limitationOfLiability.content'),
    },
    {
      title: t('sections.modifications.title'),
      content: t('sections.modifications.content'),
    },
    {
      title: t('sections.contact.title'),
      content: t('sections.contact.content'),
    },
  ];
}

/* ----------------------------------------------------
   Main Component
---------------------------------------------------- */
export default function DisclaimerPage() {
  const t = useTranslations('disclaimer');
  const tDocs = useTranslations('docs');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return <PageSkeleton />;
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-black/80 backdrop-blur-md border-b border-white/10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="p-2 rounded-lg border border-white/10 hover:bg-white/5 transition-colors"
            >
              <svg className="w-5 h-5 text-white/60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
            <span className="text-white/80 font-medium text-sm sm:text-base">Legal</span>
          </div>

          <Link
            href="/docs"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#111113] border border-white/10 text-white/70 text-sm font-medium hover:bg-[#161618] hover:text-white transition-colors"
          >
            <span>{tDocs('title')}</span>
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Page Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8 sm:mb-12"
        >
          <span className="text-[10px] sm:text-xs uppercase tracking-[0.2em] text-[#9945FF]/60 font-medium">
            Legal
          </span>
          <h1 className="mt-2 text-3xl sm:text-4xl font-bold text-white">
            {t('title')}
          </h1>
          <p className="mt-4 text-white/50 text-sm sm:text-base max-w-2xl">
            {t('intro')}
          </p>
          
          {/* Last updated */}
          <div className="mt-4 flex items-center gap-2 text-xs text-white/30">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 6v6l4 2" strokeLinecap="round" />
            </svg>
            <span>{t('lastUpdated')}</span>
          </div>
        </motion.div>

        {/* Warning Banner */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mb-8 rounded-2xl bg-[#9945FF]/10 border border-[#9945FF]/20 p-6"
        >
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-[#9945FF]/20 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-[#9945FF]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 9v4M12 17h.01" strokeLinecap="round" />
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              </svg>
            </div>
            <div>
              <h3 className="text-white font-semibold mb-2">{t('importantNotice')}</h3>
              <p className="text-white/60 text-sm leading-relaxed">
                {t('importantNoticeText')}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Disclaimer Sections */}
        <div className="space-y-6">
          {getDisclaimerSections(t).map((section, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 + i * 0.05 }}
              className="rounded-2xl bg-[#111113] border border-white/5 p-6 sm:p-8"
            >
              <h2 className="text-lg sm:text-xl font-semibold text-white mb-4 flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-sm text-white/40">
                  {i + 1}
                </span>
                {section.title}
              </h2>
              <div className="text-white/60 text-sm sm:text-base leading-relaxed whitespace-pre-line">
                {section.content}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Acceptance Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.8 }}
          className="mt-12 rounded-2xl bg-[#14F195]/10 border border-[#14F195]/20 p-6 sm:p-8 text-center"
        >
          <div className="w-16 h-16 mx-auto rounded-full bg-[#14F195]/20 flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-[#14F195]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">{t('acceptanceTitle')}</h3>
          <p className="text-white/60 text-sm max-w-lg mx-auto mb-6">
            {t('acceptanceText')}
          </p>
          <Link
            href="/levels"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#14F195] text-black font-semibold hover:bg-[#0fd182] transition-colors"
          >
            <span>{t('understand')}</span>
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        </motion.div>

        {/* Footer */}
        <div className="mt-12 pt-8 border-t border-white/5 text-center">
          <p className="text-white/30 text-xs">
            Solana Program X3 — Decentralized Matrix on Solana Blockchain
          </p>
        </div>
      </main>

      {/* Shimmer animation */}
      <style jsx global>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
}

