"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

/* -------------------------------------------------------------------------- */
/* ICONS                                                                       */
/* -------------------------------------------------------------------------- */

function DashboardIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}

function LevelsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2L2 7l10 5 10-5-10-5z" />
      <path d="M2 17l10 5 10-5" />
      <path d="M2 12l10 5 10-5" />
    </svg>
  );
}

function HistoryIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function PartnerIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function MoreIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="1" />
      <circle cx="19" cy="12" r="1" />
      <circle cx="5" cy="12" r="1" />
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/* NAV ITEMS                                                                   */
/* -------------------------------------------------------------------------- */

const NAV_ITEMS = [
  { href: "/dashboard", labelKey: "home", Icon: DashboardIcon },
  { href: "/levels", labelKey: "levels", Icon: LevelsIcon },
  { href: "/history", labelKey: "history", Icon: HistoryIcon },
  { href: "/partner-bonus", labelKey: "partners", Icon: PartnerIcon },
];

const MORE_ITEMS = [
  { href: "/information", labelKey: "information" },
  { href: "/telegram-bots", labelKey: "telegram" },
];

function isActive(path: string | null, href: string): boolean {
  if (!path) return false;
  if (path === href) return true;
  return path.startsWith(href + "/");
}

/* -------------------------------------------------------------------------- */
/* COMPONENT                                                                   */
/* -------------------------------------------------------------------------- */

export default function BottomNav() {
  const t = useTranslations('nav');
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [showMore, setShowMore] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close more menu on route change
  useEffect(() => {
    setShowMore(false);
  }, [pathname]);

  if (!mounted) return null;

  const isMoreActive = MORE_ITEMS.some(item => isActive(pathname, item.href));

  return (
    <>
      {/* More Menu Overlay */}
      {showMore && (
        <div 
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setShowMore(false)}
        />
      )}

      {/* More Menu */}
      {showMore && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 lg:hidden">
          <div className="bg-[#111113] rounded-2xl p-2 min-w-[160px] shadow-[0_0_30px_rgba(0,0,0,0.5)]">
            {MORE_ITEMS.map(({ href, labelKey }) => {
              const active = isActive(pathname, href);
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setShowMore(false)}
                  className={`
                    block rounded-xl px-4 py-3 text-sm font-medium transition-colors
                    ${active 
                      ? "bg-[#14F195]/10 text-[#14F195]" 
                      : "text-white/60 hover:text-white hover:bg-white/5"
                    }
                  `}
                >
                  {t(labelKey)}
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 lg:hidden bg-black/95 backdrop-blur-md border-t border-white/5 pb-safe">
        <div className="flex items-center justify-around h-16 px-2 px-safe">
          {NAV_ITEMS.map(({ href, labelKey, Icon }) => {
            const active = isActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                className="flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors"
              >
                <Icon className={`w-5 h-5 ${active ? "text-[#14F195]" : "text-white/40"}`} />
                <span className={`text-[10px] font-medium ${active ? "text-[#14F195]" : "text-white/40"}`}>
                  {t(labelKey)}
                </span>
              </Link>
            );
          })}

          {/* More button */}
          <button
            onClick={() => setShowMore(!showMore)}
            className="flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors"
          >
            <MoreIcon className={`w-5 h-5 ${isMoreActive || showMore ? "text-[#14F195]" : "text-white/40"}`} />
            <span className={`text-[10px] font-medium ${isMoreActive || showMore ? "text-[#14F195]" : "text-white/40"}`}>
              {t('more')}
            </span>
          </button>
        </div>
      </nav>
    </>
  );
}

