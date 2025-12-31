'use client';

import { useState, useEffect, Suspense, lazy } from 'react';
import TopStats from '@/components/home/TopStats';
import HeroSection from '@/components/home/HeroSection';
import ReferralTree from '@/components/home/ReferralTree';

// Lazy load components below the fold for better performance
const InfoSection = lazy(() => import('@/components/home/InfoSection'));
const TechnologySection = lazy(() => import('@/components/home/TechnologySection'));
const GameMechanicsSection = lazy(() => import('@/components/home/GameMechanicsSection'));
const StatsSection = lazy(() => import('@/components/home/StatsSection'));
const FaqSection = lazy(() => import('@/components/home/FaqSection'));
const Footer = lazy(() => import('@/components/home/Footer'));

/* ----------------------------------------------------
   Skeleton Component
---------------------------------------------------- */
function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      className={`relative overflow-hidden bg-[#1a1a1a] ${className}`}
      style={{ borderRadius: 'inherit' }}
    >
      <div
        className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite]"
        style={{
          background:
            'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.06) 50%, transparent 100%)',
        }}
      />
    </div>
  );
}

function SectionSkeleton() {
  return (
    <div className="min-h-[400px] bg-black py-12 sm:py-16">
      <div className="max-w-6xl mx-auto px-4">
        <Skeleton className="h-8 w-64 rounded-lg mx-auto mb-8" />
        <div className="space-y-4">
          <Skeleton className="h-4 w-full rounded" />
          <Skeleton className="h-4 w-5/6 rounded mx-auto" />
          <Skeleton className="h-4 w-4/6 rounded mx-auto" />
        </div>
      </div>
    </div>
  );
}

/* ----------------------------------------------------
   Loading Fallback
---------------------------------------------------- */
function LoadingFallback() {
  return <SectionSkeleton />;
}

/* ----------------------------------------------------
   Main Component
---------------------------------------------------- */
export default function HomePage() {
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch and ensure smooth initial render
  useEffect(() => {
    // Use requestAnimationFrame for smoother transition
    requestAnimationFrame(() => {
      setMounted(true);
    });
  }, []);

  return (
    <main className="bg-black text-white overflow-x-hidden">
      {/* Above the fold - load immediately with fixed heights to prevent layout shift */}
      <TopStats />
      <HeroSection />
      
      {/* Referral Tree - show if wallet connected */}
      {mounted && (
        <div className="max-w-6xl mx-auto px-4 pt-8 sm:pt-12 pb-8 sm:pb-10">
          <ReferralTree />
        </div>
      )}
      
      {/* Below the fold - lazy load with suspense for better performance */}
      {mounted && (
        <>
          <Suspense fallback={<LoadingFallback />}>
            <InfoSection />
          </Suspense>
          
          <Suspense fallback={<LoadingFallback />}>
            <TechnologySection />
          </Suspense>
          
          <Suspense fallback={<LoadingFallback />}>
            <GameMechanicsSection />
          </Suspense>
          
          <Suspense fallback={<LoadingFallback />}>
            <StatsSection />
          </Suspense>
          
          <Suspense fallback={<LoadingFallback />}>
            <FaqSection />
          </Suspense>
          
          <Suspense fallback={null}>
            <Footer />
          </Suspense>
        </>
      )}

      {/* Shimmer animation keyframes */}
      <style jsx global>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </main>
  );
}
