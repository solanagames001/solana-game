import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Documentation - How Solana Game Works",
  description: "Complete guide to Solana Game matrix system. Learn about 16 levels, queue mechanics, 60% payouts, 3-tier referral system, and smart contract security.",
  keywords: [
    "Solana Game guide",
    "matrix system tutorial",
    "crypto earning guide",
    "DeFi documentation",
    "smart contract explanation",
    "referral system guide",
  ],
  openGraph: {
    title: "Documentation - How Solana Game Works",
    description: "Complete guide to the decentralized matrix system. Learn how to earn SOL with smart contracts.",
  },
};

export default function DocsLayout({ children }: { children: ReactNode }) {
  return children;
}

