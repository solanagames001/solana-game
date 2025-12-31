'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslations } from 'next-intl';

import { useWallet, type Wallet } from '@solana/wallet-adapter-react';
import type { WalletName } from '@solana/wallet-adapter-base';
import { WalletReadyState } from '@solana/wallet-adapter-base';

type Props = { open: boolean; onClose: () => void };

// Цвета для разных кошельков
const WALLET_COLORS: Record<string, { gradient: string; glow: string; hover: string }> = {
    Phantom: {
        gradient: 'from-[#AB9FF2] to-[#6B5DD3]',
        glow: 'rgba(171,159,242,0.3)',
        hover: 'rgba(171,159,242,0.5)',
    },
    Solflare: {
        gradient: 'from-[#14F195] to-[#0FA86E]',
        glow: 'rgba(20,241,149,0.3)',
        hover: 'rgba(20,241,149,0.5)',
    },
    Backpack: {
        gradient: 'from-[#FF6B6B] to-[#EE5A6F]',
        glow: 'rgba(255,107,107,0.3)',
        hover: 'rgba(255,107,107,0.5)',
    },
    Ledger: {
        gradient: 'from-[#1C1C1E] to-[#2C2C2E]',
        glow: 'rgba(255,255,255,0.1)',
        hover: 'rgba(255,255,255,0.2)',
    },
    Exodus: {
        gradient: 'from-[#7B3FE4] to-[#5A2DB0]',
        glow: 'rgba(123,63,228,0.3)',
        hover: 'rgba(123,63,228,0.5)',
    },
};

export default function WalletModal({ open, onClose }: Props) {
    const t = useTranslations('wallet');
    const [mounted, setMounted] = useState(false);
    const [connectingWallet, setConnectingWallet] = useState<WalletName | null>(null);
    
    useEffect(() => {
        setMounted(true);
    }, []);

    const { wallets, select, connect, connected, wallet } = useWallet();

    // Проверка реальной доступности кошелька
    // Проверяет не только наличие расширения, но и его реальную доступность
    const checkWalletAvailable = useCallback((walletName: string): boolean => {
        if (typeof window === 'undefined') return false;
        
        const nameLower = walletName.toLowerCase();
        
        // Специальная проверка для Phantom
        // window.solana.isPhantom существует только если Phantom установлен и доступен
        if (nameLower === 'phantom') {
            const solana = (window as any).solana;
            // Проверяем, что solana существует и это Phantom
            // Если кошелек заблокирован, solana все равно существует, но может быть недоступен
            // Поэтому проверяем наличие isPhantom - это означает, что расширение установлено
            return !!(solana && solana.isPhantom);
        }
        
        // Специальная проверка для Solflare
        if (nameLower === 'solflare') {
            return !!(window as any).solflare;
        }
        
        // Специальная проверка для Backpack
        if (nameLower === 'backpack') {
            return !!(window as any).backpack;
        }
        
        // Проверяем через Wallet Standard API
        // Это более надежный способ для современных кошельков
        try {
            const standardWallets = (window.navigator as any).wallets;
            if (standardWallets && Array.isArray(standardWallets)) {
                const found = standardWallets.find((w: any) => {
                    const wName = w.name?.toLowerCase() || '';
                    return wName === nameLower || wName.includes(nameLower);
                });
                // Если найден через Wallet Standard, считаем доступным
                if (found) return true;
            }
        } catch (e) {
            // Игнорируем ошибки при проверке
        }
        
        return false;
    }, []);

    // Подготовка всех доступных кошельков
    const availableWallets = useMemo(() => {
        return (wallets as Wallet[]).map((wallet) => {
            const ready = wallet.readyState;
            const walletName = wallet.adapter.name;
            
            // Проверяем реальную доступность кошелька
            // WalletReadyState.Installed означает, что расширение установлено
            // WalletReadyState.Loadable означает, что можно загрузить
            const isReadyStateInstalled = ready === WalletReadyState.Installed;
            const isReadyStateLoadable = ready === WalletReadyState.Loadable;
            
            // Проверяем реальную доступность через Wallet Standard API и window объекты
            // Это важно, так как кошелек может быть установлен, но заблокирован
            const isActuallyAvailable = checkWalletAvailable(walletName);
            
            // Кошелек считается установленным только если:
            // 1. Он в состоянии Installed И реально доступен через API
            //    (это предотвращает показ кошельков, которых нет, как установленных)
            // 2. ИЛИ он в состоянии Loadable (можно установить через ссылку)
            // 
            // Важно: Если кошелек в состоянии Installed, но не доступен через API,
            // значит он либо не установлен, либо заблокирован - не показываем как установленный
            const installed = (isReadyStateInstalled && isActuallyAvailable) || isReadyStateLoadable;
            
            const colors = WALLET_COLORS[walletName] || {
                gradient: 'from-white/20 to-white/10',
                glow: 'rgba(255,255,255,0.1)',
                hover: 'rgba(255,255,255,0.2)',
            };

            return {
                id: walletName,
                name: walletName,
                icon: wallet.adapter.icon as string,
                installed,
                url: wallet.adapter.url,
                colors,
            };
        });
    }, [wallets, checkWalletAvailable]);

    // Сортируем: установленные кошельки первыми
    const sortedWallets = useMemo(() => {
        return [...availableWallets].sort((a, b) => {
            if (a.installed && !b.installed) return -1;
            if (!a.installed && b.installed) return 1;
            return 0;
        });
    }, [availableWallets]);

    const handleConnect = useCallback(async (walletName: WalletName) => {
        setConnectingWallet(walletName);
        try {
            // Шаг 1: Проверяем, что кошелек доступен
            const selectedWallet = wallets.find(w => w.adapter.name === walletName);
            if (!selectedWallet) {
                throw new Error(`Wallet ${walletName} not found`);
            }
            
            // Шаг 2: Выбираем кошелек
            // select() должен быть вызван синхронно перед connect()
            select(walletName);
            
            // Шаг 3: Ждем инициализации кошелька
            // На desktop может потребоваться больше времени для инициализации
            // Особенно для Wallet Standard кошельков (Phantom, Solflare)
            const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
            const waitTime = isMobile ? 150 : 400; // Больше времени для desktop
            
            await new Promise(r => setTimeout(r, waitTime));
            
            // Шаг 4: Проверяем, что кошелек выбран (для desktop)
            // На desktop кошелек должен быть выбран через select() перед connect()
            if (!isMobile && wallet?.adapter.name !== walletName) {
                // Повторно выбираем, если не совпадает
                select(walletName);
                await new Promise(r => setTimeout(r, 200));
            }
            
            // Шаг 5: Подключаемся
            // Если кошелек еще не готов, будет ошибка, которую мы обработаем
            await connect();
            
            // Шаг 6: Закрываем модальное окно после успешного подключения
            onClose();
        } catch (err: any) {
            // Игнорируем известные "не-ошибки", которые не требуют действия пользователя
            const errName = err?.name || '';
            const errMsg = err?.message || '';
            
            const isIgnorable = 
                errName === 'WalletNotSelectedError' ||
                errName === 'WalletNotReadyError' ||
                errMsg.includes('User rejected') ||
                errMsg.includes('wallet not found') ||
                errMsg.includes('Wallet not found');
            
            // Не логируем игнорируемые ошибки, чтобы не засорять консоль
            if (!isIgnorable) {
                console.warn('[WalletModal] connect failed:', err);
            }
            
            // Сбрасываем состояние при ошибке
            setConnectingWallet(null);
        }
    }, [select, connect, onClose, wallets, wallet]);

    // Закрываем модальное окно при подключении
    useEffect(() => {
        if (connected && open) {
            onClose();
        }
    }, [connected, open, onClose]);

    // Блокируем скролл
    useEffect(() => {
        if (!open) return;
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = prev;
        };
    }, [open]);

    // Обработка ESC
    useEffect(() => {
        if (!open) return;
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [open, onClose]);

    // Добавляем стили для кастомного скроллбара
    useEffect(() => {
        if (typeof document === 'undefined') return;
        
        const styleId = 'wallet-modal-scrollbar-styles';
        if (document.getElementById(styleId)) return;

        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            .wallet-modal-scrollbar::-webkit-scrollbar {
                width: 6px;
            }
            .wallet-modal-scrollbar::-webkit-scrollbar-track {
                background: transparent;
            }
            .wallet-modal-scrollbar::-webkit-scrollbar-thumb {
                background: rgba(255, 255, 255, 0.1);
                border-radius: 3px;
            }
            .wallet-modal-scrollbar::-webkit-scrollbar-thumb:hover {
                background: rgba(255, 255, 255, 0.2);
            }
        `;
        document.head.appendChild(style);

        return () => {
            const existingStyle = document.getElementById(styleId);
            if (existingStyle) {
                existingStyle.remove();
            }
        };
    }, []);

    if (!mounted || !open) return null;

    const modal = (
        <AnimatePresence>
            <motion.div
                className="fixed inset-0 z-[2000] flex items-center justify-center p-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
            >
                {/* Backdrop */}
                <motion.div
                    className="absolute inset-0 bg-black/80 backdrop-blur-md"
                    onClick={onClose}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                />

                {/* Modal */}
                <motion.div
                    className="relative z-10 w-full max-w-md max-h-[90vh] rounded-2xl bg-black border border-white/10 overflow-hidden flex flex-col"
                    initial={{ y: 50, opacity: 0, scale: 0.95 }}
                    animate={{ y: 0, opacity: 1, scale: 1 }}
                    exit={{ y: 30, opacity: 0, scale: 0.95 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Glow effect */}
                    <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-[300px] h-[200px] bg-[#14F195]/20 blur-[100px] pointer-events-none" />

                    {/* Header */}
                    <div className="relative flex items-center justify-between p-6 border-b border-white/10 flex-shrink-0">
                        <div>
                            <h2 className="text-xl font-bold text-white">
                                {t('connect')}
                            </h2>
                            <p className="text-sm text-white/40 mt-1">
                                {t('connectToContinue')}
                            </p>
                        </div>

                        <button
                            onClick={onClose}
                            className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 
                                       flex items-center justify-center
                                       hover:bg-white/10 hover:border-white/20 
                                       transition-all duration-200"
                        >
                            <svg className="w-5 h-5 text-white/60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </button>
                    </div>

                    {/* Content - scrollable */}
                    <div className="relative flex-1 overflow-y-auto min-h-0 wallet-modal-scrollbar">
                        <div className="p-6">
                            {sortedWallets.length > 0 ? (
                                <div className="space-y-3">
                                {sortedWallets.map((wallet) => {
                                    const isConnecting = connectingWallet === wallet.id;
                                    const colors = wallet.colors;

                                    return (
                                        <button
                                            key={wallet.id}
                                            onClick={() => wallet.installed ? handleConnect(wallet.id as WalletName) : undefined}
                                            disabled={isConnecting || !wallet.installed}
                                            className="w-full group relative rounded-2xl bg-[#111113] border border-white/10 
                                                       p-4 sm:p-5 hover:border-white/20 hover:bg-[#141416]
                                                       transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed
                                                       active:scale-[0.98]"
                                        >
                                            {/* Glow effect on hover */}
                                            <div 
                                                className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                                                style={{
                                                    background: `linear-gradient(to bottom, ${colors.glow}, transparent)`,
                                                }}
                                            />
                                            
                                            <div className="relative flex items-center gap-4">
                                                {/* Wallet Logo */}
                                                <div 
                                                    className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${colors.gradient} p-0.5 shadow-lg group-hover:shadow-xl transition-shadow flex-shrink-0`}
                                                    style={{
                                                        boxShadow: wallet.installed 
                                                            ? `0 0 30px ${colors.glow}` 
                                                            : 'none',
                                                    }}
                                                >
                                                    <div className="w-full h-full rounded-[14px] bg-[#1C1C1E] flex items-center justify-center overflow-hidden">
                                                        {wallet.icon ? (
                                                            <img
                                                                src={wallet.icon}
                                                                alt={wallet.name}
                                                                className="w-9 h-9 object-contain"
                                                            />
                                                        ) : (
                                                            <div className="w-8 h-8 rounded-full bg-white/10" />
                                                        )}
                                                    </div>
                                                </div>
                                                
                                                <div className="flex-1 text-left min-w-0">
                                                    <div className="text-base font-semibold text-white mb-0.5 truncate">
                                                        {isConnecting ? t('connecting') : wallet.name}
                                                    </div>
                                                    <div className="text-xs text-white/40">
                                                        {wallet.installed ? (
                                                            <span className="flex items-center gap-1.5">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-[#14F195] animate-pulse" />
                                                                {t('readyToConnect')}
                                                            </span>
                                                        ) : (
                                                            <span className="flex items-center gap-1.5">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-white/30" />
                                                                {t('notInstalled')}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Action Button/Arrow */}
                                                {wallet.installed ? (
                                                    <div 
                                                        className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-[#14F195] group-hover:border-[#14F195] transition-all flex-shrink-0"
                                                        style={{
                                                            backgroundColor: isConnecting ? 'transparent' : undefined,
                                                            borderColor: isConnecting ? 'transparent' : undefined,
                                                        }}
                                                    >
                                                        {isConnecting ? (
                                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                        ) : (
                                                            <svg className="w-4 h-4 text-white/60 group-hover:text-black transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                                <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                                                            </svg>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <a
                                                        href={wallet.url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        onClick={(e) => e.stopPropagation()}
                                                        className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all flex-shrink-0"
                                                    >
                                                        <svg className="w-4 h-4 text-white/60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3" strokeLinecap="round" strokeLinejoin="round" />
                                                        </svg>
                                                    </a>
                                                )}
                                            </div>
                                        </button>
                                    );
                                })}
                                </div>
                            ) : (
                                <div className="text-center py-8">
                                    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[#AB9FF2]/10 flex items-center justify-center">
                                        <svg className="w-8 h-8 text-[#AB9FF2]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                            <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                        </svg>
                                    </div>
                                    <h3 className="text-lg font-semibold text-white mb-2">
                                        {t('phantomNotFound')}
                                    </h3>
                                    <p className="text-sm text-white/40 mb-6">
                                        {t('pleaseInstall')}
                                    </p>
                                </div>
                            )}

                            {/* Footer note */}
                            <p className="mt-6 text-center text-xs text-white/30">
                                {t('byConnecting')}
                            </p>
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );

    return createPortal(modal, document.body);
}
