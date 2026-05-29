import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from './locales/en.json'
import ru from './locales/ru.json'

// Бандленные локали — мгновенный fallback на первом рендере (без flash).
i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, ru: { translation: ru } },
  lng: 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
})

// ── Удалённый бандл из админки ───────────────────────────────────────────────
// После init идём за свежими переводами в /api/content/translations/{lang}.
// Когда пришли — addResourceBundle с deep=true и overwrite=true (i18next аккуратно
// перекроет существующие ключи), затем эмитим languageChanged, чтобы все
// useTranslation-хуки перерисовались.

const API_BASE = import.meta.env.VITE_API_BASE ?? ''
const LANGS = ['ru', 'en'] as const

async function fetchAndMerge(lang: (typeof LANGS)[number]): Promise<void> {
  try {
    const r = await fetch(`${API_BASE}/api/content/translations/${lang}`)
    if (!r.ok) return
    const payload = (await r.json()) as { data: Record<string, unknown> }
    if (payload?.data && Object.keys(payload.data).length) {
      i18n.addResourceBundle(lang, 'translation', payload.data, true, true)
    }
  } catch {
    /* offline / бек упал — остаёмся на бандленных дефолтах */
  }
}

export async function refreshTranslations(): Promise<void> {
  await Promise.all(LANGS.map(fetchAndMerge))
  // Триггер re-render для всех подписчиков useTranslation.
  await i18n.changeLanguage(i18n.language)
}

// При загрузке приложения сразу подтягиваем актуальную версию.
void refreshTranslations()

// Кросс-табное оповещение: админка после PUT шлёт invalidate сюда.
if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
  const ch = new BroadcastChannel('awwwdde.translations')
  ch.onmessage = ev => {
    if (ev.data?.type === 'invalidate') void refreshTranslations()
  }
}

export default i18n
