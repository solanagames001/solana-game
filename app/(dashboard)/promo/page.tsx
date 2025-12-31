// app/(dashboard)/promo/page.tsx
"use client";

import { useCallback, useEffect, useState, useMemo } from "react";
import { useTranslations } from "next-intl";

import { usePlayer } from "@/lib/sdk/hooks/usePlayer";
import { toast } from "@/lib/sdk/toast";

export default function PromoPage() {
  const t = useTranslations('toast');
  const { address } = usePlayer();

  const [refLink, setRefLink] = useState<string>("—");
  const [localToast, setLocalToast] = useState<string | null>(null);

  // ------------------------------------------------------------
  // Строим реферальную ссылку от кошелька (если есть)
  // ------------------------------------------------------------
  const computedRefLink = useMemo(() => {
    if (!address) return null;

    const origin =
      typeof window !== "undefined" ? window.location.origin : "https://solana.game";

    return `${origin}/?ref=${address}`;
  }, [address]);

  // синхронизируем state с кошельком
  useEffect(() => {
    if (computedRefLink) {
      setRefLink(computedRefLink);
    } else {
      setRefLink("—");
    }
  }, [computedRefLink]);

  // локальный тост (в уголке страницы, чисто UI-подсказка)
  useEffect(() => {
    if (!localToast) return;
    const t = setTimeout(() => setLocalToast(null), 1800);
    return () => clearTimeout(t);
  }, [localToast]);

  const generateRef = useCallback(() => {
    if (!computedRefLink) {
      toast.info(t('connectWalletFirst'));
      setLocalToast("Connect wallet first");
      return;
    }

    setRefLink(computedRefLink);
    toast.success(t('linkCopied'));
    setLocalToast("Ref link generated");
  }, [computedRefLink, t]);

  const copyRef = useCallback(async () => {
    if (refLink === "—") {
      toast.info(t('connectWalletFirst'));
      setLocalToast("No link to copy");
      return;
    }
    try {
      await navigator.clipboard.writeText(refLink);
      toast.success(t('linkCopied'));
      setLocalToast("Copied!");
    } catch {
      toast.error(t('copyFailed'));
      setLocalToast("Copy failed");
    }
  }, [refLink, t]);

  return (
    <div className="space-y-8 text-white">
      {/* header */}
      <header>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-wide">
          Promo
        </h1>
        <p className="text-sm text-white/60">
          Материалы для продвижения: реф-ссылки, презентации, графика
        </p>
      </header>

      {/* cards */}
      <section className="grid gap-4 grid-cols-1 md:grid-cols-3">
        {/* ref link */}
        <div className="rounded-2xl border border-white/10 bg-[#0b0c0f]/80 p-6 backdrop-blur-sm hover:border-[#14F195]/30 hover:shadow-[0_0_15px_#14F19540] transition">
          <div className="text-sm text-white/60 mb-1">Личная реф-ссылка</div>
          <div className="font-mono text-sm break-all text-white/80 bg-black/30 rounded-xl px-3 py-2 border border-white/5">
            {refLink}
          </div>
          <div className="mt-3 flex gap-2">
            <button
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-sm hover:bg-white/10 transition disabled:opacity-40"
              onClick={copyRef}
              disabled={refLink === "—"}
            >
              Copy
            </button>
            <button
              className="rounded-xl px-3 py-1.5 text-sm font-medium text-black/90 
                         bg-gradient-to-r from-[#14F195] to-[#00FFA3] hover:opacity-90 transition"
              onClick={generateRef}
            >
              {address ? "Sync with wallet" : "Generate"}
            </button>
          </div>
          {!address && (
            <p className="mt-2 text-xs text-amber-300/80">
              Подключите кошелёк, чтобы получить персональную ссылку.
            </p>
          )}
        </div>

        {/* presentations */}
        <div className="rounded-2xl border border-white/10 bg-[#0b0c0f]/80 p-6 backdrop-blur-sm hover:border-white/20 transition">
          <div className="text-sm text-white/60 mb-2">Презентации</div>
          <div className="space-y-2">
            {["EN", "HI", "RU"].map((lang) => (
              <button
                key={lang}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-left text-sm hover:bg-white/10 transition"
                title={`Open ${lang} presentation`}
                onClick={() => {
                  toast.info(t('comingSoon'));
                }}
              >
                {lang} — open
              </button>
            ))}
          </div>
        </div>

        {/* graphics */}
        <div className="rounded-2xl border border-white/10 bg-[#0b0c0f]/80 p-6 backdrop-blur-sm hover:border-white/20 transition">
          <div className="text-sm text-white/60 mb-2">Графика</div>
          <p className="text-white/80 text-sm leading-relaxed">
            Логотипы, баннеры, обложки. Ссылки появятся, когда материалы будут
            загружены в CDN/Storage.
          </p>
          <div className="mt-3">
            <button
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-sm hover:bg-white/10 transition"
              title="Открыть медиаконтент"
              onClick={() => {
                toast.info(t('comingSoon'));
              }}
            >
              Open assets
            </button>
          </div>
        </div>
      </section>

      {/* локальный маленький toast для промо-страницы */}
      {localToast && (
        <div
          className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-xl border border-[#14F195]/30 
                     bg-[#0b0c0f]/90 px-4 py-2 text-sm text-white/90 backdrop-blur-sm shadow-[0_0_15px_#14F19540]"
        >
          {localToast}
        </div>
      )}
    </div>
  );
}
