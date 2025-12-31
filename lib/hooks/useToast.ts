'use client';

import { useTranslations } from 'next-intl';
import { useCallback } from 'react';
import { toast as baseToast } from '@/lib/sdk/toast';

/**
 * Hook for translated toast notifications
 * Use this instead of direct toast calls for i18n support
 */
export function useToast() {
  const t = useTranslations('toast');

  const success = useCallback((key: string, link?: string) => {
    try {
      const message = t(key);
      baseToast.success(message, link);
    } catch {
      // Fallback to key if translation not found
      baseToast.success(key, link);
    }
  }, [t]);

  const error = useCallback((key: string, link?: string) => {
    try {
      const message = t(key);
      baseToast.error(message, link);
    } catch {
      baseToast.error(key, link);
    }
  }, [t]);

  const info = useCallback((key: string, link?: string) => {
    try {
      const message = t(key);
      baseToast.info(message, link);
    } catch {
      baseToast.info(key, link);
    }
  }, [t]);

  // For direct messages (not translation keys)
  const raw = {
    success: baseToast.success,
    error: baseToast.error,
    info: baseToast.info,
  };

  return { success, error, info, raw };
}

