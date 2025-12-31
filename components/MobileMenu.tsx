'use client';

import { useCallback, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { toast } from '@/lib/sdk/toast';
import { useTranslations } from 'next-intl';

interface MobileMenuProps {
  open: boolean;
  onClose: () => void;
  onRegister: () => void;
  onDashboard: () => void;
  onConnect: () => void;
  onDisconnect: () => void;
  connected: boolean;
  connecting?: boolean;
  hasPlayer: boolean;
  checkingPlayer?: boolean;
  registerLoading?: boolean;
  address?: string | null;
}

export default function MobileMenu({
  open,
  onClose,
  onRegister,
  onDashboard,
  onConnect,
  onDisconnect,
  connected,
  connecting,
  hasPlayer,
  checkingPlayer,
  registerLoading,
  address,
}: MobileMenuProps) {
  const t = useTranslations('common');
  const tMenu = useTranslations('mobileMenu');
  const tToast = useTranslations('toast');
  
  /* ------------------------------------------------------------
     SAFE LOCK (useRef, no re-render, mobile-safe)
  ------------------------------------------------------------ */
  const lockRef = useRef(false);

  const safe = (fn: () => void) => {
    if (lockRef.current) return;
    lockRef.current = true;
    fn();
    setTimeout(() => {
      lockRef.current = false;
    }, 400);
  };

  /* ------------------------------------------------------------
     Swipe to close handler
  ------------------------------------------------------------ */
  const handleDragEnd = useCallback(
    (_: unknown, info: { offset: { y: number }; velocity: { y: number } }) => {
      // If swiped down more than 80px or with velocity > 500, close the menu
      if (info.offset.y > 80 || info.velocity.y > 500) {
        onClose();
      }
    },
    [onClose]
  );

  /* ------------------------------------------------------------
     Helpers
  ------------------------------------------------------------ */
  const short = useCallback((addr?: string | null) => {
    if (!addr) return '';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  }, []);

  const copyAddress = useCallback(async () => {
    if (!address) return;

    try {
      if (!navigator.clipboard) {
        toast.error(tToast('clipboardNotSupported'));
        return;
      }
      await navigator.clipboard.writeText(address);
      toast.success(tToast('addressCopied'));
    } catch {
      toast.error(tToast('copyFailed'));
    }
  }, [address, tToast]);

  /* ============================== RENDER ============================== */

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* OVERLAY */}
          <motion.div
            aria-label="Close menu overlay"
            className="fixed inset-0 z-[1200] bg-black/90 backdrop-blur-md sm:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />

          {/* BOTTOM PANEL - DRAGGABLE */}
          <motion.div
            className="fixed bottom-0 left-0 right-0 z-[1201] sm:hidden bg-black rounded-t-3xl overflow-hidden touch-none"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.5 }}
            onDragEnd={handleDragEnd}
          >
            {/* Drag handle area - larger touch target */}
            <div className="flex justify-center pt-4 pb-3 cursor-grab active:cursor-grabbing">
              <div className="w-12 h-1.5 rounded-full bg-white/30" />
            </div>
            
            {/* Swipe hint */}
            <div className="text-center text-[9px] text-white/20 uppercase tracking-widest pb-3">
              {t('swipeToClose')}
            </div>

            <div className="px-6 pb-8 pt-2 pb-safe">
              {/* WALLET INFO (if connected) */}
              <AnimatePresence mode="wait">
                {connected && address && (
                  <motion.div
                    key="wallet-info"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                    className="mb-6"
                  >
                  <div className="text-[10px] uppercase tracking-[0.15em] text-white/40 mb-2">
                    {t('connectedWallet')}
                  </div>
                  <div className="flex items-center justify-between rounded-xl bg-[#111113] p-4">
                    <div className="flex items-center gap-3">
                      {/* Wallet icon */}
                      <div className="w-10 h-10 rounded-full bg-[#14F195]/10 flex items-center justify-center">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#14F195" strokeWidth="2">
                          <path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1" />
                          <path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4" />
                        </svg>
                      </div>
                      <div>
                        <button
                          onClick={() => safe(copyAddress)}
                          className="font-mono text-sm text-white hover:text-[#14F195] transition-colors"
                        >
                          {short(address)}
                        </button>
                        <div className="text-[10px] text-white/40 mt-0.5">
                          {t('tapToCopy')}
                        </div>
                      </div>
                    </div>
                    {/* Status indicator */}
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-[#14F195] animate-pulse" />
                      <span className="text-[10px] uppercase tracking-wider text-[#14F195]">
                        {t('active')}
                      </span>
                    </div>
                  </div>
                </motion.div>
                )}
              </AnimatePresence>

              {/* PRIMARY ACTION BUTTON */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
              >
                {connecting ? (
                  <PrimaryButton
                    label={tMenu('connecting')}
                    disabled
                    onClick={() => {}}
                    loading
                  />
                ) : !connected ? (
                  <PrimaryButton
                    label={tMenu('connectWallet')}
                  onClick={() =>
                    safe(() => {
                      onConnect();
                      onClose();
                    })
                  }
                    icon={
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1" />
                        <path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4" />
                      </svg>
                    }
                />
              ) : !hasPlayer ? (
                  <PrimaryButton
                    label={registerLoading ? tMenu('creatingProfile') : tMenu('createProfile')}
                  disabled={registerLoading || checkingPlayer}
                    loading={registerLoading}
                  onClick={() =>
                    safe(() => {
                      onRegister();
                      onClose();
                    })
                  }
                    icon={
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                        <circle cx="9" cy="7" r="4" />
                        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                      </svg>
                    }
                />
              ) : (
                  <PrimaryButton
                    label={tMenu('goToDashboard')}
                  onClick={() =>
                    safe(() => {
                      onDashboard();
                      onClose();
                    })
                  }
                    icon={
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="3" width="7" height="7" rx="1" />
                        <rect x="14" y="3" width="7" height="7" rx="1" />
                        <rect x="3" y="14" width="7" height="7" rx="1" />
                        <rect x="14" y="14" width="7" height="7" rx="1" />
                      </svg>
                    }
                  />
                )}
              </motion.div>

              {/* DISCONNECT BUTTON */}
              <AnimatePresence mode="wait">
                {connected && (
                  <motion.button
                    key="disconnect-btn"
                    initial={{ opacity: 0, height: 0, marginTop: 0 }}
                    animate={{ opacity: 1, height: 'auto', marginTop: 12 }}
                    exit={{ opacity: 0, height: 0, marginTop: 0 }}
                    transition={{ 
                      duration: 0.25,
                      ease: [0.4, 0, 0.2, 1],
                      opacity: { duration: 0.2 }
                    }}
                    onClick={() =>
                      safe(() => {
                        onDisconnect();
                        onClose();
                      })
                    }
                    className="w-full py-3.5 rounded-xl bg-[#111113] text-white/60 text-sm font-medium
                               hover:bg-[#1a1a1a] hover:text-white/80 transition-colors duration-200 overflow-hidden"
                  >
                    {t('disconnectWallet')}
                  </motion.button>
                )}
              </AnimatePresence>

              {/* CLOSE BUTTON (alternative to swipe) */}
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.2 }}
                onClick={onClose}
                className="mt-4 w-full py-3 text-center text-white/20 text-xs uppercase tracking-wider
                           hover:text-white/40 transition-colors duration-200 flex items-center justify-center gap-2"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
                {t('close')}
              </motion.button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/* ------------------------------------------------------------
   Primary Button Component
------------------------------------------------------------ */
function PrimaryButton({
  label,
  onClick,
  disabled,
  loading,
  icon,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="
        relative w-full py-4 rounded-xl font-semibold text-black text-base
        bg-[#14F195] overflow-hidden
        hover:shadow-[0_0_30px_rgba(20,241,149,0.4)]
        active:scale-[0.98] transition-all duration-200
        disabled:opacity-60 disabled:cursor-not-allowed
        flex items-center justify-center gap-2
      "
    >
      {loading ? (
        <div className="w-5 h-5 rounded-full border-2 border-black border-t-transparent animate-spin flex-shrink-0" />
      ) : icon ? (
        <span className="opacity-80 flex-shrink-0">{icon}</span>
      ) : null}
      <span>{label}</span>
      
      {/* Shimmer effect on hover */}
      <div 
        className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent
                   group-hover:translate-x-full transition-transform duration-700 pointer-events-none"
      />
    </button>
  );
}
