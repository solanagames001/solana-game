"use client";

import dynamic from "next/dynamic";

const PlayerStatusCard = dynamic(
  () => import("./PlayerStatusCardInner"),
  { ssr: false }
);

export default PlayerStatusCard;
