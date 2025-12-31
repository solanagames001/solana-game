'use client';

import { memo, useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { useTranslations } from 'next-intl';

// FAQ keys array for iteration
const FAQ_KEYS = ['q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7', 'q8'] as const;

function FaqSectionImpl() {
  const t = useTranslations('faq');
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  
  const handleToggle = useCallback((index: number) => {
    setOpenIndex(prev => prev === index ? null : index);
  }, []);

  return (
    <section className="relative w-full overflow-hidden py-16 md:py-20 px-4 sm:px-6 md:px-8 text-center bg-black">
      {/* --- фоновое большое лого справа --- */}
      <div className="absolute right-[-8%] top-1/2 -translate-y-1/2 w-[60vw] min-w-[480px] opacity-[0.28] blur-[26px] pointer-events-none select-none z-0">
        <Image
          src="/logos.png"
          alt="Solana Game Logo Background"
          width={1300}
          height={1300}
          className="object-contain w-full h-auto brightness-150 contrast-110 saturate-[1.1]"
          priority
        />
      </div>

      {/* лёгкие градиенты по краям */}
      <div className="absolute inset-0 bg-black z-[-1]" />
      <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-black to-transparent pointer-events-none z-10" />
      <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-black to-transparent pointer-events-none z-10" />

      {/* контент faq */}
      <div className="relative z-10 mx-auto max-w-3xl">
        <div className="mb-8">
          <div className="flex justify-center mb-3">
            <div className="h-8 w-8 flex items-center justify-center rounded-full bg-[#9945FF] text-black text-base font-bold shadow-md">
              ?
            </div>
          </div>
          <h2 className="text-2xl md:text-4xl font-bold text-white">{t('title')}</h2>
          <p className="mt-2 text-sm md:text-base text-white/70">
            {t('subtitle')}
          </p>
        </div>

        {/* список faq */}
        <div className="space-y-3">
          {FAQ_KEYS.map((key, i) => {
            const isOpen = openIndex === i;
            return (
              <motion.div
                key={key}
                layout
                initial={false}
                animate={{
                  borderColor: isOpen ? 'rgba(153, 69, 255, 0.4)' : 'rgba(255, 255, 255, 0.1)',
                  boxShadow: isOpen ? '0 0 20px rgba(153, 69, 255, 0.12)' : 'none',
                }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className={`rounded-2xl border bg-[#0b0b0b]/85 overflow-hidden backdrop-blur-sm ${
                  !isOpen ? 'hover:border-[#9945FF]/25' : ''
                }`}
              >
                <button
                  onClick={() => handleToggle(i)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left"
                >
                  <motion.span
                    animate={{
                      color: isOpen ? '#9945FF' : 'rgba(255, 255, 255, 0.8)',
                    }}
                    transition={{ duration: 0.2 }}
                    className="text-sm md:text-base font-medium"
                  >
                    {t(key)}
                  </motion.span>
                  <motion.span
                    animate={{
                      color: isOpen ? '#9945FF' : 'rgba(255, 255, 255, 0.6)',
                      rotate: isOpen ? 45 : 0,
                    }}
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                    className="text-lg flex-shrink-0 ml-4 origin-center"
                  >
                    +
                  </motion.span>
                </button>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      key="content"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ 
                        height: {
                          duration: 0.3,
                          ease: [0.4, 0, 0.2, 1], // cubic-bezier для более плавной анимации
                        },
                        opacity: {
                          duration: 0.2,
                          ease: 'easeOut',
                        }
                      }}
                      style={{ 
                        overflow: 'hidden',
                        willChange: 'height, opacity'
                      }}
                    >
                      <div className="px-5 pb-5 pt-1 border-t border-white/10 text-left text-sm md:text-[15px] text-white/70 leading-relaxed">
                        {t(`a${key.slice(1)}`)}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

const FaqSection = memo(FaqSectionImpl);
FaqSection.displayName = 'FaqSection';

export default FaqSection;
