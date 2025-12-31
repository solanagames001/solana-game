// i18n/config.ts
// Internationalization configuration for 12 languages

export const locales = [
  'en', // English (default)
  'ru', // Русский
  'es', // Español
  'zh', // 中文
  'ja', // 日本語
  'ko', // 한국어
  'de', // Deutsch
  'fr', // Français
  'pt', // Português
  'tr', // Türkçe
  'vi', // Tiếng Việt
  'id', // Bahasa Indonesia
] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'en';

export const localeNames: Record<Locale, string> = {
  en: 'English',
  ru: 'Русский',
  es: 'Español',
  zh: '中文',
  ja: '日本語',
  ko: '한국어',
  de: 'Deutsch',
  fr: 'Français',
  pt: 'Português',
  tr: 'Türkçe',
  vi: 'Tiếng Việt',
  id: 'Indonesia',
};

export const localeFlags: Record<Locale, string> = {
  en: '🇺🇸',
  ru: '🇷🇺',
  es: '🇪🇸',
  zh: '🇨🇳',
  ja: '🇯🇵',
  ko: '🇰🇷',
  de: '🇩🇪',
  fr: '🇫🇷',
  pt: '🇧🇷',
  tr: '🇹🇷',
  vi: '🇻🇳',
  id: '🇮🇩',
};

