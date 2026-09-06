'use client'

import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from './locales/en.json'
import ru from './locales/ru.json'

export const LANGS = ['ru', 'en'] as const
export type Lang = (typeof LANGS)[number]
export const LANG_STORAGE_KEY = 'awwwdde_lang'

// Бандленные локали — мгновенный fallback на первом рендере, без вспышки.
// Стартовый язык фиксирован (ru) и одинаков на сервере и на клиенте: выбор
// пользователя применяется уже после гидратации (см. Providers), иначе SSR и
// первый клиентский рендер разошлись бы.
i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, ru: { translation: ru } },
  lng: 'ru',
  fallbackLng: 'ru',
  interpolation: { escapeValue: false },
})

// ── Удалённый бандл из админки ───────────────────────────────────────────────
// После init идём за свежими переводами в /api/content/translations/{lang}.
// Пришли — addResourceBundle с deep+overwrite, затем changeLanguage, чтобы
// все useTranslation перерисовались.
const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? ''

async function fetchAndMerge(lang: Lang): Promise<void> {
  try {
    const r = await fetch(`${API_BASE}/api/content/translations/${lang}`)
    if (!r.ok) return
    const payload = (await r.json()) as { data: Record<string, unknown> }
    if (payload?.data && Object.keys(payload.data).length) {
      i18n.addResourceBundle(lang, 'translation', payload.data, true, true)
    }
  } catch {
    /* offline или бек упал: остаёмся на бандленных дефолтах */
  }
}

export async function refreshTranslations(): Promise<void> {
  await Promise.all(LANGS.map(fetchAndMerge))
  await i18n.changeLanguage(i18n.language)
}

export function setLang(lang: Lang): void {
  void i18n.changeLanguage(lang)
  try {
    window.localStorage.setItem(LANG_STORAGE_KEY, lang)
  } catch {
    /* приватный режим: язык проживёт до перезагрузки */
  }
}

// Клиентские сайд-эффекты. Модуль помечен 'use client', но при SSR он всё
// равно выполняется на сервере, поэтому окно проверяем явно.
if (typeof window !== 'undefined') {
  void refreshTranslations()

  if ('BroadcastChannel' in window) {
    // Админка после сохранения переводов шлёт invalidate во все вкладки.
    const ch = new BroadcastChannel('awwwdde.translations')
    ch.onmessage = ev => {
      if (ev.data?.type === 'invalidate') void refreshTranslations()
    }
  }
}

export default i18n
