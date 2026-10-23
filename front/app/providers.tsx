'use client'

import { useEffect } from 'react'
import i18n, { LANGS, LANG_STORAGE_KEY, startTranslationSync, type Lang } from '@/i18n'

export function Providers({ children }: { children: React.ReactNode }) {
  // Сохранённый язык применяем после монтирования, а не в инициализации i18n:
  // на сервере localStorage нет, и разный стартовый язык дал бы расхождение
  // серверной и клиентской разметки.
  useEffect(() => {
    const stopSync = startTranslationSync()
    const syncDocumentLanguage = (lang: string) => {
      document.documentElement.lang = lang.startsWith('en') ? 'en' : 'ru'
    }
    syncDocumentLanguage(i18n.language)
    i18n.on('languageChanged', syncDocumentLanguage)
    let saved: string | null = null
    try {
      saved = window.localStorage.getItem(LANG_STORAGE_KEY)
    } catch {
      /* приватный режим */
    }
    if (saved && (LANGS as readonly string[]).includes(saved) && saved !== i18n.language) {
      void i18n.changeLanguage(saved as Lang)
    }
    return () => { stopSync(); i18n.off('languageChanged', syncDocumentLanguage) }
  }, [])

  return <>{children}</>
}
