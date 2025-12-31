'use client';

import { memo, useMemo } from 'react';
import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';

/* ----------------------------------------------------
   Иконки (тонкие, управляем цветом через currentColor)
---------------------------------------------------- */
const LevelIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" {...props}>
    <path d="M4 8l8-5 8 5v8l-8 5-8-5V8z" stroke="currentColor" strokeWidth="1.5" />
    <path d="M4 8l8 5 8-5" stroke="currentColor" strokeWidth="1.5" />
  </svg>
);

const RecycleIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" {...props}>
    <path
      d="M17 1l4 4-4 4M7 23l-4-4 4-4M21 5H12a7 7 0 0 0-7 7M3 19h9a7 7 0 0 0 7-7"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </svg>
);

const EarnIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" {...props}>
    <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.5" />
    <path
      d="M8.5 12h7M12 8.5v7"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </svg>
);

/* ----------------------------------------------------
   Подкарточка
---------------------------------------------------- */
const GameCard = memo(function GameCard({
  icon,
  title,
  text,
  color,
}: {
  icon: ReactNode;
  title: string;
  text: string;
  color: string;
}) {
  return (
    <div
      className="relative flex flex-col items-center text-center rounded-2xl border border-white/10
                 bg-black p-6 sm:p-8 overflow-hidden
                 hover:border-[#14F195]/30 hover:shadow-[0_0_30px_rgba(20,241,149,0.1)] transition-all duration-300 hover:scale-[1.02]"
    >
      <div className="mb-4 sm:mb-5 w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-[#14F195]/10 border border-[#14F195]/20 flex items-center justify-center" aria-hidden>
        <div className="w-6 h-6 sm:w-7 sm:h-7" style={{ color }}>
          {icon}
        </div>
      </div>
      <h3 className="text-base sm:text-lg md:text-xl font-semibold mb-2 sm:mb-3 text-white">{title}</h3>
      <p className="text-xs sm:text-sm text-white/50 leading-relaxed max-w-[280px]">
        {text}
      </p>

      {/* мягкий фоновый градиент */}
      <div
        className="pointer-events-none absolute inset-0 rounded-2xl opacity-10 blur-2xl"
        style={{
          background: `linear-gradient(to top, ${color}33 0%, transparent 100%)`,
        }}
      />
    </div>
  );
});

/* ----------------------------------------------------
   Основной компонент
---------------------------------------------------- */
function GameMechanicsSectionImpl({
  accentColor = 'green',
}: {
  accentColor?: 'green' | 'violet';
}) {
  const t = useTranslations('mechanics');
  const color = useMemo(() => accentColor === 'violet' ? '#9945FF' : '#14F195', [accentColor]);

  const items = useMemo(() => [
    {
      icon: <LevelIcon />,
      title: t('activateLevel'),
      text: t('activateLevelDesc'),
    },
    {
      icon: <RecycleIcon />,
      title: t('playRecycle'),
      text: t('playRecycleDesc'),
    },
    {
      icon: <EarnIcon />,
      title: t('earnUpgrade'),
      text: t('earnUpgradeDesc'),
    },
  ], [t]);

  return (
    <section className="relative bg-black py-16 sm:py-20 md:py-24 overflow-hidden">
      {/* Top fade for smooth transition */}
      <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-black to-transparent pointer-events-none z-10" />
      
      {/* Bottom fade for smooth transition */}
      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-black to-transparent pointer-events-none z-10" />

      {/* Верхний ореол */}
      <div
        className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 w-[600px] h-40 bg-gradient-to-b from-[#14F195]/10 via-transparent to-transparent blur-[100px]"
      />

      <div className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6 text-center">
        {/* Header */}
        <div className="inline-block mb-3 sm:mb-4">
          <span className="text-[10px] sm:text-xs uppercase tracking-[0.2em] text-[#14F195]/60 font-medium">
            {t('gameMechanics')}
          </span>
        </div>

        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white">
          {t('howSolanaGameWorks')}
        </h2>

        <p className="mt-3 sm:mt-4 text-white/40 max-w-xl mx-auto text-xs sm:text-sm md:text-base leading-relaxed">
          {t('description')}
        </p>

        {/* Карточки */}
        <div className="mt-10 sm:mt-12 md:mt-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 md:gap-6">
          {items.map((item) => (
            <GameCard key={item.title} {...item} color={color} />
          ))}
        </div>

        {/* Нижний ореол */}
        <div
          className="pointer-events-none mt-12 sm:mt-16 h-12 w-full blur-[80px]"
          style={{
            background: `linear-gradient(to bottom, ${color}30 0%, transparent 100%)`,
          }}
        />
      </div>
    </section>
  );
}

const GameMechanicsSection = memo(GameMechanicsSectionImpl);
GameMechanicsSection.displayName = 'GameMechanicsSection';

export default GameMechanicsSection;
