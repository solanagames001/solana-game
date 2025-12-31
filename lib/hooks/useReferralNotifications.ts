"use client"

import { useEffect, useRef } from 'react'
import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import { useTranslations } from 'next-intl'
import { toast } from '@/lib/sdk/toast'
import { loadLocalHistory } from '@/lib/sdk/history/local'
import { withSyntheticClosures } from '@/lib/sdk/history/derive'
import { startReferralTracker } from '@/lib/sdk/history/referral-tracker'
import type { TxEvent } from '@/lib/sdk/history/types'

/**
 * Hook для отслеживания новых реферальных активаций и показа уведомлений
 */
export function useReferralNotifications() {
  const { publicKey } = useWallet()
  const { connection } = useConnection()
  const t = useTranslations('toast')
  const wallet = publicKey?.toBase58()
  const seenRefActivations = useRef<Set<string>>(new Set())

  useEffect(() => {
    if (!wallet) {
      seenRefActivations.current.clear()
      return
    }

    const checkForNewReferralActivations = () => {
      try {
        const raw = loadLocalHistory(wallet)
        const events = withSyntheticClosures(raw)
        
        // Находим все REFERRAL_ACTIVATION события
        const referralActivations = events.filter(
          ev => ev.kind === 'REFERRAL_ACTIVATION'
        )

        // Проверяем новые события
        for (const ev of referralActivations) {
          const key = ev.id || ev.sig
          if (!key || seenRefActivations.current.has(key)) continue

          // Новое событие - показываем уведомление
          seenRefActivations.current.add(key)
          
          // Показываем уведомление только если событие не слишком старое (менее 5 минут)
          const age = Date.now() - ev.ts
          if (age < 5 * 60 * 1000) {
            // Форматируем сообщение с номером уровня
            const message = t('referralActivatedLevel', { level: ev.levelId })
            toast.success(message)
          }
        }
      } catch (err) {
        console.warn('[useReferralNotifications] error:', err)
      }
    }

    // Проверяем сразу
    checkForNewReferralActivations()

    // Подписываемся на обновления истории
    const handleHistoryUpdate = () => {
      checkForNewReferralActivations()
    }

    window.addEventListener('history-updated', handleHistoryUpdate)
    window.addEventListener('levels-history-changed', handleHistoryUpdate)

    // Запускаем трекер реферальных регистраций
    let stopTracker: (() => void) | null = null
    if (connection && publicKey) {
      stopTracker = startReferralTracker(connection, publicKey)
    }

    return () => {
      window.removeEventListener('history-updated', handleHistoryUpdate)
      window.removeEventListener('levels-history-changed', handleHistoryUpdate)
      if (stopTracker) {
        stopTracker()
      }
    }
  }, [wallet, t, connection, publicKey])
}

