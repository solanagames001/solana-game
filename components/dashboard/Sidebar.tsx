"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
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

function InfoIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
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

function TelegramIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function SupportIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/* NAVIGATION CONFIG                                                          */
/* -------------------------------------------------------------------------- */

const NAV_ITEMS = [
  { href: "/dashboard", labelKey: "dashboard", Icon: DashboardIcon },
  { href: "/levels", labelKey: "levels", Icon: LevelsIcon },
  { href: "/history", labelKey: "history", Icon: HistoryIcon },
  { href: "/information", labelKey: "information", Icon: InfoIcon },
  { href: "/partner-bonus", labelKey: "partnerBonus", Icon: PartnerIcon },
  { href: "/telegram-bots", labelKey: "telegram", Icon: TelegramIcon },
] as const;

function isActive(path: string | null, href: string): boolean {
  if (!path) return false;
  if (path === href) return true;
  return path.startsWith(href + "/");
}

/* -------------------------------------------------------------------------- */
/* COMPONENT                                                                  */
/* -------------------------------------------------------------------------- */

export default function Sidebar() {
  const t = useTranslations('nav');
  const pathname = usePathname();

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  /* ========================================================================== */
  /* DESKTOP SIDEBAR ONLY                                                       */
  /* ========================================================================== */

  return (
    <aside
      className="hidden lg:flex h-full w-64 shrink-0 flex-col bg-black text-white"
      role="navigation"
      aria-label="Sidebar navigation"
    >
      {/* Logo */}
      <div className="mb-6 flex flex-col items-start px-5 pt-5 select-none">
        <img
          src="/logo.png"
          alt="Logo"
          width={140}
          height={32}
          className="object-contain opacity-90 transition-opacity hover:opacity-100 w-[140px] h-auto"
        />
      </div>

      {/* Menu */}
      <nav className="flex-1 px-3 pb-4 overflow-y-auto">
        <ul className="space-y-1">
          {NAV_ITEMS.map(({ href, labelKey, Icon }) => {
            const active = isActive(pathname, href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  prefetch={false}
                  className={`
                    flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200
                    ${active
                      ? "bg-[#111113] text-white"
                      : "text-white/40 hover:text-white/70 hover:bg-[#111113]/50"
                    }
                  `}
                >
                  <Icon className={`w-5 h-5 ${active ? "text-[#14F195]" : "text-white/40"}`} />
                  {t(labelKey)}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Support button */}
      <div className="mt-auto px-4 py-4">
        <a
          href="https://t.me/SolanaGame_Administration"
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-center gap-2 w-full rounded-xl bg-[#111113] py-3 text-sm font-medium text-white/70 hover:bg-[#161618] hover:text-white transition-colors"
        >
          <SupportIcon className="w-4 h-4" />
          {t('support')}
        </a>
      </div>
    </aside>
  );
}
