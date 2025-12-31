"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  useWallet,
  useConnection,
  type AnchorWallet,
} from "@solana/wallet-adapter-react";

import {
  derivePlayerPda,
  fetchPlayerNullable,
  createPlayer,   // ← ВАЖНО
  CLUSTER,
  toast,
} from "@/lib/sdk";

type PlayerMeta = {
  authority: string;
  pda: string;
  created_at: number;
};

const LS_KEY = "player_meta_cache_v1";

/* ---------------------------------------------------------
   LocalStorage helpers
--------------------------------------------------------- */
function loadLS(): PlayerMeta | null {
  if (typeof window === "undefined") return null;
  try {
    return JSON.parse(window.localStorage.getItem(LS_KEY) || "null");
  } catch {
    return null;
  }
}

function saveLS(data: PlayerMeta | null) {
  if (typeof window === "undefined") return;
  try {
    if (data) window.localStorage.setItem(LS_KEY, JSON.stringify(data));
    else window.localStorage.removeItem(LS_KEY);
  } catch {}
}

/* ---------------------------------------------------------
   MAIN COMPONENT
--------------------------------------------------------- */
export default function PlayerStatusCardInner() {
  const t = useTranslations('playerStatus');
  const router = useRouter();
  const { connection } = useConnection();
  const { publicKey, connected, wallet } = useWallet();

  const [meta, setMeta] = useState<PlayerMeta | null>(() => loadLS());
  const [loading, setLoading] = useState(false);

  const [pda] = useMemo(() => {
    if (!publicKey) return [null] as const;
    return derivePlayerPda(publicKey);
  }, [publicKey]);

  const fmtGreen = (v?: string) =>
    !v ? (
      "—"
    ) : (
      <span className="font-mono text-[13px] text-[#14F195]">
        {v.slice(0, 10)}…{v.slice(-10)}
      </span>
    );

  /* ---------------------------------------------------------
     REFRESH
  --------------------------------------------------------- */
  const refresh = useCallback(async () => {
    if (!connected || !publicKey || !pda) {
      setMeta(null);
      saveLS(null);
      return;
    }

    try {
      const acc = await fetchPlayerNullable(connection, pda);
      if (acc) {
        const data: PlayerMeta = {
          authority: acc.authority.toBase58(),
          pda: pda.toBase58(),
          created_at: acc.created_at,
        };
        setMeta(data);
        saveLS(data);
      } else {
        setMeta(null);
        saveLS(null);
      }
    } catch (e) {
      console.warn("[PlayerStatusCardInner] refresh error:", e);
    }
  }, [connected, publicKey, pda, connection]);

  useEffect(() => {
    if (connected && publicKey && pda) refresh();
    else {
      setMeta(null);
      saveLS(null);
    }
  }, [connected, publicKey?.toBase58(), pda?.toBase58(), refresh]);

  /* ---------------------------------------------------------
     REGISTER (createPlayer)
  --------------------------------------------------------- */
  const register = useCallback(async () => {
    if (!wallet || !publicKey) {
      toast.error(t('connectFirst'));
      return;
    }

    try {
      setLoading(true);

      const adapter: any = wallet.adapter ?? wallet;
      const aw: AnchorWallet = {
        publicKey: adapter.publicKey,
        signTransaction: adapter.signTransaction,
        signAllTransactions: adapter.signAllTransactions,
      };

      const sig = await createPlayer(connection, aw); // ← FIX

      toast.success(t('playerRegistered'));
      await refresh();
    } catch (e) {
      console.error("[PlayerStatusCardInner] register error:", e);
      toast.error(t('registrationFailed'));
    } finally {
      setLoading(false);
    }
  }, [wallet, publicKey, connection, refresh, t]);

  const copy = (txt: string) => {
    navigator.clipboard.writeText(txt).then(
      () => toast.success(t('addressCopied')),
      () => toast.error(t('copyFailed'))
    );
  };

  const explorerUrl =
    meta?.pda &&
    `https://explorer.solana.com/address/${meta.pda}?cluster=${CLUSTER}`;

  /* ---------------------------------------------------------
     RENDER
  --------------------------------------------------------- */
  return (
    <div className="rounded-2xl bg-[#111113] p-6">
      <div className="text-xs uppercase tracking-wider text-white/40">{t('title')}</div>
      <div className="mt-1 text-lg font-semibold text-[#14F195]">
        {t('accountInfo')}
      </div>

      <div className="mt-4 space-y-3 text-sm">
        <div className="flex justify-between items-center">
          <span className="text-white/40">{t('authority')}</span>
          {fmtGreen(meta?.authority)}
        </div>

        <div className="flex justify-between items-center">
          <span className="text-white/40">{t('playerPda')}</span>
          {fmtGreen(meta?.pda)}
        </div>

        <div className="flex justify-between items-center">
          <span className="text-white/40">{t('createdAt')}</span>
          <span className="text-white/70">
            {meta?.created_at
              ? new Date(meta.created_at * 1000).toLocaleString()
              : "—"}
          </span>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {!meta && connected && (
          <button
            onClick={register}
            disabled={loading}
            className="rounded-lg bg-[#14F195] px-4 py-2 text-sm font-semibold text-black
                       hover:bg-[#12d986] disabled:opacity-60 transition-colors"
          >
            {loading ? t('registering') : t('register')}
          </button>
        )}

        {meta && (
          <>
            <button
              onClick={() => router.push("/levels")}
              className="rounded-lg bg-[#1a1a1c] px-4 py-2 text-sm text-white/70 hover:bg-[#222224] hover:text-white transition-colors"
            >
              {t('openLevels')}
            </button>

            <button
              onClick={() => meta?.pda && copy(meta.pda)}
              className="rounded-lg bg-[#1a1a1c] px-4 py-2 text-sm text-white/70 hover:bg-[#222224] hover:text-white transition-colors"
            >
              {t('copyPda')}
            </button>

            {explorerUrl && (
              <a
                href={explorerUrl}
                target="_blank"
                rel="noreferrer"
                className="rounded-lg bg-[#1a1a1c] px-4 py-2 text-sm text-white/70 hover:bg-[#222224] hover:text-white transition-colors"
              >
                Explorer
              </a>
            )}
          </>
        )}
      </div>
    </div>
  );
}
