// i18n/client.ts
// Client-side locale management

import { locales, defaultLocale, type Locale } from './config';

export const LOCALE_COOKIE = 'NEXT_LOCALE';

// Get current locale from cookie (client-side)
// Falls back to browser language if cookie is not set
export function getClientLocale(): Locale {
  if (typeof document === 'undefined') return defaultLocale;
  
  // Try to get locale from cookie
  const match = document.cookie.match(new RegExp(`${LOCALE_COOKIE}=([^;]+)`));
  const cookieLocale = match?.[1] as Locale | undefined;
  
  if (cookieLocale && locales.includes(cookieLocale)) {
    return cookieLocale;
  }
  
  // Try to detect from browser language
  const browserLang = navigator.language.split('-')[0].toLowerCase();
  if (locales.includes(browserLang as Locale)) {
    return browserLang as Locale;
  }
  
  return defaultLocale;
}

// Set locale in cookie and reload
export function setClientLocale(locale: Locale) {
  if (!locales.includes(locale)) return;
  
  // Set cookie with 1 year expiry
  const expires = new Date();
  expires.setFullYear(expires.getFullYear() + 1);
  
  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; expires=${expires.toUTCString()}; samesite=lax`;
  
  // Reload to apply new locale
  window.location.reload();
}

