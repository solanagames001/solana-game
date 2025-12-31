'use client';

import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { useEffect, useState, useMemo, useCallback } from 'react';

/* ---------- Крутящийся бейдж со змейкой ---------- */
function RotatingBadge() {
  const size = 280;
  const r = 100;
  const cx = size / 2;
  const cy = size / 2;

  return (
    <div
      className="relative flex items-center justify-center"
      aria-hidden
      style={{ width: size, height: size }}
    >
      {/* Змейка - вращающийся градиент по кругу */}
      <div
        className="absolute inset-0 rounded-full animate-spin-snake"
        style={{
          background: `conic-gradient(
            from 0deg,
            transparent 0deg,
            transparent 60deg,
            #14F195 120deg,
            #00FFA3 180deg,
            #9945FF 240deg,
            transparent 300deg,
            transparent 360deg
          )`,
          mask: `radial-gradient(
            farthest-side,
            transparent calc(100% - 4px),
            #000 calc(100% - 4px) calc(100% - 1px),
            transparent calc(100% - 1px)
          )`,
          WebkitMask: `radial-gradient(
            farthest-side,
            transparent calc(100% - 4px),
            #000 calc(100% - 4px) calc(100% - 1px),
            transparent calc(100% - 1px)
          )`,
        }}
      />

      {/* Glow effect под змейкой */}
      <div
        className="absolute inset-2 rounded-full animate-spin-snake opacity-50 blur-md"
        style={{
          background: `conic-gradient(
            from 0deg,
            transparent 0deg,
            transparent 90deg,
            #14F195 150deg,
            #9945FF 210deg,
            transparent 270deg,
            transparent 360deg
          )`,
        }}
      />

      {/* SVG с текстом */}
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="absolute animate-spin-slow"
        style={{
          transformOrigin: 'center',
          overflow: 'visible',
          display: 'block',
        }}
      >
        <defs>
          <path
            id="badge-circle"
            d={`M ${cx} ${cy} m -${r},0 a ${r},${r} 0 1,1 ${r * 2},0 a ${r},${r} 0 1,1 -${r * 2},0`}
          />
        </defs>

        {/* Вращающийся текст */}
        <text
          className="uppercase tracking-[0.25em] text-[9px] fill-white/60"
          style={{
            fontFamily: 'Montserrat, sans-serif',
            transformOrigin: 'center',
          }}
        >
          <textPath href="#badge-circle" startOffset="0%">
            SOLANA PROGRAM X3 • FAST • SMART • BLOCKCHAIN • MATRIX • SOLANA •
            PROGRAM X3 • FAST • SMART • BLOCKCHAIN • MATRIX •
          </textPath>
        </text>
      </svg>

      {/* Внутренний круг */}
      <div
        className="absolute rounded-full bg-black border border-white/10"
        style={{ width: r * 0.7, height: r * 0.7 }}
      />

      {/* Логотип в центре */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <Image
          src="/logof.png"
          alt="Solana Game Logo"
          width={56}
          height={56}
          priority
          className="object-contain select-none drop-shadow-[0_0_20px_rgba(20,241,149,0.4)]"
        />
      </div>
    </div>
  );
}

/* ---------- Генерация фейковых транзакций ---------- */
const getRandomAddress = () =>
  Array.from({ length: 44 }, () =>
    '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'[
      Math.floor(Math.random() * 58)
    ]
  ).join('');
const getRandomSol = () => (Math.random() * 2 + 0.01).toFixed(3);
const getRandomSig = () =>
  Array.from({ length: 88 }, () =>
    '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'[
      Math.floor(Math.random() * 58)
    ]
  ).join('');

type TxLine = { id: string; text: string; color: string; type: 'send' | 'confirm' | 'call' };

/* ---------- Главная секция ---------- */
export default function HeroSection() {
  const [lines, setLines] = useState<TxLine[]>([]);
  const [mounted, setMounted] = useState(false);

  // Delay animation start until component is mounted to prevent layout shift
  useEffect(() => {
    setMounted(true);
  }, []);

  const addLine = useCallback(() => {
    const rand = Math.random();
    let line: TxLine;
    if (rand < 0.33) {
      line = {
        id: Math.random().toString(),
        text: `${getRandomSol()} SOL → ${getRandomAddress().slice(0, 4)}...${getRandomAddress().slice(-4)}`,
        color: '#14F195',
        type: 'send',
      };
    } else if (rand < 0.66) {
      line = {
        id: Math.random().toString(),
        text: `Confirmed ${getRandomSig().slice(0, 8)}...`,
        color: '#00FFA3',
        type: 'confirm',
      };
    } else {
      line = {
        id: Math.random().toString(),
        text: `activate_level(${Math.ceil(Math.random() * 16)})`,
        color: '#9945FF',
        type: 'call',
      };
    }
    setLines((p) => [...p.slice(-12), line]);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    
    // Start with a slight delay to ensure smooth initial render
    let interval: NodeJS.Timeout | null = null;
    const timeout = setTimeout(() => {
      interval = setInterval(addLine, 900);
    }, 300);
    
    return () => {
      clearTimeout(timeout);
      if (interval) clearInterval(interval);
    };
  }, [mounted, addLine]);

  // Memoize line slices to prevent unnecessary re-renders
  const leftLines = useMemo(() => lines.slice(0, 6), [lines]);
  const rightLines = useMemo(() => lines.slice(-6), [lines]);

  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center bg-black text-white overflow-hidden pt-16 will-change-transform">
      {/* Фоновая сетка */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
        }}
      />

      {/* Gradient glow в центре */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] opacity-20 blur-3xl pointer-events-none"
        style={{
          background: 'radial-gradient(circle, #14F195 0%, #9945FF 40%, transparent 70%)',
        }}
      />

      {/* ЗАГОЛОВОК - НАВЕРХУ */}
      <motion.div
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="relative z-10 text-center mb-8 md:mb-12 px-4"
      >
        <h1
          className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-wide"
          style={{ fontFamily: 'Montserrat, sans-serif' }}
        >
          <span className="bg-gradient-to-r from-[#9945FF] via-[#14F195] to-[#00FFA3] text-transparent bg-clip-text">
            SOLANA PROGRAM X3
          </span>
        </h1>
        <p className="mt-3 md:mt-4 text-sm md:text-base text-white/50 max-w-md mx-auto">
          Decentralized matrix system on Solana blockchain
        </p>
      </motion.div>

      {/* Контент - бейдж и транзакции */}
      <div className="relative z-10 flex flex-col md:flex-row items-center justify-center gap-6 md:gap-16 px-4">
        
        {/* Левые транзакции (уходят к кругу) */}
        <div className="hidden md:block w-[200px] h-[300px] overflow-hidden relative">
          <div className="absolute right-0 top-0 h-full flex flex-col justify-center">
            <AnimatePresence>
              {leftLines.map((line, i) => (
                <motion.div
                  key={line.id}
                  initial={{ opacity: 0, x: -50 }}
                  animate={{ 
                    opacity: [0, 1, 1, 0.3],
                    x: [-50, 0, 30, 60],
                  }}
                  exit={{ opacity: 0 }}
                  transition={{ 
                    duration: 3,
                    times: [0, 0.2, 0.7, 1],
                  }}
                  className="text-[10px] font-mono whitespace-nowrap mb-1.5 text-right"
                  style={{ 
                    color: line.color,
                    filter: `blur(${i > 4 ? 1 : 0}px)`,
                  }}
                >
                  {line.text}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

        {/* Бейдж */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 1, delay: 0.3 }}
        >
          <RotatingBadge />
        </motion.div>

        {/* Правые транзакции (уходят от круга) */}
        <div className="w-full md:w-[200px] max-w-[300px] h-[250px] md:h-[300px] overflow-hidden relative">
          <div className="absolute left-0 top-0 h-full flex flex-col justify-center">
            <AnimatePresence>
              {rightLines.map((line, i) => (
                <motion.div
                  key={line.id}
                  initial={{ opacity: 0, x: -30 }}
                  animate={{ 
                    opacity: [0, 0.3, 1, 1],
                    x: [-30, 0, 20, 50],
                  }}
                  exit={{ opacity: 0, x: 100 }}
                  transition={{ 
                    duration: 2.5,
                    times: [0, 0.1, 0.4, 1],
                  }}
                  className="text-[10px] md:text-[11px] font-mono whitespace-nowrap mb-1.5"
                  style={{ 
                    color: line.color,
                    filter: `blur(${i < 1 ? 0.5 : 0}px)`,
                  }}
                >
                  <span className="text-white/30 mr-1">›</span>
                  {line.text}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Подпись внизу */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, duration: 1 }}
        className="relative z-10 mt-6 md:mt-8 text-center"
      >
        <div className="flex items-center justify-center gap-2 text-[10px] md:text-xs text-white/30 uppercase tracking-widest">
          <div className="w-8 h-px bg-gradient-to-r from-transparent to-white/20" />
          <span>Powered by Solana</span>
          <div className="w-8 h-px bg-gradient-to-l from-transparent to-white/20" />
        </div>
      </motion.div>

      {/* Bottom fade for smooth transition */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black to-transparent pointer-events-none" />

      {/* Стили анимаций */}
      <style jsx global>{`
        .animate-spin-slow {
          animation: spin 25s linear infinite;
        }
        .animate-spin-snake {
          animation: spin 3s linear infinite;
        }
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </section>
  );
}
