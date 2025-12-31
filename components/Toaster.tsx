"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { onToast, type ToastPayload } from "@/lib/sdk/toast";

type ToastView = ToastPayload & { visible: boolean };

/* ------------------------------------------------------------ */
/* Icons                                                        */
/* ------------------------------------------------------------ */

function SuccessIcon() {
  return (
    <svg className="w-5 h-5 text-[#14F195]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" className="stroke-[#14F195]/30" />
      <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ErrorIcon() {
  return (
    <svg className="w-5 h-5 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" className="stroke-red-400/30" />
      <path d="M15 9l-6 6M9 9l6 6" strokeLinecap="round" />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg className="w-5 h-5 text-white/60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" className="stroke-white/20" />
      <path d="M12 16v-4M12 8h.01" strokeLinecap="round" />
    </svg>
  );
}

/* ------------------------------------------------------------ */
/* Toaster Component                                            */
/* ------------------------------------------------------------ */

export default function Toaster() {
  const t = useTranslations('toast');
  const [items, setItems] = useState<ToastView[]>([]);

  useEffect(() => {
    const unsubscribe = onToast((payload: ToastPayload) => {
      // 1) Добавляем или обновляем тост
      setItems((prev) => {
        const existing = prev.find(
          (t) =>
            t.message === payload.message &&
            t.type === payload.type &&
            t.link === payload.link
        );

        if (existing) {
          return prev.map((t) =>
            t.id === existing.id ? { ...t, visible: true } : t
          );
        }

        const next: ToastView = { ...payload, visible: true };
        return [...prev, next].slice(-4);
      });

      // 2) Таймеры скрытия и удаления
      const id = payload.id;

      const hideTimeout = setTimeout(() => {
        setItems((prev) =>
          prev.map((t) =>
            t.id === id ? { ...t, visible: false } : t
          )
        );

        const removeTimeout = setTimeout(() => {
          setItems((prev) => prev.filter((t) => t.id !== id));
          clearTimeout(removeTimeout);
        }, 320);
      }, 4000);

      return () => clearTimeout(hideTimeout);
    });

    return unsubscribe;
  }, []);

  if (items.length === 0) return null;

  return (
    <div className="fixed inset-x-0 bottom-24 sm:bottom-4 z-[1100] flex flex-col items-center gap-2 sm:items-end sm:pr-4 pointer-events-none px-4 mb-safe">
      {items.map((item) => (
        <div
          key={item.id}
          className={`pointer-events-auto flex min-w-[280px] max-w-[420px] items-center gap-3 
            rounded-lg px-4 py-3 text-sm
            bg-[#111113]
            transition-all duration-300 ease-out
            ${item.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"}
            ${
              item.type === "success"
                ? "shadow-[0_0_20px_rgba(20,241,149,0.15)]"
                : item.type === "error"
                ? "shadow-[0_0_20px_rgba(248,113,113,0.15)]"
                : "shadow-[0_0_15px_rgba(255,255,255,0.03)]"
            }`}
        >
          {/* Icon */}
          <div className="flex-none">
            {item.type === "success" ? (
              <SuccessIcon />
            ) : item.type === "error" ? (
              <ErrorIcon />
            ) : (
              <InfoIcon />
            )}
          </div>

          {/* Message + link */}
          <div className="flex-1 min-w-0">
            <div className={`font-medium ${
              item.type === "success" 
                ? "text-[#14F195]" 
                : item.type === "error" 
                ? "text-red-400" 
                : "text-white"
            }`}>
              {(() => {
                // Handle special format: ACTIVATION_SENT_LEVEL:2
                if (item.message.startsWith('ACTIVATION_SENT_LEVEL:')) {
                  const levelId = item.message.replace('ACTIVATION_SENT_LEVEL:', '');
                  try {
                    return t('activationSentLevel', { level: levelId });
                  } catch {
                    return item.message;
                  }
                }
                
                // Handle format with parameters: KEY:param1:param2:param3
                const parts = item.message.split(':');
                if (parts.length > 1) {
                  const key = parts[0];
                  const params = parts.slice(1);
                  
                  try {
                    // Handle specific formats
                    if (key === 'levelAlreadyActivated' && params.length === 1) {
                      return t('levelAlreadyActivated', { level: params[0] });
                    }
                    if (key === 'insufficientBalanceForLevel' && params.length === 1) {
                      return t('insufficientBalanceForLevel', { level: params[0] });
                    }
                    if (key === 'insufficientBalanceAddSOL' && params.length === 1) {
                      return t('insufficientBalanceAddSOL', { level: params[0] });
                    }
                    if (key === 'insufficientBalanceDetailed' && params.length === 3) {
                      return t('insufficientBalanceDetailed', { 
                        level: params[0], 
                        needSOL: params[1], 
                        missingSOL: params[2] 
                      });
                    }
                    if (key === 'activationFailedAnchor' && params.length === 2) {
                      return t('activationFailedAnchor', { level: params[0], code: params[1] });
                    }
                    if (key === 'registrationError' && params.length >= 1) {
                      return t('registrationError', { error: params.join(':') });
                    }
                    
                    // Try generic translation with first param as object
                    const translated = t(key as any, { value: params.join(':') });
                    if (translated && translated !== key) {
                      return translated;
                    }
                  } catch {
                    // Fall through to show original
                  }
                }
                
                // Check if message looks like a translation key (camelCase, only ASCII letters/numbers)
                // If it contains non-ASCII characters (like Cyrillic) or spaces, it's already translated
                const isLikelyKey = /^[a-zA-Z][a-zA-Z0-9]*$/.test(item.message) && 
                                   !/[а-яА-ЯёЁ]/.test(item.message) && 
                                   !item.message.includes(' ');
                
                if (isLikelyKey) {
                  try {
                    const translated = t(item.message as any);
                    // If translation exists and is different from the key, use it
                    if (translated && translated !== item.message) {
                      return translated;
                    }
                  } catch {
                    // Translation key doesn't exist, fall through to show original
                  }
                }
                // Already translated text or key doesn't exist - show as-is
                return item.message;
              })()}
            </div>
            {item.link && (
              <a
                href={item.link}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-white/40 hover:text-[#14F195] transition-colors flex items-center gap-1 mt-0.5"
              >
                {t('viewInExplorer')}
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </a>
            )}
          </div>

          {/* Close button */}
          <button
            type="button"
            aria-label={t('closeNotification')}
            onClick={() =>
              setItems((prev) =>
                prev.map((x) =>
                  x.id === item.id ? { ...x, visible: false } : x
                )
              )
            }
            className="flex-none p-1 rounded-lg text-white/30 hover:text-white/60 hover:bg-[#0d0d0f] transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}
