'use client';

import { memo, useMemo, useCallback, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useWallet } from '@solana/wallet-adapter-react';
import WalletModal from '@/components/WalletModal';
import { useTranslations } from 'next-intl';

/* ----------------------------------------------------
   Floating Blockchain Nodes (3D-like visualization)
---------------------------------------------------- */
function BlockchainNodes() {
  const nodes = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => ({
      id: i,
      x: 10 + Math.random() * 80,
      y: 10 + Math.random() * 80,
      size: 4 + Math.random() * 8,
      delay: Math.random() * 2,
      duration: 3 + Math.random() * 2,
    }));
  }, []);

  const connections = useMemo(() => {
    const conns: { x1: number; y1: number; x2: number; y2: number; delay: number }[] = [];
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dist = Math.hypot(nodes[i].x - nodes[j].x, nodes[i].y - nodes[j].y);
        if (dist < 35) {
          conns.push({
            x1: nodes[i].x,
            y1: nodes[i].y,
            x2: nodes[j].x,
            y2: nodes[j].y,
            delay: Math.random() * 2,
          });
        }
      }
    }
    return conns;
  }, [nodes]);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <svg className="w-full h-full opacity-20">
        {/* Connection lines */}
        {connections.map((conn, i) => (
          <motion.line
            key={`line-${i}`}
            x1={`${conn.x1}%`}
            y1={`${conn.y1}%`}
            x2={`${conn.x2}%`}
            y2={`${conn.y2}%`}
            stroke="#14F195"
            strokeWidth="1"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.6, 0] }}
            transition={{
              duration: 3,
              delay: conn.delay,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        ))}
        
        {/* Nodes */}
        {nodes.map((node) => (
          <motion.circle
            key={`node-${node.id}`}
            cx={`${node.x}%`}
            cy={`${node.y}%`}
            r={node.size}
            fill="#14F195"
            initial={{ opacity: 0, scale: 0 }}
            animate={{
              opacity: [0.3, 0.8, 0.3],
              scale: [0.8, 1.2, 0.8],
            }}
            transition={{
              duration: node.duration,
              delay: node.delay,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        ))}
      </svg>
    </div>
  );
}

/* ----------------------------------------------------
   Stat Card
---------------------------------------------------- */
function StatCard({
  label,
  description,
  icon,
}: {
  label: string;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <div
      className="relative rounded-2xl bg-black border border-white/10 p-6 sm:p-8 text-center
                 hover:border-[#14F195]/30 transition-all duration-300 group overflow-hidden"
    >
      {/* Glow effect */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-t from-[#14F195]/10 via-transparent to-transparent" />
      </div>

      <div className="relative z-10">
        <div className="mx-auto mb-4 w-14 h-14 rounded-xl bg-[#14F195]/10 border border-[#14F195]/20 flex items-center justify-center text-[#14F195]">
          {icon}
        </div>
        
        <h3 className="text-lg sm:text-xl font-semibold text-white mb-2">
          {label}
        </h3>
        
        <p className="text-xs sm:text-sm text-white/50 leading-relaxed">
          {description}
        </p>
      </div>
    </div>
  );
}

/* ----------------------------------------------------
   Orbiting Ring Animation
---------------------------------------------------- */
function OrbitingRing() {
  return (
    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] pointer-events-none opacity-20">
      {/* Outer ring */}
      <motion.div
        className="absolute inset-0 rounded-full border border-[#14F195]/30"
        animate={{ rotate: 360 }}
        transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
      >
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-[#14F195] shadow-[0_0_15px_#14F195]" />
      </motion.div>
      
      {/* Middle ring */}
      <motion.div
        className="absolute inset-[80px] rounded-full border border-[#9945FF]/30"
        animate={{ rotate: -360 }}
        transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
      >
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-[#9945FF] shadow-[0_0_10px_#9945FF]" />
      </motion.div>
      
      {/* Inner ring */}
      <motion.div
        className="absolute inset-[160px] rounded-full border border-white/10"
        animate={{ rotate: 360 }}
        transition={{ duration: 15, repeat: Infinity, ease: 'linear' }}
      >
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-white/60" />
      </motion.div>
    </div>
  );
}

/* ----------------------------------------------------
   Icons
---------------------------------------------------- */
const WorldwideNetworkIcon = () => (
  <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <circle cx="12" cy="12" r="10" />
    <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
  </svg>
);

const ThrivingCommunityIcon = () => (
  <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <circle cx="9" cy="7" r="4" />
    <path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" />
    <circle cx="17" cy="7" r="3" />
    <path d="M21 21v-2a3 3 0 0 0-3-3h-1" />
  </svg>
);

const AlwaysSupportedIcon = () => (
  <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <circle cx="12" cy="12" r="10" />
    <path d="M12 16v-4M12 8h.01" strokeLinecap="round" />
  </svg>
);

const CollectiveWinsIcon = () => (
  <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" strokeLinecap="round" strokeLinejoin="round" />
    <polyline points="22 4 12 14.01 9 11.01" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/* ----------------------------------------------------
   Main Component
---------------------------------------------------- */
function StatsSectionImpl() {
  const t = useTranslations('stats');
  const router = useRouter();
  const { connected } = useWallet();
  const [walletModalOpen, setWalletModalOpen] = useState(false);

  // Navigate to dashboard when connected
  useEffect(() => {
    if (connected && walletModalOpen) {
      setWalletModalOpen(false);
      router.push('/levels');
    }
  }, [connected, walletModalOpen, router]);

  const handleStartClick = useCallback(() => {
    if (connected) {
      router.push('/levels');
    } else {
      setWalletModalOpen(true);
    }
  }, [connected, router]);

  const communityCards = useMemo(() => [
    {
      label: t('worldwideNetwork'),
      description: t('worldwideNetworkDesc'),
      icon: <WorldwideNetworkIcon />,
    },
    {
      label: t('thrivingCommunity'),
      description: t('thrivingCommunityDesc'),
      icon: <ThrivingCommunityIcon />,
    },
    {
      label: t('alwaysSupported'),
      description: t('alwaysSupportedDesc'),
      icon: <AlwaysSupportedIcon />,
    },
    {
      label: t('collectiveWins'),
      description: t('collectiveWinsDesc'),
      icon: <CollectiveWinsIcon />,
    },
  ], [t]);

  return (
    <section className="relative bg-black py-20 sm:py-24 md:py-32 overflow-hidden">
      {/* Top fade for smooth transition */}
      <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-black to-transparent pointer-events-none z-20" />
      
      {/* Bottom fade for smooth transition */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black to-transparent pointer-events-none z-20" />

      {/* Background effects */}
      <BlockchainNodes />
      <OrbitingRing />
      
      {/* Gradient overlays */}
      <div className="absolute inset-0 bg-gradient-to-b from-black via-transparent to-black pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-radial from-[#14F195]/5 via-transparent to-transparent blur-3xl pointer-events-none" />

      <div className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6">
        {/* Header */}
        <div className="text-center mb-12 sm:mb-16">
          <div className="inline-block mb-3 sm:mb-4">
            <span className="text-[10px] sm:text-xs uppercase tracking-[0.2em] text-[#14F195]/60 font-medium">
              {t('title')}
            </span>
          </div>

          <h2 className="text-2xl sm:text-3xl md:text-5xl font-bold text-white">
            {t('growingEverySecond')}
          </h2>

          <p className="mt-4 text-white/40 max-w-xl mx-auto text-sm sm:text-base">
            {t('description')}
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {communityCards.map((card, i) => (
            <StatCard
              key={i}
              label={card.label}
              description={card.description}
              icon={card.icon}
            />
          ))}
        </div>

        {/* CTA */}
        <div className="mt-12 sm:mt-16 text-center">
          <button
            onClick={handleStartClick}
            className="inline-flex items-center gap-3 px-8 sm:px-12 py-4 sm:py-5 rounded-full
                       bg-gradient-to-r from-[#14F195] to-[#0fd182] text-black font-bold text-base sm:text-lg
                       shadow-[0_0_40px_rgba(20,241,149,0.3)] hover:shadow-[0_0_60px_rgba(20,241,149,0.5)]
                       transform hover:scale-105 transition-all duration-300 cursor-pointer"
          >
            <span>{connected ? t('goToDashboard') : t('startEarning')}</span>
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          <p className="mt-4 text-white/30 text-xs sm:text-sm">
            {connected ? t('walletConnected') : t('noHiddenFees')}
          </p>
        </div>

        {/* Wallet Modal */}
        <WalletModal open={walletModalOpen} onClose={() => setWalletModalOpen(false)} />

        {/* Bottom decorative line */}
        <div className="mt-16 sm:mt-20 h-px bg-gradient-to-r from-transparent via-[#14F195]/30 to-transparent" />
      </div>
    </section>
  );
}

const StatsSection = memo(StatsSectionImpl);
StatsSection.displayName = 'StatsSection';

export default StatsSection;

