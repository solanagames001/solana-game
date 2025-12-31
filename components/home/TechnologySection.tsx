'use client';

import { memo, useState, useMemo, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useTranslations } from 'next-intl';

/* ----------------------------------------------------
   Component
---------------------------------------------------- */
function TechnologySectionImpl() {
  const t = useTranslations('technology');
  const [active, setActive] = useState('x3-matrix');
  
  const TABS = useMemo(() => [
    { id: 'x3-matrix', title: t('x3Matrix'), text: t('x3MatrixDesc') },
    { id: 'payouts', title: t('instantPayouts'), text: t('instantPayoutsDesc') },
    { id: 'levels', title: t('sixteenLevels'), text: t('sixteenLevelsDesc') },
    { id: 'security', title: t('replayProtection'), text: t('replayProtectionDesc') },
    { id: 'queue', title: t('globalQueue'), text: t('globalQueueDesc') },
    { id: 'referrals', title: t('referralChain'), text: t('referralChainDesc') },
  ], [t]);
  
  const current = useMemo(() => TABS.find((tab) => tab.id === active)!, [active, TABS]);
  
  const handleTabChange = useCallback((id: string) => {
    setActive(id);
  }, []);
  
  const statsData = useMemo(() => [
    { value: '16', label: t('levels'), sub: '0.05 - 8.7 SOL' },
    { value: '3', label: t('slotsPerCycle'), sub: t('autoRecycle') },
    { value: '60%', label: t('ownerPayout'), sub: t('perActivation') },
    { value: '26%', label: t('referralTotal'), sub: '13% + 8% + 5%' },
  ], [t]);

  return (
    <section className="relative bg-black py-16 sm:py-20 md:py-24 overflow-hidden">
      {/* Top fade for smooth transition */}
      <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-black to-transparent pointer-events-none z-10" />
      
      {/* Bottom fade for smooth transition */}
      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-black to-transparent pointer-events-none z-10" />

      {/* Gradient glow */}
      <div className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 w-[600px] h-40 bg-gradient-to-b from-[#14F195]/10 via-transparent to-transparent blur-[100px]" />

      <div className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6">
        {/* Header */}
        <div className="text-center mb-10 sm:mb-12 md:mb-14">
          <div className="inline-block mb-3 sm:mb-4">
            <span className="text-[10px] sm:text-xs uppercase tracking-[0.2em] text-[#14F195]/60 font-medium">
              {t('smartContract')}
            </span>
          </div>

          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white">
            {t('howItWorks')}{' '}
            <span className="bg-gradient-to-r from-[#9945FF] to-[#14F195] bg-clip-text text-transparent">
              {t('solana')}
            </span>
          </h2>

          <p className="mt-3 sm:mt-4 text-white/40 max-w-2xl mx-auto text-xs sm:text-sm md:text-base leading-relaxed">
            {t('description')}
          </p>
        </div>

        {/* Main container */}
        <div className="flex flex-col lg:flex-row rounded-2xl bg-black border border-white/10 p-4 sm:p-6 md:p-8">
          {/* Tabs */}
          <div className="flex flex-wrap lg:flex-col gap-2 mb-4 lg:mb-0 lg:w-1/3 lg:pr-6">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`
                  rounded-xl px-3 sm:px-4 py-2 sm:py-2.5 text-[11px] sm:text-xs font-medium transition-all duration-200
                  flex-1 lg:flex-initial lg:w-full text-left
                  ${
                    active === tab.id
                      ? 'bg-[#14F195] text-black shadow-[0_0_20px_rgba(20,241,149,0.3)]'
                      : 'bg-black border border-white/10 text-white/60 hover:text-white hover:border-white/20'
                  }
                `}
              >
                {tab.title}
              </button>
            ))}
          </div>

          {/* Divider */}
          <div className="hidden lg:block w-px bg-white/10 mx-2" />

          {/* Content */}
          <div className="flex-1 lg:pl-6 min-h-[180px] sm:min-h-[160px] flex items-center">
            <AnimatePresence mode="wait">
              <motion.div
                key={active}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25 }}
                className="w-full"
              >
                <h3 className="text-lg sm:text-xl font-semibold text-[#14F195] mb-2 sm:mb-3">
                  {current.title}
                </h3>
                <p className="text-white/60 text-xs sm:text-sm md:text-base leading-relaxed">
                  {current.text}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Bottom stats from processor.rs */}
        <div className="mt-8 sm:mt-10 md:mt-12 grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          {statsData.map((stat, i) => (
            <div key={i} className="rounded-xl bg-black border border-white/10 p-3 sm:p-4 text-center">
              <div className="text-xl sm:text-2xl md:text-3xl font-bold text-[#14F195]">
                {stat.value}
              </div>
              <div className="text-[10px] sm:text-xs text-white/60 mt-1">
                {stat.label}
              </div>
              <div className="text-[9px] sm:text-[10px] text-white/30 mt-0.5">
                {stat.sub}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const TechnologySection = memo(TechnologySectionImpl);
TechnologySection.displayName = 'TechnologySection';

export default TechnologySection;
