"use client"

import { useReferralNotifications } from "@/lib/hooks/useReferralNotifications"

/**
 * Компонент для отслеживания реферальных уведомлений
 * Должен быть внутри WalletProvider
 */
export default function ReferralNotifications() {
  useReferralNotifications()
  return null
}


