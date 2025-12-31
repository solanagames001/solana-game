'use client';

import { usePathname } from 'next/navigation';
import { useMemo } from 'react';

export default function RootBody({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || '';

  // Memoize check to avoid recalculating on every rerender
  const isCabinetRoute = useMemo(() => {
    // Precompiled regex pattern for cabinet routes
    const cabinetPattern =
      /^\/(dashboard|levels|history|information|partner-bonus|telegram-bots|promo|config)(\/|$)/;
    return cabinetPattern.test(pathname);
  }, [pathname]);

  return isCabinetRoute ? (
    children
  ) : (
    <main className="w-full min-h-screen bg-black text-white overflow-hidden">
      {children}
    </main>
  );
}
