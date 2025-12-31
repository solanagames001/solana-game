// app/(dashboard)/layout.tsx
// ------------------------------------------------------------
// Dashboard Layout with Wallet Protection
// Requires wallet connection to access any dashboard page
// Mobile: Pull-to-refresh + Swipe navigation
// ------------------------------------------------------------

import type { ReactNode } from "react";
import type { Metadata } from "next";
import Sidebar from "@/components/dashboard/Sidebar";
import Topbar from "@/components/dashboard/Topbar";
import BottomNav from "@/components/dashboard/BottomNav";
import SwipeNavigation from "@/components/dashboard/SwipeNavigation";
import WalletGuard from "@/components/dashboard/WalletGuard";
import PullToRefresh from "@/components/dashboard/PullToRefresh";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Manage your Solana Game profile, view earnings, track referrals, and activate new levels. Real-time statistics and transaction history.",
  robots: {
    index: false, // Dashboard pages are private
    follow: false,
  },
};

export default function CabinetLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <WalletGuard>
      <div className="relative flex h-screen h-[100dvh] bg-black text-white overflow-hidden">
        {/* Sidebar: only desktop */}
        <Sidebar />

        {/* MAIN COLUMN */}
        <div className="flex flex-1 min-w-0 flex-col">
          {/* Topbar */}
          <Topbar />

          {/* Content - extra bottom padding on mobile for BottomNav + safe area */}
          {/* PullToRefresh for mobile vertical swipe refresh */}
          <main className="flex-1 overflow-hidden bg-black">
            <PullToRefresh>
              <div className="h-full overflow-y-auto p-4 md:p-6 pb-28 lg:pb-6" style={{ paddingBottom: 'calc(7rem + env(safe-area-inset-bottom, 0px))' }}>
                <SwipeNavigation>
                  {children}
                </SwipeNavigation>
              </div>
            </PullToRefresh>
          </main>
        </div>

        {/* Bottom Navigation: only mobile/tablet */}
        <BottomNav />
      </div>
    </WalletGuard>
  );
}
