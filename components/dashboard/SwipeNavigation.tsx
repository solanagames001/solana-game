"use client";

import { useRouter, usePathname } from "next/navigation";
import { useCallback, useRef, type ReactNode } from "react";
import { motion } from "framer-motion";

/* -------------------------------------------------------------------------- */
/* NAVIGATION ORDER                                                            */
/* -------------------------------------------------------------------------- */

const NAV_ORDER = [
  "/dashboard",
  "/levels",
  "/history",
  "/partner-bonus",
  "/information",
  "/telegram-bots",
];

/* -------------------------------------------------------------------------- */
/* SWIPE NAVIGATION WRAPPER                                                    */
/* -------------------------------------------------------------------------- */

interface SwipeNavigationProps {
  children: ReactNode;
}

export default function SwipeNavigation({ children }: SwipeNavigationProps) {
  const router = useRouter();
  const pathname = usePathname();
  const startX = useRef<number | null>(null);
  const startY = useRef<number | null>(null);

  // Find current index in navigation order
  const getCurrentIndex = useCallback(() => {
    const index = NAV_ORDER.findIndex((path) => {
      if (pathname === path) return true;
      return pathname?.startsWith(path + "/");
    });
    return index >= 0 ? index : 0;
  }, [pathname]);

  // Navigate to next/previous section
  const navigateTo = useCallback(
    (direction: "left" | "right") => {
      const currentIndex = getCurrentIndex();
      let newIndex: number;

      if (direction === "left") {
        // Swipe left = go to next section
        newIndex = Math.min(currentIndex + 1, NAV_ORDER.length - 1);
      } else {
        // Swipe right = go to previous section
        newIndex = Math.max(currentIndex - 1, 0);
      }

      if (newIndex !== currentIndex) {
        router.push(NAV_ORDER[newIndex]);
      }
    },
    [getCurrentIndex, router]
  );

  // Touch handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
  }, []);

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (startX.current === null || startY.current === null) return;

      const endX = e.changedTouches[0].clientX;
      const endY = e.changedTouches[0].clientY;

      const diffX = endX - startX.current;
      const diffY = endY - startY.current;

      // Only trigger if horizontal swipe is dominant and significant
      const minSwipeDistance = 80;
      const isHorizontalSwipe = Math.abs(diffX) > Math.abs(diffY) * 1.5;

      if (isHorizontalSwipe && Math.abs(diffX) > minSwipeDistance) {
        if (diffX > 0) {
          navigateTo("right");
        } else {
          navigateTo("left");
        }
      }

      startX.current = null;
      startY.current = null;
    },
    [navigateTo]
  );

  return (
    <motion.div
      className="min-h-full"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2 }}
    >
      {children}
    </motion.div>
  );
}

