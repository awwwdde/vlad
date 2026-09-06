'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { SiteHeader } from './SiteHeader'
import { SiteFooter } from './SiteFooter'
import ComingSoon from '@/views/ComingSoon'
import { flagBool, useSiteSettings } from '@/hooks/useSiteSettings'

// Обход заглушки для владельца сайта: `?preview` в адресе или успешный вход
// в админку (AuthContext ставит тот же ключ).
const BYPASS_KEY = 'awwwdde_preview_bypass'

function usePreviewBypass(): boolean {
  const [bypass] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    try {
      const params = new URLSearchParams(window.location.search)
      if (params.has('preview')) {
        window.localStorage.setItem(BYPASS_KEY, '1')
        window.history.replaceState(null, '', window.location.pathname + window.location.hash)
        return true
      }
      return window.localStorage.getItem(BYPASS_KEY) === '1'
    } catch {
      return false
    }
  })
  return bypass
}

export function SiteShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const bypass = usePreviewBypass()
  const settings = useSiteSettings()

  // Пока настройки не пришли, flagBool отдаёт дефолт false и сайт рендерится
  // как обычно. Блокировать первый кадр нельзя: при недоступном беке страница
  // залипла бы на пустом экране.
  const comingSoon = flagBool(settings, 'coming_soon', false)

  if (comingSoon && !bypass) return <ComingSoon />

  return (
    <div className="flex min-h-[100dvh] flex-col">
      <SiteHeader />
      {/* Шапка зафиксирована и вынута из потока. На главной под ней сразу
          начинается герой во весь экран, на остальных страницах место под неё
          нужно освободить. */}
      <main className={pathname === '/' ? 'flex-1' : 'flex-1 pt-16'}>{children}</main>
      <SiteFooter />
    </div>
  )
}
