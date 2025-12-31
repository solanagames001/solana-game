"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";

/* ------------------------------------------------------------ */
/* Constants from on-chain program                              */
/* ------------------------------------------------------------ */

const LEVEL_PRICES_SOL = [
  0.05, 0.18, 0.36, 0.68, 1.10, 1.55, 2.10, 2.65,
  3.25, 3.90, 4.65, 5.45, 6.40, 7.35, 8.00, 8.70
];

const PAYOUTS = [
  { roleKey: "youOwner", pct: 60, descKey: "yourEarnings" },
  { roleKey: "referrerL1", pct: 13, descKey: "directInviter" },
  { roleKey: "referrerL2", pct: 8, descKey: "inviterOfInviter" },
  { roleKey: "referrerL3", pct: 5, descKey: "thirdLevelUpline" },
  { roleKey: "platform", pct: 14, descKey: "projectDevelopment" },
];

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

export default function InformationPage() {
  const t = useTranslations('informationPage');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  /* SKELETON */
  if (isLoading) {
    return (
      <div className="min-h-screen bg-black space-y-4 sm:space-y-6 text-white">
        <header>
          <Skeleton className="h-8 sm:h-10 w-40 sm:w-56 rounded-lg mb-2" />
          <Skeleton className="h-3 sm:h-4 w-64 sm:w-80 rounded" />
        </header>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="rounded-xl bg-[#111113] p-3 sm:p-4">
              <Skeleton className="h-2 sm:h-3 w-12 sm:w-16 rounded mb-2" />
              <Skeleton className="h-5 sm:h-6 w-10 sm:w-14 rounded" />
            </div>
          ))}
        </div>

        {[...Array(4)].map((_, i) => (
          <section key={i} className="rounded-2xl bg-[#111113] p-4 sm:p-6">
            <Skeleton className="h-5 sm:h-6 w-32 sm:w-48 rounded mb-4" />
            <div className="space-y-2">
              <Skeleton className="h-3 sm:h-4 w-full rounded" />
              <Skeleton className="h-3 sm:h-4 w-3/4 rounded" />
              <Skeleton className="h-3 sm:h-4 w-5/6 rounded" />
            </div>
          </section>
        ))}
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

      {/* QUICK STATS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        <div className="rounded-xl bg-[#111113] p-3 sm:p-4">
          <div className="text-[9px] sm:text-[10px] uppercase tracking-wider text-white/40">{t('totalLevels')}</div>
          <div className="mt-1 text-lg sm:text-xl font-semibold text-white">16</div>
        </div>
        <div className="rounded-xl bg-[#111113] p-3 sm:p-4">
          <div className="text-[9px] sm:text-[10px] uppercase tracking-wider text-white/40">{t('slotsPerCycle')}</div>
          <div className="mt-1 text-lg sm:text-xl font-semibold text-white">3</div>
        </div>
        <div className="rounded-xl bg-[#111113] p-3 sm:p-4">
          <div className="text-[9px] sm:text-[10px] uppercase tracking-wider text-white/40">{t('yourPayout')}</div>
          <div className="mt-1 text-lg sm:text-xl font-semibold text-white">60%</div>
        </div>
        <div className="rounded-xl bg-[#111113] p-3 sm:p-4">
          <div className="text-[9px] sm:text-[10px] uppercase tracking-wider text-white/40">{t('network')}</div>
          <div className="mt-1 text-lg sm:text-xl font-semibold text-white">Solana</div>
        </div>
      </div>

      {/* WHAT IS THIS */}
      <Section title={t('whatIsThis')}>
        <p className="text-[11px] sm:text-sm text-white/70 leading-relaxed">
          {t('whatIsThisDesc')}
        </p>
        
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
          <div className="rounded-xl bg-[#0d0d0f] p-3 sm:p-4">
            <div className="text-xs sm:text-sm font-medium text-white mb-1">{t('transparent')}</div>
            <p className="text-[10px] sm:text-xs text-white/50">
              {t('transparentDesc')}
            </p>
          </div>
          <div className="rounded-xl bg-[#0d0d0f] p-3 sm:p-4">
            <div className="text-xs sm:text-sm font-medium text-white mb-1">{t('automatic')}</div>
            <p className="text-[10px] sm:text-xs text-white/50">
              {t('automaticDesc')}
            </p>
          </div>
          <div className="rounded-xl bg-[#0d0d0f] p-3 sm:p-4">
            <div className="text-xs sm:text-sm font-medium text-white mb-1">{t('unlimited')}</div>
            <p className="text-[10px] sm:text-xs text-white/50">
              {t('unlimitedDesc')}
            </p>
          </div>
        </div>
      </Section>

      {/* HOW IT WORKS - SIMPLE STEPS */}
      <Section title={t('simpleProcess')}>
        <div className="space-y-3 sm:space-y-4">
          <Step number={1} title={t('step1Title')}>
            {t('step1Desc')}
          </Step>
          
          <Step number={2} title={t('step2Title')}>
            {t('step2Desc')}
          </Step>
          
          <Step number={3} title={t('step3Title')}>
            {t('step3Desc')}
          </Step>
          
          <Step number={4} title={t('step4Title')}>
            {t('step4Desc')}
          </Step>
        </div>
      </Section>

      {/* PAYOUT DISTRIBUTION */}
      <Section title={t('whereMoneyGoes')}>
        <p className="text-[11px] sm:text-sm text-white/70 mb-4">
          {t('moneyGoesDesc')}
        </p>
        
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-3">
          {PAYOUTS.map((p, i) => (
            <div key={p.roleKey} className="rounded-xl bg-[#0d0d0f] p-3 sm:p-4 text-center">
              <div className="text-[9px] sm:text-[10px] uppercase tracking-wider text-white/40">
                {t(p.roleKey)}
              </div>
              <div className={`mt-1 text-lg sm:text-xl font-semibold ${i === 0 ? "text-[#14F195]" : "text-white"}`}>
                {p.pct}%
              </div>
              <div className="mt-1 text-[9px] sm:text-[10px] text-white/40">
                {t(p.descKey)}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 rounded-xl bg-[#0d0d0f] p-3 sm:p-4">
          <div className="text-xs sm:text-sm font-medium text-white mb-2">{t('exampleCalculation')}</div>
          <p className="text-[10px] sm:text-xs text-white/50">
            {t('exampleDesc')}
          </p>
          <p className="text-[11px] sm:text-sm text-white/70 mt-2">
            {t('youReceive')} <span className="text-[#14F195] font-medium">0.05 × 60% × 3 = 0.09 SOL</span> {t('perCycle')}
          </p>
        </div>
      </Section>

      {/* LEVEL PRICES */}
      <Section title={t('levelPrices')}>
        <p className="text-[11px] sm:text-sm text-white/70 mb-4">
          {t('levelPricesDesc')}
        </p>
        
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5 sm:gap-2">
          {LEVEL_PRICES_SOL.map((price, i) => (
            <div key={i} className="rounded-lg bg-[#0d0d0f] p-2 sm:p-3 text-center">
              <div className="text-[10px] sm:text-xs font-medium text-white/60">
                L{String(i + 1).padStart(2, "0")}
              </div>
              <div className="text-[10px] sm:text-xs font-mono text-white mt-0.5">
                {price.toFixed(2)}
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-3 text-[10px] sm:text-xs text-white/40 text-center">
          {t('allPricesInSol')}
        </div>
      </Section>

      {/* REFERRAL SYSTEM */}
      <Section title={t('referralBonuses')}>
        <p className="text-[11px] sm:text-sm text-white/70 mb-4">
          {t('referralBonusesDesc')}
        </p>
        
        <div className="space-y-2 sm:space-y-3">
          <div className="flex items-center justify-between rounded-xl bg-[#0d0d0f] p-3 sm:p-4">
            <div>
              <div className="text-xs sm:text-sm font-medium text-white">{t('directReferral')}</div>
              <div className="text-[10px] sm:text-xs text-white/40">{t('peopleInvitedDirectly')}</div>
            </div>
            <div className="text-lg sm:text-xl font-semibold text-white">13%</div>
          </div>
          
          <div className="flex items-center justify-between rounded-xl bg-[#0d0d0f] p-3 sm:p-4">
            <div>
              <div className="text-xs sm:text-sm font-medium text-white">{t('secondLine')}</div>
              <div className="text-[10px] sm:text-xs text-white/40">{t('peopleInvitedByReferrals')}</div>
            </div>
            <div className="text-lg sm:text-xl font-semibold text-white">8%</div>
          </div>
          
          <div className="flex items-center justify-between rounded-xl bg-[#0d0d0f] p-3 sm:p-4">
            <div>
              <div className="text-xs sm:text-sm font-medium text-white">{t('thirdLine')}</div>
              <div className="text-[10px] sm:text-xs text-white/40">{t('thirdLevelNetwork')}</div>
            </div>
            <div className="text-lg sm:text-xl font-semibold text-white">5%</div>
          </div>
        </div>

        <div className="mt-4 text-[10px] sm:text-xs text-white/40">
          {t('referralNote')}
        </div>
      </Section>

      {/* FAQ */}
      <Section title={t('commonQuestions')}>
        <div className="space-y-3 sm:space-y-4">
          <FAQ 
            q={t('q1')}
            a={t('a1')}
          />
          <FAQ 
            q={t('q2')}
            a={t('a2')}
          />
          <FAQ 
            q={t('q3')}
            a={t('a3')}
          />
          <FAQ 
            q={t('q4')}
            a={t('a4')}
          />
          <FAQ 
            q={t('q5')}
            a={t('a5')}
          />
        </div>
      </Section>

      {/* GETTING STARTED */}
      <Section title={t('gettingStarted')}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <div className="rounded-xl bg-[#0d0d0f] p-4 sm:p-5">
            <div className="text-xs sm:text-sm font-medium text-white mb-2">1. {t('getWallet')}</div>
            <p className="text-[10px] sm:text-xs text-white/50 mb-3">
              {t('getWalletDesc')}
            </p>
            <div className="flex gap-2">
              <a
                href="https://phantom.app/"
                target="_blank"
                rel="noreferrer"
                className="rounded-lg bg-[#14F195]/10 px-3 py-1.5 text-[10px] sm:text-xs text-[#14F195] hover:bg-[#14F195]/20 transition-colors"
              >
                Phantom
              </a>
            </div>
          </div>

          <div className="rounded-xl bg-[#0d0d0f] p-4 sm:p-5">
            <div className="text-xs sm:text-sm font-medium text-white mb-2">2. {t('getSol')}</div>
            <p className="text-[10px] sm:text-xs text-white/50 mb-3">
              {t('getSolDesc')}
            </p>
            <div className="text-[10px] sm:text-xs text-white/40">
              {t('minimumForL01')}
            </div>
          </div>

          <div className="rounded-xl bg-[#0d0d0f] p-4 sm:p-5">
            <div className="text-xs sm:text-sm font-medium text-white mb-2">3. {t('connectWallet')}</div>
            <p className="text-[10px] sm:text-xs text-white/50">
              {t('connectWalletDesc')}
            </p>
          </div>

          <div className="rounded-xl bg-[#0d0d0f] p-4 sm:p-5">
            <div className="text-xs sm:text-sm font-medium text-white mb-2">4. {t('activateLevels')}</div>
            <p className="text-[10px] sm:text-xs text-white/50">
              {t('activateLevelsDesc')}
            </p>
          </div>
        </div>
      </Section>
    </div>
  );
}

/* ------------------------------------------------------------ */
/* Components                                                    */
/* ------------------------------------------------------------ */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl bg-[#111113] p-4 sm:p-6">
      <h2 className="text-sm sm:text-base font-semibold text-white mb-3 sm:mb-4">{title}</h2>
      {children}
    </section>
  );
}

function Step({ number, title, children }: { number: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 sm:gap-4">
      <div className="flex-shrink-0 h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-[#14F195]/10 flex items-center justify-center">
        <span className="text-xs sm:text-sm font-semibold text-[#14F195]">{number}</span>
      </div>
      <div className="flex-1">
        <div className="text-xs sm:text-sm font-medium text-white">{title}</div>
        <p className="mt-1 text-[10px] sm:text-xs text-white/50 leading-relaxed">{children}</p>
      </div>
    </div>
  );
}

function FAQ({ q, a }: { q: string; a: string }) {
  return (
    <div className="rounded-xl bg-[#0d0d0f] p-3 sm:p-4">
      <div className="text-xs sm:text-sm font-medium text-white">{q}</div>
      <p className="mt-1.5 text-[10px] sm:text-xs text-white/50 leading-relaxed">{a}</p>
    </div>
  );
}
