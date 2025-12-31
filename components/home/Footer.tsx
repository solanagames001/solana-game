'use client';

import { memo, useCallback, useState, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useWallet } from '@solana/wallet-adapter-react';
import { toast } from '@/lib/sdk/toast';
import WalletModal from '@/components/WalletModal';
import { useTranslations } from 'next-intl';

function FooterImpl() {
  const t = useTranslations('footer');
  const tNav = useTranslations('nav');
  const tToast = useTranslations('toast');
  const { connected } = useWallet();
  const [walletModalOpen, setWalletModalOpen] = useState(false);
  
  const contractAddress = useMemo(
    () => process.env.NEXT_PUBLIC_PROGRAM_ID || 'FFSUvsPMP3LcmLtbV7Mb91wGhCyF5sHRx3C6N57GTjn3',
    []
  );

  const copyAddress = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(contractAddress);
      toast.success(tToast('contractCopied'));
    } catch {
      toast.error(tToast('copyFailed'));
    }
  }, [contractAddress, tToast]);

  // Handle protected navigation
  const handleProtectedClick = useCallback((e: React.MouseEvent, href: string) => {
    if (!connected) {
      e.preventDefault();
      setWalletModalOpen(true);
    }
  }, [connected]);

  return (
    <footer className="relative w-full bg-black text-white overflow-hidden">
      {/* Top gradient fade */}
      <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-black to-transparent pointer-events-none z-10" />

      {/* Decorative elements */}
      <div className="absolute top-16 left-1/2 -translate-x-1/2 w-2/3 max-w-xl h-px bg-gradient-to-r from-transparent via-[#14F195]/20 to-transparent" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,rgba(20,241,149,0.05),transparent_60%)]" />

      {/* Main Content */}
      <div className="relative z-10 mx-auto max-w-6xl px-6 pt-20 pb-8 pb-safe">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-8">
          
          {/* Logo & Description */}
          <div className="sm:col-span-2 lg:col-span-1 flex flex-col items-center sm:items-start text-center sm:text-left">
            <Link href="/" className="group relative">
              <Image
                src="/logo.png"
                alt="Solana Program X3"
                width={140}
                height={36}
                className="object-contain select-none opacity-90 group-hover:opacity-100 transition-opacity w-[140px] h-auto"
                priority
              />
              <div className="absolute -inset-4 rounded-full bg-[#14F195]/10 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
            </Link>
            <p className="mt-4 text-sm text-white/50 leading-relaxed max-w-xs">
              {t('description')}
            </p>
            
            {/* Social Links */}
            <div className="mt-6 flex items-center gap-3">
              <SocialLink href="https://t.me/+x2jEqV03TFkyZTll" label="Telegram">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/>
                </svg>
              </SocialLink>
              <SocialLink href="https://x.com/solanagame1?s=21&t=jqNvbr-J-X2h6oTZp5aVFA" label="Twitter">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
              </SocialLink>
              <SocialLink href="https://youtube.com/@solanagame?si=7IhkMIz9zCNQmiyg" label="YouTube">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                </svg>
              </SocialLink>
              <SocialLink href="https://t.me/SolanaGame_Administration" label="Support">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </SocialLink>
            </div>
          </div>

          {/* Smart Contract */}
          <div className="flex flex-col items-center sm:items-start text-center sm:text-left">
            <h3 className="text-xs uppercase tracking-[0.15em] text-white/40 font-medium mb-4">
              {t('smartContract')}
            </h3>
            <button
              onClick={copyAddress}
              className="group w-full max-w-[220px] flex items-center justify-between gap-2 rounded-xl bg-[#111113] border border-white/10 px-4 py-3 hover:border-[#14F195]/30 transition-all"
            >
              <span className="font-mono text-xs text-white/60 truncate">
                {contractAddress.slice(0, 6)}...{contractAddress.slice(-6)}
              </span>
              <svg className="w-4 h-4 text-white/40 group-hover:text-[#14F195] transition-colors flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="9" y="9" width="13" height="13" rx="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
            </button>
            <p className="mt-3 text-[11px] text-white/30 max-w-[200px]">
              {t('verifyExplorer')}
            </p>
            
            {/* Explorer Link */}
            <a
              href={`https://explorer.solana.com/address/${contractAddress}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-1.5 text-xs text-[#14F195]/70 hover:text-[#14F195] transition-colors"
            >
              <span>{t('viewOnExplorer')}</span>
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </a>
          </div>

          {/* Platform Links */}
          <div className="flex flex-col items-center sm:items-start text-center sm:text-left">
            <h3 className="text-xs uppercase tracking-[0.15em] text-white/40 font-medium mb-4">
              {t('platform')}
            </h3>
            <ul className="space-y-2.5">
              <NavItem 
                href="/dashboard" 
                onClick={(e) => handleProtectedClick(e, '/dashboard')}
                protected={!connected}
              >
                {tNav('dashboard')}
              </NavItem>
              <NavItem 
                href="/levels" 
                onClick={(e) => handleProtectedClick(e, '/levels')}
                protected={!connected}
              >
                {t('gameLevels')}
              </NavItem>
              <NavItem 
                href="/history" 
                onClick={(e) => handleProtectedClick(e, '/history')}
                protected={!connected}
              >
                {tNav('history')}
              </NavItem>
              <NavItem 
                href="/partner-bonus" 
                onClick={(e) => handleProtectedClick(e, '/partner-bonus')}
                protected={!connected}
              >
                {tNav('partnerBonus')}
              </NavItem>
            </ul>
          </div>

          {/* Resources */}
          <div className="flex flex-col items-center sm:items-start text-center sm:text-left">
            <h3 className="text-xs uppercase tracking-[0.15em] text-white/40 font-medium mb-4">
              {t('resources')}
            </h3>
            <ul className="space-y-2.5">
              <NavItem href="/docs">{t('docs')}</NavItem>
              <NavItem href="/information">{t('howItWorks')}</NavItem>
              <NavItem href="/telegram-bots">{tNav('support')}</NavItem>
              <NavItem href="/disclaimer">{t('disclaimer')}</NavItem>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-6 border-t border-white/5">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-white/30">
            <p>© 2025 Solana Program X3. {t('allRightsReserved')}.</p>
            
            <div className="flex items-center gap-6">
              <span className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#14F195] opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#14F195]" />
                </span>
                {t('mainnet')}
              </span>
              
              {connected && (
                <span className="flex items-center gap-2 text-[#14F195]/60">
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {t('walletConnected')}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Wallet Modal */}
      <WalletModal open={walletModalOpen} onClose={() => setWalletModalOpen(false)} />
    </footer>
  );
}

const Footer = memo(FooterImpl);
Footer.displayName = 'Footer';

export default Footer;

/* ----------------------------------------------------
   Helper Components
---------------------------------------------------- */
function SocialLink({ 
  href, 
  label, 
  children 
}: { 
  href: string; 
  label: string; 
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className="w-10 h-10 rounded-xl bg-[#111113] border border-white/10 flex items-center justify-center text-white/50 hover:text-[#14F195] hover:border-[#14F195]/30 transition-all"
    >
      {children}
    </a>
  );
}

function NavItem({ 
  href, 
  children,
  onClick,
  protected: isProtected = false,
}: { 
  href: string; 
  children: React.ReactNode;
  onClick?: (e: React.MouseEvent) => void;
  protected?: boolean;
}) {
  return (
    <li>
      <Link 
        href={href} 
        onClick={onClick}
        className="group inline-flex items-center gap-2 text-sm text-white/50 hover:text-white transition-colors"
      >
        <span>{children}</span>
        {isProtected && (
          <svg className="w-3 h-3 text-white/30 group-hover:text-[#14F195]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="11" width="18" height="11" rx="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        )}
      </Link>
    </li>
  );
}
