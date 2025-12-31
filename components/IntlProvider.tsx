'use client';

import { NextIntlClientProvider } from 'next-intl';
import type { ReactNode } from 'react';
import { useState, useEffect } from 'react';
import { defaultLocale, type Locale } from '@/i18n/config';
import { getClientLocale } from '@/i18n/client';

// Lazy load messages
const messageLoaders: Record<Locale, () => Promise<{ default: any }>> = {
  en: () => import('@/messages/en.json'),
  ru: () => import('@/messages/ru.json'),
  es: () => import('@/messages/es.json'),
  zh: () => import('@/messages/zh.json'),
  ja: () => import('@/messages/ja.json'),
  ko: () => import('@/messages/ko.json'),
  de: () => import('@/messages/de.json'),
  fr: () => import('@/messages/fr.json'),
  pt: () => import('@/messages/pt.json'),
  tr: () => import('@/messages/tr.json'),
  vi: () => import('@/messages/vi.json'),
  id: () => import('@/messages/id.json'),
};

// Elegant loading screen with animated logo ring
function LoadingScreen() {
  return (
    <div className="fixed inset-0 bg-black flex items-center justify-center z-[9999]">
      {/* Subtle radial glow background */}
      <div 
        className="absolute inset-0 opacity-30"
        style={{
          background: 'radial-gradient(circle at center, rgba(20, 241, 149, 0.15) 0%, transparent 50%)',
        }}
      />
      
      {/* Logo with animated ring */}
      <div className="relative flex items-center justify-center">
        {/* Rotating ring around logo */}
        <svg 
          className="absolute w-24 h-24 animate-spin" 
          style={{ animationDuration: '2.5s' }} 
          viewBox="0 0 100 100"
        >
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="url(#loaderGradient)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray="80 200"
          />
          <defs>
            <linearGradient id="loaderGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#14F195" />
              <stop offset="50%" stopColor="#9945FF" />
              <stop offset="100%" stopColor="#14F195" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>
        
        {/* Logo in center */}
        <img 
          src="/logof.png" 
          alt="" 
          className="w-12 h-12 relative z-10"
          style={{
            filter: 'drop-shadow(0 0 12px rgba(20, 241, 149, 0.4))',
          }}
        />
      </div>
    </div>
  );
}

export default function IntlProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>(defaultLocale);
  const [messages, setMessages] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const detectedLocale = getClientLocale();
    setLocale(detectedLocale);
    
    // Загружаем сообщения синхронно для быстрой загрузки
    // Минимальная задержка для плавного появления (150ms)
    const loadMessages = async () => {
      try {
        const module = await messageLoaders[detectedLocale]();
        setMessages(module.default);
        // Небольшая задержка для плавного перехода от лоадера к контенту
        setTimeout(() => setIsLoading(false), 150);
      } catch {
        // Fallback to default locale on error
        try {
          const module = await messageLoaders[defaultLocale]();
          setMessages(module.default);
          setTimeout(() => setIsLoading(false), 150);
        } catch {
          // Если даже fallback не загрузился, все равно скрываем лоадер
          setIsLoading(false);
        }
      }
    };
    
    loadMessages();
  }, []);

  // Show loading screen while messages are loading
  // This prevents MISSING_MESSAGE errors by not rendering components that need translations
  if (isLoading || !messages) {
    return <LoadingScreen />;
  }

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      {children}
    </NextIntlClientProvider>
  );
}

