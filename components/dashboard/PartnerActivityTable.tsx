// components/dashboard/PartnerActivityTable.tsx
"use client";

import { memo, useMemo } from "react";

/* ------------------------------------------------------------
   Date Formatter (UTC)
------------------------------------------------------------ */
const formatDate = (raw: string): string => {
  if (!raw) return "—";
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw;

  return new Intl.DateTimeFormat("en-GB", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(d);
};

/* ------------------------------------------------------------
   Types
------------------------------------------------------------ */
interface PartnerTx {
  date: string;
  level: string | number;
  amount: number;
  type: string;
}

interface PartnerActivityTableProps {
  items: PartnerTx[];
  loading?: boolean;
}

/* ------------------------------------------------------------
   Skeleton
------------------------------------------------------------ */
function TableSkeleton() {
  return (
    <div className="rounded-xl border border-white/10 bg-[#0b0c0f]/70 p-4 backdrop-blur-sm animate-pulse">
      <div className="h-4 w-1/4 bg-white/10 rounded mb-4" />
      {[...Array(6)].map((_, i) => (
        <div key={i} className="h-3 w-full bg-white/5 rounded my-2" />
      ))}
    </div>
  );
}

/* ------------------------------------------------------------
   Row
------------------------------------------------------------ */
const Row = memo(function Row({ tx }: { tx: PartnerTx }) {
  const amountSol =
    typeof tx.amount === "number"
      ? tx.amount.toFixed(3)
      : "0.000";

  return (
    <tr
      className="
        border-b border-white/5
        hover:bg-white/5
        transition-colors duration-150
        text-sm sm:text-[13px]
      "
    >
      <td className="py-2 px-3 text-white/80 whitespace-nowrap">
        {formatDate(tx.date)}
      </td>

      <td className="py-2 px-3 text-white/80">
        L{String(tx.level).padStart(2, "0")}
      </td>

      <td className="py-2 px-3 text-white/60 capitalize">
        {tx.type || "—"}
      </td>

      <td className="py-2 px-3 text-right text-[#14F195] font-medium">
        {amountSol}
      </td>
    </tr>
  );
});

/* ------------------------------------------------------------
   MAIN COMPONENT — v3.10 Final
------------------------------------------------------------ */
export default function PartnerActivityTable({
  items,
  loading = false,
}: PartnerActivityTableProps) {
  const safeItems = useMemo(() => items || [], [items]);

  if (loading) return <TableSkeleton />;

  if (safeItems.length === 0) {
    return (
      <div className="
        rounded-xl border border-white/10 bg-[#0b0c0f]/70
        px-4 py-6 text-sm text-white/60 backdrop-blur-sm
      ">
        No partner events yet.
      </div>
    );
  }

  return (
    <div
      className="
        overflow-x-auto rounded-xl border border-white/10
        bg-[#0b0c0f]/70 backdrop-blur-sm
        shadow-[0_0_18px_rgba(20,241,149,0.15)]
      "
    >
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="text-white/60 border-b border-white/10 bg-black/20">
            <th className="py-2 px-3 text-left font-medium">Date / Time</th>
            <th className="py-2 px-3 text-left font-medium">Level</th>
            <th className="py-2 px-3 text-left font-medium">Type</th>
            <th className="py-2 px-3 text-right font-medium">Amount (SOL)</th>
          </tr>
        </thead>

        <tbody>
          {safeItems.map((tx, i) => (
            <Row key={`${tx.date}-${tx.level}-${i}`} tx={tx} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
