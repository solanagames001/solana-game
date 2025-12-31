import { MAX_LEVELS } from "@/lib/sdk/prices";

/**
 * Generate static params for all level IDs (1 to MAX_LEVELS)
 * Required for static export with dynamic routes
 */
export function generateStaticParams() {
  return Array.from({ length: MAX_LEVELS }, (_, i) => ({
    id: String(i + 1),
  }));
}

export default function LevelDetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

