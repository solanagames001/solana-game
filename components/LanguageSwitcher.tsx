'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocale, useTranslations } from 'next-intl';
import { setClientLocale } from '@/i18n/client';
import { locales, localeNames, localeFlags, type Locale } from '@/i18n/config';

// Globe icon for the trigger (meridian style)
function GlobeIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}

// Compact globe icon (meridian only)
function GlobeIconCompact({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}

// Check icon for selected item
function CheckIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}


export default function LanguageSwitcher() {
  const t = useTranslations('common');
  const currentLocale = useLocale() as Locale;
  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Detect mobile
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Close dropdown when clicking outside (desktop only)
  useEffect(() => {
    if (isMobile) return;
    
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMobile]);


  // Close on escape key
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setIsOpen(false);
    }
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  const handleSelect = useCallback((locale: Locale) => {
    if (locale === currentLocale) {
      setIsOpen(false);
      return;
    }
    setClientLocale(locale);
    setIsOpen(false);
  }, [currentLocale]);

  return (
    <div ref={ref} className="relative">
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="group flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-2 rounded-xl bg-[#111113] hover:bg-[#161618] border border-white/5 hover:border-white/10 transition-all duration-200"
        aria-label={t('selectLanguage')}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        {/* Globe icon - visible everywhere */}
        <GlobeIconCompact className="w-4 h-4 sm:w-4 sm:h-4 text-white/50 group-hover:text-[#14F195] transition-colors" />
        
        {/* Language code - hidden on mobile */}
        <span className="hidden sm:block text-xs font-medium text-white/60 group-hover:text-white/80 transition-colors uppercase tracking-wide">
          {currentLocale}
        </span>
        
        {/* Chevron - hidden on mobile */}
        <svg 
          className={`hidden sm:block w-3 h-3 text-white/30 group-hover:text-white/50 transition-all duration-200 ${isOpen ? 'rotate-180' : ''}`}
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Desktop Dropdown */}
      <AnimatePresence>
        {isOpen && !isMobile && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute right-0 mt-2 w-56 rounded-2xl bg-[#0a0a0a] border border-white/10 shadow-2xl shadow-black/60 z-[100] overflow-hidden"
            role="listbox"
          >
            {/* Header */}
            <div className="px-4 py-3 border-b border-white/5">
              <div className="flex items-center gap-2">
                <GlobeIcon className="w-4 h-4 text-[#14F195]" />
                <span className="text-xs font-medium text-white/50 uppercase tracking-wider">{t('selectLanguage')}</span>
              </div>
            </div>

            {/* Language List */}
            <div className="max-h-[360px] overflow-y-auto py-2 custom-scrollbar">
              {locales.map((locale) => {
                const isActive = locale === currentLocale;
                return (
                  <button
                    key={locale}
                    onClick={() => handleSelect(locale)}
                    role="option"
                    aria-selected={isActive}
                    className={`
                      w-full flex items-center gap-3 px-4 py-3 text-left
                      transition-all duration-150
                      ${isActive 
                        ? 'bg-[#14F195]/10' 
                        : 'hover:bg-white/5'
                      }
                    `}
                  >
                    <span className="text-xl">{localeFlags[locale]}</span>
                    <div className="flex-1 min-w-0">
                      <div className={`text-sm font-medium truncate ${isActive ? 'text-[#14F195]' : 'text-white/90'}`}>
                        {localeNames[locale]}
                      </div>
                      <div className="text-[10px] text-white/40 uppercase tracking-wider">
                        {locale}
                      </div>
                    </div>
                    {isActive && (
                      <div className="flex-shrink-0 w-5 h-5 rounded-full bg-[#14F195]/20 flex items-center justify-center">
                        <CheckIcon className="w-3 h-3 text-[#14F195]" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Dropdown */}
      <AnimatePresence>
        {isOpen && isMobile && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="fixed inset-0 z-[99]"
              onClick={() => setIsOpen(false)}
            />

            {/* Dropdown - opens downward */}
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              className="absolute right-0 mt-2 w-[200px] rounded-2xl bg-[#0a0a0a] border border-white/10 shadow-2xl shadow-black/60 z-[100] overflow-hidden"
              role="listbox"
            >
              {/* Header */}
              <div className="px-3 py-2.5 border-b border-white/5">
                <div className="flex items-center gap-2">
                  <GlobeIconCompact className="w-4 h-4 text-[#14F195]" />
                  <span className="text-[10px] font-medium text-white/50 uppercase tracking-wider">{t('selectLanguage')}</span>
                </div>
              </div>

              {/* Language List */}
              <div className="max-h-[300px] overflow-y-auto py-1 custom-scrollbar">
                {locales.map((locale) => {
                  const isActive = locale === currentLocale;
                  return (
                    <button
                      key={locale}
                      onClick={() => handleSelect(locale)}
                      role="option"
                      aria-selected={isActive}
                      className={`
                        w-full flex items-center gap-2.5 px-3 py-2.5 text-left
                        transition-all duration-150
                        ${isActive 
                          ? 'bg-[#14F195]/10' 
                          : 'hover:bg-white/5'
                        }
                      `}
                    >
                      <span className="text-lg">{localeFlags[locale]}</span>
                      <div className="flex-1 min-w-0">
                        <div className={`text-sm font-medium truncate ${isActive ? 'text-[#14F195]' : 'text-white/90'}`}>
                          {localeNames[locale]}
                        </div>
                      </div>
                      {isActive && (
                        <div className="flex-shrink-0 w-4 h-4 rounded-full bg-[#14F195]/20 flex items-center justify-center">
                          <CheckIcon className="w-2.5 h-2.5 text-[#14F195]" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Custom scrollbar styles */}
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 2px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
      `}</style>
    </div>
  );
}
