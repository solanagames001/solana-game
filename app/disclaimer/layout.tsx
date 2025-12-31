import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Legal Disclaimer & Terms of Use",
  description: "Important legal information about Solana Game. Read our disclaimer, terms of use, risk warnings, and privacy policy before using the platform.",
  keywords: [
    "Solana Game disclaimer",
    "terms of use",
    "legal notice",
    "crypto risks",
    "privacy policy",
  ],
  robots: {
    index: true,
    follow: true,
  },
};

export default function DisclaimerLayout({ children }: { children: ReactNode }) {
  return children;
}

