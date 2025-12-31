'use client';

import { memo, useMemo } from 'react';
import { useTranslations } from 'next-intl';

/* ----------------------------------------------------
   News Ticker - replaces stats section
---------------------------------------------------- */

const TICKER_KEYS = [
  { icon: 'sparkle', key: 'onChain' },
  { icon: 'lock', key: 'noAdminKeys' },
  { icon: 'bolt', key: 'instantPayouts' },
  { icon: 'shield', key: 'audited' },
  { icon: 'rocket', key: 'levels' },
  { icon: 'users', key: 'partnerBonus' },
  { icon: 'infinity', key: 'unlimited' },
] as const;

function TopStatsImpl() {
  const t = useTranslations('ticker');
  
  const tickerItems = useMemo(
    () => TICKER_KEYS.map(item => ({
      icon: item.icon,
      text: t(item.key),
    })),
    [t]
  );

  return (
    <div className="relative z-20 mx-auto max-w-6xl px-4 pt-4 pb-2">
      <div className="relative overflow-hidden rounded-2xl bg-black/80 backdrop-blur-md">
        {/* Gradient edges */}
        <div className="absolute left-0 top-0 bottom-0 w-12 sm:w-20 bg-gradient-to-r from-black/90 to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-12 sm:w-20 bg-gradient-to-l from-black/90 to-transparent z-10 pointer-events-none" />
        
        {/* Ticker content */}
        <div className="flex items-center py-3 whitespace-nowrap">
          <div className="flex items-center animate-marquee-smooth">
            {/* First set */}
            {tickerItems.map((item, i) => (
              <TickerItem key={`a-${i}`} icon={item.icon} text={item.text} />
            ))}
            {/* Duplicate for seamless loop */}
            {tickerItems.map((item, i) => (
              <TickerItem key={`b-${i}`} icon={item.icon} text={item.text} />
            ))}
            {/* Third set for extra smoothness */}
            {tickerItems.map((item, i) => (
              <TickerItem key={`c-${i}`} icon={item.icon} text={item.text} />
            ))}
          </div>
        </div>
      </div>

      <style jsx>{`
        .animate-marquee-smooth {
          animation: marquee-smooth 18s linear infinite;
          will-change: transform;
        }
        @keyframes marquee-smooth {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-33.333%);
          }
        }
      `}</style>
    </div>
  );
}

/* ----------------------------------------------------
   Ticker Item Component
---------------------------------------------------- */
const TickerItem = memo(function TickerItem({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="flex items-center gap-2 px-4 sm:px-6">
      <span className="text-[#14F195]">
        <TickerIcon name={icon} />
      </span>
      <span className="text-xs sm:text-sm text-white/70 font-medium">{text}</span>
      <span className="text-white/20 ml-2 sm:ml-4">|</span>
    </div>
  );
});

const TickerIcon = memo(function TickerIcon({ name }: { name: string }) {
  const icons: Record<string, JSX.Element> = {
    sparkle: (
      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2L14.09 8.26L20 9.27L15.55 13.97L16.91 20L12 16.9L7.09 20L8.45 13.97L4 9.27L9.91 8.26L12 2Z" />
      </svg>
    ),
    lock: (
      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="11" width="18" height="11" rx="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    ),
    bolt: (
      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
      </svg>
    ),
    shield: (
      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <path d="M9 12l2 2 4-4" />
      </svg>
    ),
    rocket: (
      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
        <path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
      </svg>
    ),
    users: (
      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
    infinity: (
      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M18.178 8c5.096 0 5.096 8 0 8-5.095 0-7.133-8-12.739-8-4.585 0-4.585 8 0 8 5.606 0 7.644-8 12.74-8z" />
      </svg>
    ),
  };

  return icons[name] || null;
});

const TopStats = memo(TopStatsImpl);
TopStats.displayName = 'TopStats';

export default TopStats;
