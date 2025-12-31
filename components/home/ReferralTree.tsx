'use client';

import { useMemo, useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslations, useLocale } from 'next-intl';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { useWalletBalance } from '@/lib/sdk/hooks/useWalletBalance';
import { loadLocalHistory, clearReferralEvents } from '@/lib/sdk/history/local';
import { withSyntheticClosures } from '@/lib/sdk/history/derive';
import { toast } from '@/lib/sdk/toast';
import type { TxEvent } from '@/lib/sdk/history/types';
import { CLUSTER } from '@/lib/sdk/pda';

/* ------------------------------------------------------------
   Types
------------------------------------------------------------ */

interface ReferralNode {
  address: string;
  shortAddress: string;
  registeredAt: number;
  line: 1 | 2 | 3;
  earnings?: number; // Заработок от этого реферала в SOL
  isOwner?: boolean; // Является ли реферал owner (получал недавно REWARD_60)
}

interface LineStats {
  count: number;
  earnings: number;
}

/* ------------------------------------------------------------
   Helpers
------------------------------------------------------------ */

interface ParsedReferral {
  address: string;
  line: 1 | 2 | 3;
}

function parseReferralAddress(sig: string): ParsedReferral | null {
  // Новый формат: referral-registered-line{1|2|3}-<address>-<timestamp>
  const newFormatMatch = sig.match(/^referral-registered-line([123])-([A-Za-z0-9]{32,44})-\d+$/);
  if (newFormatMatch) {
    return {
      address: newFormatMatch[2],
      line: parseInt(newFormatMatch[1], 10) as 1 | 2 | 3,
    };
  }
  
  // Старый формат: referral-registered-<address>-<timestamp> (только линия 1)
  const oldFormatMatch = sig.match(/^referral-registered-([A-Za-z0-9]{32,44})-\d+$/);
  if (oldFormatMatch) {
    return {
      address: oldFormatMatch[1],
      line: 1,
    };
  }
  
  return null;
}

function shortAddr(address: string): string {
  if (address.length <= 10) return address;
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

function getRelativeTime(ts: number, tHistory: (key: string) => string, locale: string = 'en'): string {
  const now = Date.now();
  const diffMs = now - ts;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return tHistory('justNow');
  if (diffMins < 60) return `${diffMins}${tHistory('mAgo')}`;
  if (diffHours < 24) return `${diffHours}${tHistory('hAgo')}`;
  if (diffDays < 7) return `${diffDays}${tHistory('dAgo')}`;
  
  // Для дат старше недели используем локализованное форматирование
  const localeCode = locale === 'en' ? 'en-US' : locale === 'ru' ? 'ru-RU' : locale === 'de' ? 'de-DE' : locale === 'es' ? 'es-ES' : locale === 'fr' ? 'fr-FR' : locale === 'pt' ? 'pt-PT' : locale === 'tr' ? 'tr-TR' : locale === 'id' ? 'id-ID' : locale === 'ko' ? 'ko-KR' : locale === 'ja' ? 'ja-JP' : locale === 'zh' ? 'zh-CN' : locale === 'vi' ? 'vi-VN' : 'en-US';
  
  return new Date(ts).toLocaleDateString(localeCode, { 
    month: 'short', 
    day: 'numeric'
  });
}

function getExplorerUrl(address: string): string {
  const base = 'https://explorer.solana.com/address';
  const cluster = CLUSTER === 'mainnet-beta' ? '' : `?cluster=${CLUSTER}`;
  return `${base}/${address}${cluster}`;
}

// Рассчитываем примерный заработок по типу события
function getEarningsFromEvent(kind: string, levelId: number): number {
  // Цены уровней в SOL
  const LEVEL_PRICES = [0.1, 0.15, 0.25, 0.5, 0.75, 1, 1.5, 2, 3, 4, 5, 7];
  const price = LEVEL_PRICES[levelId - 1] || 0.1;
  
  // Проценты по линиям
  switch (kind) {
    case 'REF_T1_13': return price * 0.13;
    case 'REF_T2_8': return price * 0.08;
    case 'REF_T3_5': return price * 0.05;
    default: return 0;
  }
}

/* ------------------------------------------------------------
   Component
------------------------------------------------------------ */

export default function ReferralTree() {
  const t = useTranslations('referralTree');
  const tHistory = useTranslations('history');
  const locale = useLocale();
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const { balance, isLoading: balanceLoading } = useWalletBalance();
  const [referrals, setReferrals] = useState<ReferralNode[]>([]);
  const [lineStats, setLineStats] = useState<Record<number, LineStats>>({
    1: { count: 0, earnings: 0 },
    2: { count: 0, earnings: 0 },
    3: { count: 0, earnings: 0 },
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedLines, setExpandedLines] = useState<Set<number>>(new Set([1, 2, 3]));
  const [copiedLink, setCopiedLink] = useState(false);

  const walletAddress = publicKey?.toBase58();

  // Реферальная ссылка
  const referralLink = useMemo(() => {
    if (!walletAddress) return '';
    const base = typeof window !== 'undefined' ? window.location.origin : '';
    return `${base}/?ref=${walletAddress}`;
  }, [walletAddress]);

  // Определяем линии рефералов
  const referralsByLine = useMemo(() => {
    const byLine: Record<number, ReferralNode[]> = { 1: [], 2: [], 3: [] };
    
    referrals.forEach(ref => {
      byLine[ref.line].push(ref);
    });

    // Сортируем по дате регистрации (новые первыми)
    Object.keys(byLine).forEach(line => {
      byLine[Number(line)].sort((a, b) => b.registeredAt - a.registeredAt);
    });

    return byLine;
  }, [referrals]);

  // Загрузка рефералов из истории
  const loadReferrals = useCallback(async () => {
    if (!walletAddress) {
      setReferrals([]);
      setLoading(false);
      return;
    }

    try {
      // Загружаем историю
      const allEvents: TxEvent[] = withSyntheticClosures(
        loadLocalHistory(walletAddress)
      );

      const nodes: ReferralNode[] = [];
      const stats: Record<number, LineStats> = {
        1: { count: 0, earnings: 0 },
        2: { count: 0, earnings: 0 },
        3: { count: 0, earnings: 0 },
      };
      const seenAddresses = new Set<string>();
      const earningsByAddress: Record<string, number> = {};

      // 1. Сначала собираем заработки по событиям REF_T*
      const refEvents = allEvents.filter(ev => 
        ev.kind === 'REF_T1_13' || ev.kind === 'REF_T2_8' || ev.kind === 'REF_T3_5'
      );

      for (const event of refEvents) {
        const earnings = getEarningsFromEvent(event.kind, event.levelId);
        const line = event.kind === 'REF_T1_13' ? 1 : event.kind === 'REF_T2_8' ? 2 : 3;
        stats[line].earnings += earnings;
      }

      // 2. Затем собираем рефералов из REFERRAL_REGISTERED событий (все три линии)
      const registeredEvents = allEvents.filter(
        ev => ev.kind === 'REFERRAL_REGISTERED'
      );

      // Собираем всех рефералов из событий
      // ВАЖНО: По логике Rust, один реферал может быть только в ОДНОЙ линии для конкретного пользователя
      // Поэтому мы просто добавляем все события как есть - каждое событие указывает правильную линию
      const referralsByAddressAndLine: Record<string, Map<number, ReferralNode>> = {};

      for (const event of registeredEvents) {
        const parsed = parseReferralAddress(event.sig);
        if (!parsed) continue;

        const { address, line } = parsed;
        
        // Используем составной ключ для уникальности (адрес + линия)
        // Это предотвращает дубликаты, если одно и то же событие появилось несколько раз
        const uniqueKey = `${address}-line${line}`;
        if (seenAddresses.has(uniqueKey)) continue;

        seenAddresses.add(uniqueKey);
        
        if (!referralsByAddressAndLine[address]) {
          referralsByAddressAndLine[address] = new Map();
        }

        // Добавляем реферала с правильной линией из события
        const referral: ReferralNode = {
          address,
          shortAddress: shortAddr(address),
          registeredAt: event.ts,
          line, // Используем линию из события (она была определена трекером на основе блокчейна)
          earnings: earningsByAddress[address] || 0,
        };

        // Сохраняем по линии - если для одного адреса есть события на разных линиях
        // (что теоретически не должно происходить по логике Rust, но может быть из-за старых данных),
        // мы сохраняем все, но при отображении возьмем приоритетную
        referralsByAddressAndLine[address].set(line, referral);
        stats[line].count++;
      }

      // Добавляем рефералов в nodes
      // Если для одного адреса есть события на нескольких линиях (старые данные),
      // показываем реферала в приоритетной линии (1 > 2 > 3)
      // Но обычно должно быть только одно событие на адрес
      for (const [address, lineMap] of Object.entries(referralsByAddressAndLine)) {
        // Приоритет: линия 1 > линия 2 > линия 3
        // Это гарантирует, что если есть несколько событий для одного адреса (не должно быть),
        // мы покажем реферала в самой приоритетной линии
        const referral = lineMap.get(1) || lineMap.get(2) || lineMap.get(3);
        if (referral) {
          nodes.push(referral);
        }
      }

      // 3. Определение owner рефералов временно отключено
      // Для точного определения owner нужно читать очередь из блокчейна для каждого уровня,
      // что требует множества RPC-запросов и может быть медленным.
      // TODO: В будущем можно добавить оптимизированное чтение очереди из блокчейна
      // для точного определения owner рефералов

      setReferrals(nodes);
      setLineStats(stats);
    } catch (err) {
      console.error('[ReferralTree] Failed to load referrals:', err);
      setReferrals([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [walletAddress]);

  useEffect(() => {
    loadReferrals();
    
    // Обновляем при изменении истории
    const handler = () => loadReferrals();
    window.addEventListener('levels-history-changed', handler);
    
    return () => {
      window.removeEventListener('levels-history-changed', handler);
    };
  }, [loadReferrals]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadReferrals();
  }, [loadReferrals]);

  const toggleLine = useCallback((line: number) => {
    setExpandedLines(prev => {
      const next = new Set(prev);
      if (next.has(line)) {
        next.delete(line);
      } else {
        next.add(line);
      }
      return next;
    });
  }, []);

  const copyReferralLink = useCallback(async () => {
    if (!referralLink) return;
    
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopiedLink(true);
      toast.success(t('linkCopied'));
      setTimeout(() => setCopiedLink(false), 2000);
    } catch (err) {
      console.warn('[ReferralTree] Failed to copy link:', err);
      toast.error('Failed to copy');
    }
  }, [referralLink, t]);

  // Если нет подключенного кошелька
  if (!walletAddress) {
    return null;
  }

  const totalReferrals = referrals.length;
  const totalEarnings = lineStats[1].earnings + lineStats[2].earnings + lineStats[3].earnings;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="relative mb-6 sm:mb-8"
    >
      <div className="rounded-2xl border border-white/10 bg-[#0b0c0f]/70 backdrop-blur-sm px-4 pt-4 pb-5 sm:px-6 sm:pt-6 sm:pb-7">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-1">
              {t('title')}
            </h2>
            <p className="text-xs sm:text-sm text-white/50">
              {t('subtitle', { count: totalReferrals })}
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Wallet Balance */}
            {publicKey && (
              <div className="flex items-baseline gap-1">
                <span className="text-base sm:text-2xl font-semibold tracking-tight text-white">
                  {balanceLoading ? '...' : balance !== null ? balance.toFixed(2) : '—'}
                </span>
                <span className="text-[10px] sm:text-sm text-white/30 font-medium">SOL</span>
              </div>
            )}

            {totalReferrals > 0 && (
              <div className="text-right pl-3 border-l border-white/10">
                <div className="text-lg sm:text-xl font-semibold text-[#14F195]">
                  {totalReferrals}
                </div>
                <div className="text-[10px] sm:text-xs text-white/40">
                  {t('total')}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Referral Link Section */}
        <div className="mb-4 sm:mb-6 p-3 sm:p-4 rounded-xl bg-gradient-to-r from-[#14F195]/10 to-[#9945FF]/10 border border-[#14F195]/20">
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="text-xs text-white/50 mb-1">{t('yourLink')}</div>
              <div className="text-xs sm:text-sm font-mono text-white/80 truncate">
                {referralLink}
              </div>
            </div>
            <button
              onClick={copyReferralLink}
              className={`
                flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg font-medium text-xs sm:text-sm
                transition-all duration-300
                ${copiedLink 
                  ? 'bg-[#14F195] text-black' 
                  : 'bg-[#14F195]/20 text-[#14F195] hover:bg-[#14F195]/30'
                }
              `}
            >
              {copiedLink ? (
                <>
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span className="hidden sm:inline">{t('copied')}</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                  <span className="hidden sm:inline">{t('copyLink')}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Total Earnings Summary */}
        {totalEarnings > 0 && (
          <div className="mb-4 sm:mb-6 grid grid-cols-3 gap-2 sm:gap-3">
            {[1, 2, 3].map(line => (
              <div
                key={line}
                className={`
                  p-2 sm:p-3 rounded-xl text-center
                  ${LINE_COLORS[line as 1 | 2 | 3].bg} border ${LINE_COLORS[line as 1 | 2 | 3].border}
                `}
              >
                <div className={`text-xs sm:text-sm font-semibold ${LINE_COLORS[line as 1 | 2 | 3].text}`}>
                  {lineStats[line].earnings.toFixed(3)}
                </div>
                <div className="text-[10px] text-white/40">
                  {t('line', { number: line })} SOL
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Loading state */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(line => (
              <div key={line} className="animate-pulse">
                <div className="h-12 rounded-xl bg-white/5" />
              </div>
            ))}
          </div>
        ) : totalReferrals === 0 ? (
          <div className="text-center py-8 sm:py-12">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[#14F195]/10 flex items-center justify-center">
              <svg
                className="w-8 h-8 text-[#14F195]"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path
                  d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0z"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <p className="text-sm sm:text-base text-white/50 mb-2">
              {t('noReferrals')}
            </p>
            <p className="text-xs sm:text-sm text-white/30">
              {t('shareLink')}
            </p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[400px] sm:max-h-[500px] overflow-y-auto pr-1 pb-2">
            {/* Line 1 */}
            <ReferralLine
              line={1}
              referrals={referralsByLine[1]}
              stats={lineStats[1]}
              isExpanded={expandedLines.has(1)}
              onToggle={() => toggleLine(1)}
              t={t}
              tHistory={tHistory}
              locale={locale}
            />

            {/* Line 2 */}
            <ReferralLine
              line={2}
              referrals={referralsByLine[2]}
              stats={lineStats[2]}
              isExpanded={expandedLines.has(2)}
              onToggle={() => toggleLine(2)}
              t={t}
              tHistory={tHistory}
              locale={locale}
            />

            {/* Line 3 */}
            <ReferralLine
              line={3}
              referrals={referralsByLine[3]}
              stats={lineStats[3]}
              isExpanded={expandedLines.has(3)}
              onToggle={() => toggleLine(3)}
              t={t}
              tHistory={tHistory}
              locale={locale}
            />
          </div>
        )}
      </div>
    </motion.div>
  );
}

/* ------------------------------------------------------------
   ReferralLine Component
------------------------------------------------------------ */

interface ReferralLineProps {
  line: 1 | 2 | 3;
  referrals: ReferralNode[];
  stats: LineStats;
  isExpanded: boolean;
  onToggle: () => void;
  t: ReturnType<typeof useTranslations<'referralTree'>>;
  tHistory: ReturnType<typeof useTranslations<'history'>>;
  locale: string;
}

const LINE_COLORS = {
  1: { bg: 'bg-[#14F195]/10', border: 'border-[#14F195]/30', text: 'text-[#14F195]', accent: '#14F195' },
  2: { bg: 'bg-[#9945FF]/10', border: 'border-[#9945FF]/30', text: 'text-[#9945FF]', accent: '#9945FF' },
  3: { bg: 'bg-[#00FFA3]/10', border: 'border-[#00FFA3]/30', text: 'text-[#00FFA3]', accent: '#00FFA3' },
};

const LINE_PERCENTAGES = {
  1: '13%',
  2: '8%',
  3: '5%',
};

function ReferralLine({ line, referrals, stats, isExpanded, onToggle, t, tHistory, locale }: ReferralLineProps) {
  const colors = LINE_COLORS[line];
  const percentage = LINE_PERCENTAGES[line];
  const count = referrals.length;

  return (
    <div
      className={`
        rounded-xl border transition-all duration-300
        ${colors.bg} ${colors.border}
        ${count > 0 || stats.earnings > 0 ? 'hover:border-opacity-50' : 'opacity-50'}
      `}
    >
      {/* Header */}
      <button
        onClick={onToggle}
        disabled={count === 0}
        className={`
          w-full flex items-center justify-between p-3 sm:p-4
          transition-colors
          ${count > 0 ? 'cursor-pointer hover:bg-white/5' : 'cursor-not-allowed'}
        `}
      >
        <div className="flex items-center gap-3">
          <div 
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: colors.accent }}
          />
          <div className="text-left">
            <div className="text-sm sm:text-base font-semibold text-white">
              {t('line', { number: line })} ({percentage})
            </div>
            <div className="text-xs text-white/50">
              {count === 0
                ? t('noReferralsInLine')
                : t('referralsCount', { count })}
              {stats.earnings > 0 && (
                <span className={`ml-2 ${colors.text}`}>
                  +{stats.earnings.toFixed(3)} SOL
                </span>
              )}
            </div>
          </div>
        </div>

        {count > 0 && (
          <div className="flex items-center gap-2">
            <span className={`text-xs font-medium ${colors.text}`}>
              {count}
            </span>
            <svg
              className={`w-4 h-4 text-white/40 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        )}
      </button>

      {/* Referrals list */}
      <AnimatePresence>
        {isExpanded && count > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-3 sm:px-4 pb-3 sm:pb-4">
              <div className="max-h-[300px] overflow-y-auto space-y-2 pr-1">
                {referrals.map((ref) => (
                  <ReferralItem key={ref.address} referral={ref} t={t} tHistory={tHistory} locale={locale} />
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ------------------------------------------------------------
   ReferralItem Component
------------------------------------------------------------ */

interface ReferralItemProps {
  referral: ReferralNode;
  t: ReturnType<typeof useTranslations<'referralTree'>>;
  tHistory: ReturnType<typeof useTranslations<'history'>>;
  locale: string;
}

function ReferralItem({ referral, t, tHistory, locale }: ReferralItemProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(referral.address);
      setCopied(true);
      toast.success(t('addressCopied'));
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.warn('[ReferralItem] Failed to copy:', err);
    }
  }, [referral.address, t]);

  const handleOpenExplorer = useCallback(() => {
    window.open(getExplorerUrl(referral.address), '_blank', 'noopener,noreferrer');
  }, [referral.address]);

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex items-center justify-between p-2.5 sm:p-3 rounded-lg bg-black/30 hover:bg-black/50 transition-colors group"
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0">
          <svg
            className="w-4 h-4 text-white/60"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path
              d="M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0zM12 14a7 7 0 0 0-7 7h14a7 7 0 0 0-7-7z"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <div className="flex-1 min-w-0">
          <div
            className={`text-xs sm:text-sm font-mono cursor-pointer hover:text-[#14F195] transition-colors truncate ${
              referral.isOwner ? 'text-red-400 font-semibold' : 'text-white'
            }`}
            onClick={handleCopy}
            title={referral.address}
          >
            {referral.shortAddress}
            {referral.isOwner && (
              <span className="ml-2 text-[10px] text-red-400/70" title="Owner - скоро получите прибыль">👑</span>
            )}
          </div>
          <div className="text-[10px] sm:text-xs text-white/40 flex items-center gap-2">
            <span>{getRelativeTime(referral.registeredAt, tHistory, locale)}</span>
            {referral.earnings && referral.earnings > 0 && (
              <span className="text-[#14F195]">+{referral.earnings.toFixed(3)} SOL</span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {/* Copy button */}
        <button
          onClick={handleCopy}
          className={`
            p-1.5 rounded-lg transition-all
            ${copied ? 'bg-[#14F195]/20 text-[#14F195]' : 'bg-white/5 hover:bg-white/10 text-white/60'}
          `}
          title={t('copyAddress')}
        >
          {copied ? (
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ) : (
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
          )}
        </button>

        {/* Explorer link */}
        <button
          onClick={handleOpenExplorer}
          className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-white/60"
          title={t('viewExplorer')}
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" strokeLinecap="round" strokeLinejoin="round" />
            <polyline points="15,3 21,3 21,9" strokeLinecap="round" strokeLinejoin="round" />
            <line x1="10" y1="14" x2="21" y2="3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </motion.div>
  );
}
