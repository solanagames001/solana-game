// components/ActivateLevelButton.tsx
"use client";

import { useCallback, useMemo } from "react";
import { useTranslations } from "next-intl";

import { toast } from "@/lib/sdk/toast";
import { usePlayer } from "@/lib/sdk/hooks/usePlayer";
import ActionButton from "@/components/ui/ActionButton";

type Props = {
  levelId: number;
  priceSol?: number;
  label?: string;
};

export default function ActivateLevelButton({
  levelId,
  priceSol = 0.001,
  label = "Activate",
}: Props) {
  const t = useTranslations('toast');
  const {
    address,
    activate,
    playerExists,
    activeLevels,
    busyActivate,
    checkingPlayer,
  } = usePlayer();

  const connected = Boolean(address);
  const isActivated = activeLevels.has(levelId);

  /* ------------------------------------------------------------
     onClick — чистый вызов activate(levelId)
  ------------------------------------------------------------ */
  const onClick = useCallback(async () => {
    // Предотвращаем множественные клики на мобильных
    if (busyActivate || checkingPlayer) {
      return;
    }

    if (!connected) {
      toast.error(t('walletNotConnected'));
      return;
    }

    if (!playerExists) {
      toast.info(t('connectWalletFirst'));
      return;
    }

    if (isActivated) {
      toast.info(t('invalidLevel'));
      return;
    }

    try {
      const sig = await activate(levelId);
      if (!sig) {
        // Ошибка уже показана в activateLevel
        return;
      }

      toast.success(t('activationSent'));
    } catch (err: any) {
      console.error("[ActivateLevelButton] activation error:", err);
      // Ошибка уже обработана в activateLevel, но на всякий случай
      if (!err?.message?.includes("already shown")) {
        toast.error(err?.message || "Activation failed");
      }
    }
  }, [
    connected,
    playerExists,
    isActivated,
    busyActivate,
    checkingPlayer,
    levelId,
    activate,
    t,
  ]);

  /* ------------------------------------------------------------
     Visibility
  ------------------------------------------------------------ */
  const shouldShow = useMemo(() => {
    if (checkingPlayer) return false;
    if (!connected) return false;
    if (!playerExists) return false;
    if (isActivated) return false;
    return true;
  }, [checkingPlayer, connected, playerExists, isActivated]);

  if (!shouldShow) return null;

  /* ------------------------------------------------------------
     Render
  ------------------------------------------------------------ */
  return (
    <ActionButton
      label={label}
      onClick={onClick}
      isBusy={busyActivate || checkingPlayer}
      disabled={busyActivate || checkingPlayer}
      variant="success"
      title={`Activate L${String(levelId).padStart(2, "0")} (~${priceSol} SOL)`}
      fullWidth
    />
  );
}
