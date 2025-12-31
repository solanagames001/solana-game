'use client';

import { memo, useMemo } from 'react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';

/* ----------------------------------------------------
   Icons (minimal, single color)
---------------------------------------------------- */
const IconWrap = ({ children }: { children: ReactNode }) => (
  <div className="mb-4 sm:mb-5 w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-[#14F195]/10 border border-[#14F195]/20 flex items-center justify-center">
    {children}
  </div>
);

const DocIcon = () => (
  <svg className="w-6 h-6 sm:w-7 sm:h-7 text-[#14F195]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M7 3h7l4 4v14H7V3z" />
    <path d="M14 3v5h5" />
    <path d="M9 11h6M9 15h6" strokeLinecap="round" />
  </svg>
);

const PayoutIcon = () => (
  <svg className="w-6 h-6 sm:w-7 sm:h-7 text-[#14F195]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <circle cx="12" cy="12" r="9" />
    <path d="M12 6v12M8 10l4-4 4 4M8 14l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const ReferralIcon = () => (
  <svg className="w-6 h-6 sm:w-7 sm:h-7 text-[#14F195]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <circle cx="12" cy="5" r="3" />
    <circle cx="5" cy="19" r="3" />
    <circle cx="19" cy="19" r="3" />
    <path d="M12 8v4M9 14l-2 2M15 14l2 2" strokeLinecap="round" />
  </svg>
);

/* ----------------------------------------------------
   Info Card
---------------------------------------------------- */
const InfoCard = memo(function InfoCard({
  title,
  text,
  button,
  href,
  icon,
  delay = 0,
}: {
  title: string;
  text: string;
  button: string;
  href: string;
  icon?: ReactNode;
  delay?: number;
}) {
  return (
    <div
      className="relative flex flex-col items-center text-center rounded-2xl
                 bg-black border border-white/10 p-5 sm:p-6 md:p-8
                 hover:border-[#14F195]/30 transition-all duration-300 group"
    >
      <div className="relative z-10 flex flex-col items-center h-full">
        {icon && <IconWrap>{icon}</IconWrap>}

        <h3 className="text-base sm:text-lg md:text-xl font-semibold mb-2 sm:mb-3 text-white">
          {title}
        </h3>
        <p className="text-xs sm:text-sm text-white/50 leading-relaxed max-w-[280px]">
          {text}
        </p>

        <Link
          href={href}
          className="mt-5 sm:mt-6 rounded-xl bg-black border border-white/10 px-5 sm:px-6 py-2.5
                     text-xs sm:text-sm font-medium text-white/70 transition-all duration-200
                     hover:bg-[#14F195] hover:text-black hover:border-[#14F195]
                     group-hover:shadow-[0_0_20px_rgba(20,241,149,0.2)]"
        >
          {button}
        </Link>
      </div>
    </div>
  );
});

/* ----------------------------------------------------
   Info Section
---------------------------------------------------- */
function InfoSectionImpl() {
  const t = useTranslations('info');
  
  const statsData = useMemo(() => [
    { value: '60%', label: t('ownerPayout') },
    { value: '26%', label: t('referralRewards') },
    { value: '<1s', label: t('transactionSpeed') },
  ], [t]);
  
  return (
    <section className="relative bg-black py-16 sm:py-20 md:py-24 overflow-hidden mt-0">
      {/* Top fade for smooth transition from HeroSection */}
      <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-black to-transparent pointer-events-none z-10" />
      
      {/* Bottom fade for smooth transition to next section */}
      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-black to-transparent pointer-events-none z-10" />

      {/* Subtle gradient */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] opacity-10 blur-3xl pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse, #14F195 0%, transparent 60%)',
        }}
      />

      <div className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6">
        {/* Header */}
        <div className="text-center mb-10 sm:mb-12 md:mb-16">
          <div className="inline-block mb-3 sm:mb-4">
            <span className="text-[10px] sm:text-xs uppercase tracking-[0.2em] text-[#14F195]/60 font-medium">
              {t('platformFeatures')}
            </span>
          </div>

          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white">
            {t('builtOn')}{' '}
            <span className="bg-gradient-to-r from-[#9945FF] to-[#14F195] bg-clip-text text-transparent">
              {t('solana')}
            </span>
          </h2>

          <p className="mt-3 sm:mt-4 text-white/40 max-w-xl mx-auto text-xs sm:text-sm md:text-base leading-relaxed">
            {t('description')}
          </p>
        </div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 md:gap-6">
          <InfoCard
            title={t('documentation')}
            text={t('documentationDesc')}
            button={t('readDocs')}
            href="/docs"
            icon={<DocIcon />}
            delay={0}
          />
          <InfoCard
            title={t('instantPayouts')}
            text={t('instantPayoutsDesc')}
            button={t('learnMore')}
            href="/information"
            icon={<PayoutIcon />}
            delay={0.1}
          />
          <InfoCard
            title={t('referralSystem')}
            text={t('referralSystemDesc')}
            button={t('startEarning')}
            href="/partner-bonus"
            icon={<ReferralIcon />}
            delay={0.2}
          />
        </div>

        {/* Bottom stats */}
        <div className="mt-10 sm:mt-12 md:mt-16 flex flex-wrap justify-center gap-6 sm:gap-8 md:gap-12">
          {statsData.map((stat, i) => (
            <div key={i} className="text-center">
              <div className="text-xl sm:text-2xl md:text-3xl font-bold text-[#14F195]">
                {stat.value}
              </div>
              <div className="text-[10px] sm:text-xs text-white/30 uppercase tracking-wider mt-1">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const InfoSection = memo(InfoSectionImpl);
InfoSection.displayName = 'InfoSection';

export default InfoSection;
