'use client';

import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

/* ----------------------------------------------------
   Section IDs and Icons
---------------------------------------------------- */
const SECTION_IDS = ['overview', 'levels', 'queue', 'payouts', 'referrals', 'security', 'getting-started'] as const;
type SectionId = typeof SECTION_IDS[number];

const SECTION_ICONS: Record<SectionId, JSX.Element> = {
  'overview': (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4M12 8h.01" strokeLinecap="round" />
    </svg>
  ),
  'levels': (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M12 2L2 7l10 5 10-5-10-5z" />
      <path d="M2 17l10 5 10-5" />
      <path d="M2 12l10 5 10-5" />
    </svg>
  ),
  'queue': (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  'payouts': (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v12M8 10l4-4 4 4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  'referrals': (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="12" cy="5" r="3" />
      <circle cx="5" cy="19" r="3" />
      <circle cx="19" cy="19" r="3" />
      <path d="M12 8v4M9 14l-2 2M15 14l2 2" strokeLinecap="round" />
    </svg>
  ),
  'security': (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  ),
  'getting-started': (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
};

/* ----------------------------------------------------
   Skeleton Component (matching dashboard style)
---------------------------------------------------- */
function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      className={`relative overflow-hidden bg-[#1a1a1a] ${className}`}
      style={{ borderRadius: 'inherit' }}
    >
      <div
        className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite]"
        style={{
          background:
            'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.06) 50%, transparent 100%)',
        }}
      />
    </div>
  );
}

function ContentSkeleton() {
  return (
    <div className="space-y-8">
      {/* Section Header Skeleton */}
      <div className="flex items-center gap-4 pb-6 border-b border-white/10">
        <Skeleton className="w-12 h-12 rounded-xl" />
        <div className="flex-1">
          <Skeleton className="h-8 w-48 sm:w-64 rounded-lg mb-2" />
          <Skeleton className="h-3 w-20 rounded" />
        </div>
      </div>

      {/* Content Blocks Skeleton */}
      {[1, 2, 3].map((i) => (
        <div key={i} className="rounded-2xl bg-[#111113] border border-white/5 p-6 sm:p-8">
          <Skeleton className="h-6 sm:h-7 w-40 sm:w-48 rounded mb-4" />
          <div className="space-y-3">
            <Skeleton className="h-4 w-full rounded" />
            <Skeleton className="h-4 w-full rounded" />
            <Skeleton className="h-4 w-3/4 rounded" />
            <Skeleton className="h-4 w-full rounded" />
            <Skeleton className="h-4 w-2/3 rounded" />
            {i === 1 && (
              <>
                <Skeleton className="h-4 w-5/6 rounded" />
                <Skeleton className="h-4 w-full rounded" />
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function SidebarSkeleton() {
  return (
    <div className="hidden lg:block lg:w-64 flex-shrink-0">
      <div className="lg:sticky lg:top-24 space-y-1">
        {[...Array(7)].map((_, i) => (
          <div key={i} className="w-full rounded-xl bg-[#111113] p-4">
            <div className="flex items-center gap-3">
              <Skeleton className="w-5 h-5 rounded" />
              <Skeleton className="h-4 flex-1 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ----------------------------------------------------
   More Menu Component
---------------------------------------------------- */
interface MoreMenuProps {
  sections: SectionId[];
  activeSection: string;
  onSelect: (id: string) => void;
  isLoading: boolean;
  t: ReturnType<typeof useTranslations<'docsPage'>>;
}

function MoreMenu({ sections, activeSection, onSelect, isLoading, t }: MoreMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex flex-col items-center gap-1 py-2 px-3 rounded-xl transition-all ${
          sections.includes(activeSection as SectionId) ? 'text-[#14F195]' : 'text-white/40'
        }`}
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="12" cy="12" r="1" />
          <circle cx="19" cy="12" r="1" />
          <circle cx="5" cy="12" r="1" />
        </svg>
        <span className="text-[9px] font-medium">{t('more')}</span>
      </button>
      
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute bottom-full right-0 mb-2 w-48 rounded-xl bg-[#111113] border border-white/10 shadow-xl overflow-hidden z-50"
            >
              {sections.map((sectionId) => (
                <button
                  key={sectionId}
                  onClick={() => {
                    onSelect(sectionId);
                    setIsOpen(false);
                  }}
                  disabled={isLoading}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left text-sm ${
                    activeSection === sectionId
                      ? 'bg-[#14F195]/10 text-[#14F195]'
                      : 'text-white/60 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <span className={activeSection === sectionId ? 'text-[#14F195]' : 'text-[#14F195]/60'}>
                    {SECTION_ICONS[sectionId]}
                  </span>
                  {t(`sections.${sectionId}.title`)}
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ----------------------------------------------------
   Main Component
---------------------------------------------------- */
export default function DocsPage() {
  const t = useTranslations('docsPage');
  const [activeSection, setActiveSection] = useState<SectionId>('overview');
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);

  // Show skeleton for 1 second on initial load (like dashboard)
  useEffect(() => {
    const timer = setTimeout(() => setIsInitialLoading(false), 1000);
    return () => clearTimeout(timer);
  }, []);

  const currentIndex = SECTION_IDS.findIndex((s) => s === activeSection);

  // Handle section change with skeleton
  const handleSectionChange = useCallback((sectionId: string) => {
    if (sectionId === activeSection) return;
    
    setIsLoading(true);
    
    setTimeout(() => {
      setActiveSection(sectionId as SectionId);
      setIsLoading(false);
      
      if (contentRef.current) {
        contentRef.current.scrollTo({ top: 0, behavior: 'smooth' });
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 500);
  }, [activeSection]);

  // Navigate to next/prev section
  const navigateSection = useCallback((direction: 'next' | 'prev') => {
    const newIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
    if (newIndex >= 0 && newIndex < SECTION_IDS.length) {
      handleSectionChange(SECTION_IDS[newIndex]);
    }
  }, [currentIndex, handleSectionChange]);

  // Swipe handling
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    
    const deltaX = touchEndX - touchStartX.current;
    const deltaY = touchEndY - touchStartY.current;
    
    if (Math.abs(deltaX) > 80 && Math.abs(deltaX) > Math.abs(deltaY) * 1.5) {
      if (deltaX > 0) {
        navigateSection('prev');
      } else {
        navigateSection('next');
      }
    }
  }, [navigateSection]);

  // Get content blocks for current section
  const contentBlocks = useMemo(() => {
    const blocks = [];
    let i = 1;
    
    // Define max content blocks per section (to skip empty ones)
    const maxContentBySection: Record<string, number> = {
      'overview': 5,
      'levels': 5,
      'queue': 5,
      'payouts': 5,
      'referrals': 6,
      'security': 6,
      'getting-started': 7,
    };
    
    const maxContent = maxContentBySection[activeSection] || 10;
    
    while (i <= maxContent) {
      try {
        const headingKey = `sections.${activeSection}.content${i}.heading`;
        const textKey = `sections.${activeSection}.content${i}.text`;
        
        // Try to get translations
        let heading: string;
        let text: string;
        
        try {
          heading = t(headingKey);
          text = t(textKey);
        } catch (err) {
          // Translation key doesn't exist - stop here
          break;
        }
        
        // In next-intl, missing keys return the key path itself
        // Check if we got the key path back (means translation doesn't exist)
        if (heading === headingKey || text === textKey) {
          // Translation doesn't exist - stop here
          break;
        }
        
        // Check if translations are empty or only whitespace
        const trimmedHeading = (heading || '').trim();
        const trimmedText = (text || '').trim();
        
        // Skip if content is empty, whitespace only, or contains only the key path
        if (trimmedHeading.length === 0 || 
            trimmedText.length === 0 ||
            trimmedHeading === headingKey ||
            trimmedText === textKey) {
          // Empty block found - stop here
          break;
        }
        
        // Valid content block - add it
        blocks.push({ heading: trimmedHeading, text: trimmedText });
        i++;
      } catch (error) {
        // Any other error, stop looking
        break;
      }
    }
    return blocks;
  }, [activeSection, t]);

  return (
    <div className="min-h-screen bg-black text-white pb-20 lg:pb-0">
      <div 
        className="max-w-7xl mx-auto px-4 sm:px-6 pt-4 sm:pt-6 pb-8 sm:pb-12"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Navigation Bar */}
        <div className="flex items-center justify-between mb-8 sm:mb-10">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="p-2 rounded-lg border border-white/10 hover:bg-white/5 transition-colors"
            >
              <svg className="w-5 h-5 text-white/60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
            <span className="text-white/80 font-medium text-sm sm:text-base">{t('title')}</span>
          </div>

          <Link
            href="/levels"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#14F195] text-black text-sm font-medium hover:bg-[#0fd182] transition-colors"
          >
            <span>{t('startPlaying')}</span>
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        </div>

        {/* Page Title */}
        {isInitialLoading ? (
          <div className="mb-8 sm:mb-12">
            <Skeleton className="h-3 w-24 rounded mb-4" />
            <Skeleton className="h-10 sm:h-12 md:h-14 w-64 sm:w-80 rounded-lg mb-4" />
            <Skeleton className="h-4 w-full max-w-2xl rounded mb-2" />
            <Skeleton className="h-4 w-3/4 max-w-2xl rounded" />
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-8 sm:mb-12"
          >
            <span className="text-[10px] sm:text-xs uppercase tracking-[0.2em] text-[#14F195]/60 font-medium">
              {t('label')}
            </span>
            <h1 className="mt-2 text-3xl sm:text-4xl md:text-5xl font-bold text-white">
              {t('heading')}
            </h1>
            <p className="mt-4 text-white/50 max-w-2xl text-sm sm:text-base">
              {t('description')}
            </p>
            
            {/* Swipe hint on mobile */}
            <p className="mt-2 text-white/30 text-xs lg:hidden flex items-center gap-2">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M5 12h14M19 12l-4-4M19 12l-4 4M5 12l4-4M5 12l4 4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {t('swipeHint')}
            </p>
          </motion.div>
        )}

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar Navigation - hidden on mobile */}
          {isInitialLoading ? (
            <SidebarSkeleton />
          ) : (
            <motion.nav
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="hidden lg:block lg:w-64 flex-shrink-0"
            >
              <div className="lg:sticky lg:top-24 space-y-1">
                {SECTION_IDS.map((sectionId) => (
                  <button
                    key={sectionId}
                    onClick={() => handleSectionChange(sectionId)}
                    disabled={isLoading}
                    className={`
                      w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left text-sm font-medium
                      transition-all duration-200 disabled:opacity-50
                      ${
                        activeSection === sectionId
                          ? 'bg-[#14F195] text-black shadow-[0_0_20px_rgba(20,241,149,0.3)]'
                          : 'text-white/60 hover:text-white hover:bg-white/5'
                      }
                    `}
                  >
                    <span className={activeSection === sectionId ? 'text-black' : 'text-[#14F195]'}>
                      {SECTION_ICONS[sectionId]}
                    </span>
                    {t(`sections.${sectionId}.title`)}
                  </button>
                ))}
              </div>
            </motion.nav>
          )}

          {/* Content */}
          <motion.main
            ref={contentRef}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="flex-1 min-w-0"
          >
            {isInitialLoading || isLoading ? (
              <ContentSkeleton />
            ) : (
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeSection}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.25 }}
                  className="space-y-8"
                >
                  {/* Section Header */}
                  <div className="flex items-center gap-4 pb-6 border-b border-white/10">
                    <div className="w-12 h-12 rounded-xl bg-[#14F195]/10 border border-[#14F195]/20 flex items-center justify-center text-[#14F195]">
                      {SECTION_ICONS[activeSection]}
                    </div>
                    <div>
                      <h2 className="text-2xl sm:text-3xl font-bold text-white">
                        {t(`sections.${activeSection}.title`)}
                      </h2>
                      <p className="text-white/40 text-xs mt-1">
                        {currentIndex + 1} {t('of')} {SECTION_IDS.length}
                      </p>
                    </div>
                  </div>

                  {/* Section Content */}
                  {contentBlocks.length > 0 ? (
                    contentBlocks.map((block, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="rounded-2xl bg-[#111113] border border-white/5 p-6 sm:p-8"
                      >
                        <h3 className="text-lg sm:text-xl font-semibold text-[#14F195] mb-4">
                          {block.heading}
                        </h3>
                        <div className="text-white/60 text-sm sm:text-base leading-relaxed whitespace-pre-line">
                          {block.text}
                        </div>
                      </motion.div>
                    ))
                  ) : (
                    <div className="rounded-2xl bg-[#111113] border border-white/5 p-6 sm:p-8">
                      <p className="text-white/60">Loading content...</p>
                    </div>
                  )}

                  {/* Navigation - hidden on mobile */}
                  <div className="hidden lg:flex items-center justify-between pt-8 border-t border-white/10">
                    {currentIndex > 0 ? (
                      <button
                        onClick={() => navigateSection('prev')}
                        className="flex items-center gap-2 text-white/60 hover:text-[#14F195] transition-colors"
                      >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <span className="text-sm">{t(`sections.${SECTION_IDS[currentIndex - 1]}.title`)}</span>
                      </button>
                    ) : (
                      <div />
                    )}

                    {currentIndex < SECTION_IDS.length - 1 ? (
                      <button
                        onClick={() => navigateSection('next')}
                        className="flex items-center gap-2 text-white/60 hover:text-[#14F195] transition-colors"
                      >
                        <span className="text-sm">{t(`sections.${SECTION_IDS[currentIndex + 1]}.title`)}</span>
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </button>
                    ) : (
                      <Link
                        href="/levels"
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#14F195] text-black text-sm font-medium hover:bg-[#0fd182] transition-colors"
                      >
                        <span>{t('startPlaying')}</span>
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </Link>
                    )}
                  </div>
                </motion.div>
              </AnimatePresence>
            )}
          </motion.main>
        </div>
      </div>

      {/* Footer - hidden on mobile */}
      <footer className="hidden lg:block border-t border-white/10 py-8 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center">
          <p className="text-white/40 text-sm">
            {t('footerText')}
          </p>
        </div>
      </footer>

      {/* Bottom Navigation - Mobile Only */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-black/95 backdrop-blur-md border-t border-white/10">
        <div className="flex items-center justify-around py-2 px-2 max-w-lg mx-auto">
          {SECTION_IDS.slice(0, 5).map((sectionId) => (
            <button
              key={sectionId}
              onClick={() => handleSectionChange(sectionId)}
              disabled={isLoading}
              className={`
                flex flex-col items-center gap-1 py-2 px-3 rounded-xl transition-all
                ${activeSection === sectionId
                  ? 'text-[#14F195]'
                  : 'text-white/40'
                }
              `}
            >
              <div className={`
                ${activeSection === sectionId ? 'scale-110' : ''}
                transition-transform
              `}>
                {SECTION_ICONS[sectionId]}
              </div>
              <span className="text-[9px] font-medium">{t(`sections.${sectionId}.shortTitle`)}</span>
            </button>
          ))}
          
          {/* More menu for remaining sections */}
          <MoreMenu 
            sections={SECTION_IDS.slice(5) as SectionId[]} 
            activeSection={activeSection}
            onSelect={handleSectionChange}
            isLoading={isLoading}
            t={t}
          />
        </div>
      </nav>

      {/* Shimmer animation keyframes (matching dashboard) */}
      <style jsx global>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
}
