"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/sdk/utils";

/**
 * Универсальная неон-карточка Solana Game Dashboard (v3.10)
 * — строгий минимализм
 * — мягкий glow (#14F195)
 * — темный фон без паразитных оттенков
 */
export default function Card({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      role="group"
      className={cn(
        "rounded-2xl border border-white/10 bg-[#0b0c0f]/70",
        "backdrop-blur-sm p-4 md:p-6",
        "transition-all duration-300",
        "hover:border-[#14F195]/40 hover:shadow-[0_0_20px_#14F19540]",
        className
      )}
    >
      {children}
    </div>
  );
}
