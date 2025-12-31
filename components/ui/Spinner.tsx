"use client";

import Image from "next/image";

export default function Spinner({
  size = 40,        // большой ринг = 40px
  innerScale = 0.50 // логотип ~20px
}: {
  size?: number;
  innerScale?: number;
}) {
  const ring = size;
  const inner = size * innerScale;

  return (
    <div
      className="relative inline-flex items-center justify-center"
      style={{
        width: ring,
        height: ring,
      }}
    >
      {/* Обруч — дыхание + смена цвета */}
      <div
        className="absolute inset-0 rounded-full" 
        style={{
          border: `${ring * 0.08}px solid transparent`,
          animation: "ringPulse 1.6s ease-in-out infinite",
        }}
      />

      {/* Логотип внутри */}
      <div
        className="relative flex items-center justify-center"
        style={{ width: inner, height: inner }}
      >
        <Image
          src="/logof.png"
          alt="logo"
          width={inner}
          height={inner}
          className="object-contain opacity-90 select-none pointer-events-none"
        />
      </div>

      {/* Glow вокруг */}
      <div
        className="absolute rounded-full"
        style={{
          width: ring,
          height: ring,
          animation: "glowPulse 1.6s ease-in-out infinite",
        }}
      />

      <style jsx>{`
        @keyframes ringPulse {
          0% {
            transform: scale(0.90);
            border-color: #14F195;
          }
          50% {
            transform: scale(1.06);
            border-color: #00FFA3;
          }
          100% {
            transform: scale(0.90);
            border-color: #14F195;
          }
        }

        @keyframes glowPulse {
          0% {
            box-shadow: 0 0 ${ring * 0.35}px #14F19555;
            opacity: 0.6;
          }
          50% {
            box-shadow: 0 0 ${ring * 0.55}px #00FFA355;
            opacity: 1;
          }
          100% {
            box-shadow: 0 0 ${ring * 0.35}px #14F19555;
            opacity: 0.6;
          }
        }
      `}</style>
    </div>
  );
}
