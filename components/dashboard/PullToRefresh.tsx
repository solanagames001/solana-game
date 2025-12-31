"use client";

import { useState, useRef, useCallback, useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";

interface PullToRefreshProps {
  children: ReactNode;
}

const PULL_THRESHOLD = 80; // Pixels to pull before triggering refresh
const MAX_PULL = 120; // Maximum pull distance

export default function PullToRefresh({ children }: PullToRefreshProps) {
  const router = useRouter();
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const isPulling = useRef(false);
  const isRefreshingRef = useRef(false);

  // Синхронизируем ref с state
  useEffect(() => {
    isRefreshingRef.current = isRefreshing;
  }, [isRefreshing]);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    // Only enable pull-to-refresh when scrolled to top
    const container = containerRef.current;
    if (!container) return;
    
    // Check if we're at the top of scroll
    if (container.scrollTop <= 0) {
      startY.current = e.touches[0].clientY;
      isPulling.current = true;
    }
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isPulling.current || isRefreshingRef.current) return;

    const container = containerRef.current;
    if (!container || container.scrollTop > 0) {
      isPulling.current = false;
      setPullDistance(0);
      return;
    }

    const currentY = e.touches[0].clientY;
    const diff = currentY - startY.current;

    if (diff > 0) {
      // Prevent default scroll when pulling down
      e.preventDefault();
      
      // Apply resistance to make it feel natural
      const resistance = 0.5;
      const distance = Math.min(diff * resistance, MAX_PULL);
      setPullDistance(distance);
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (!isPulling.current) return;
    isPulling.current = false;

    setPullDistance((currentDistance) => {
      if (currentDistance >= PULL_THRESHOLD && !isRefreshingRef.current) {
        setIsRefreshing(true);
        const keepDistance = PULL_THRESHOLD / 2; // Keep indicator visible during refresh

        // Refresh the page
        setTimeout(() => {
          router.refresh();
          
          // Reset state after a short delay
          setTimeout(() => {
            setIsRefreshing(false);
            setPullDistance(0);
          }, 500);
        }, 300);

        return keepDistance;
      } else {
        // Animate back to zero
        return 0;
      }
    });
  }, [router]);

  // Используем нативные обработчики с passive: false для touchmove
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Добавляем обработчики с passive: false для touchmove, чтобы можно было вызывать preventDefault
    container.addEventListener("touchstart", handleTouchStart, { passive: true });
    container.addEventListener("touchmove", handleTouchMove, { passive: false });
    container.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      container.removeEventListener("touchstart", handleTouchStart);
      container.removeEventListener("touchmove", handleTouchMove);
      container.removeEventListener("touchend", handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  const progress = Math.min(pullDistance / PULL_THRESHOLD, 1);
  const showIndicator = pullDistance > 10 || isRefreshing;

  return (
    <div
      ref={containerRef}
      className="relative h-full overflow-y-auto"
      style={{ touchAction: pullDistance > 0 ? "none" : "auto" }}
    >
      {/* Pull Indicator */}
      <div
        className="absolute left-0 right-0 flex justify-center pointer-events-none z-50 transition-opacity duration-200"
        style={{
          top: pullDistance - 40,
          opacity: showIndicator ? 1 : 0,
        }}
      >
        <div
          className={`
            flex items-center justify-center
            w-10 h-10 rounded-full
            bg-[#111113] border border-white/10
            shadow-lg shadow-black/50
            transition-transform duration-200
            ${isRefreshing ? "scale-100" : ""}
          `}
          style={{
            transform: `scale(${0.5 + progress * 0.5}) rotate(${progress * 360}deg)`,
          }}
        >
          {isRefreshing ? (
            // Spinning loader
            <div className="w-5 h-5 rounded-full border-2 border-[#14F195] border-t-transparent animate-spin" />
          ) : (
            // Arrow icon
            <svg
              className="w-5 h-5 text-[#14F195] transition-transform duration-200"
              style={{
                transform: `rotate(${progress >= 1 ? 180 : 0}deg)`,
              }}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19 14l-7 7m0 0l-7-7m7 7V3"
              />
            </svg>
          )}
        </div>
      </div>

      {/* Content wrapper with pull transform */}
      <div
        className="transition-transform duration-200 ease-out"
        style={{
          transform: pullDistance > 0 ? `translateY(${pullDistance}px)` : "none",
          transitionDuration: isPulling.current ? "0ms" : "200ms",
        }}
      >
        {children}
      </div>
    </div>
  );
}

