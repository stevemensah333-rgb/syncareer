import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import en from './locales/en';

// Eager-load English only; other locales are dynamically imported on demand
// so they don't bloat the initial JS bundle.
// Note: i18next itself (~80 kB) remains in the initial chunk because
// react-i18next's <I18nextProvider>/useTranslation require a live instance
// synchronously during render; deferring initialization introduced complexity
// without commensurate gain. All heavy analytics (posthog-js ~187 kB) and
// react-day-picker/date-fns-v4 (~200 kB) are moved out of the initial chunk.

const SUPPORTED = ['en', 'af', 'zu', 'xh', 'es', 'fr', 'de', 'pt', 'zh', 'ar'] as const;
type Lng = (typeof SUPPORTED)[number];

const loaders: Record<Exclude<Lng, 'en'>, () => Promise<{ default: { translation: Record<string, unknown> } }>> = {
  af: () => import('./locales/af'),
  zu: () => import('./locales/zu'),
  xh: () => import('./locales/xh'),
  es: () => import('./locales/es'),
  fr: () => import('./locales/fr'),
  de: () => import('./locales/de'),
  pt: () => import('./locales/pt'),
  zh: () => import('./locales/zh'),
  ar: () => import('./locales/ar'),
};

const loaded = new Set<Lng>(['en']);

async function ensureLanguage(lng: string) {
  const code = lng.split('-')[0] as Lng;
  if (!SUPPORTED.includes(code) || loaded.has(code) || code === 'en') return;
  try {
    const mod = await loaders[code as Exclude<Lng, 'en'>]();
    i18n.addResourceBundle(code, 'translation', mod.default.translation, true, true);
    loaded.add(code);
  } catch (err) {
    console.warn('[i18n] Failed to load locale', code, err);
  }
}

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: { en },
    fallbackLng: 'en',
    supportedLngs: SUPPORTED as unknown as string[],
    interpolation: { escapeValue: false },
    detection: { order: ['localStorage', 'navigator'], caches: ['localStorage'] },
  })
  .then(() => ensureLanguage(i18n.language));

i18n.on('languageChanged', (lng) => {
  void ensureLanguage(lng);
});

export default i18n;
