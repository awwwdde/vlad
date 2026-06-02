import { useEffect, useState } from 'react'

// Публичный snapshot всех site-settings, доступный без авторизации.
// Содержит как минимум:
//   - coming_soon: "true" | "false" — показывать заглушку публике
// Хук используется в App.tsx (gate) и при желании в других местах фронта.

export type SiteSettings = Record<string, string>

const API_BASE = import.meta.env.VITE_API_BASE ?? ''

// Кэш на уровне модуля — один запрос на сессию SPA.
let cache: SiteSettings | null = null
let inflight: Promise<SiteSettings> | null = null
const subscribers = new Set<(s: SiteSettings) => void>()

function notify(s: SiteSettings) {
  for (const sub of subscribers) sub(s)
}

// Кросс-табное оповещение: после PUT в админке шлём invalidate
// и все вкладки публички мгновенно перечитывают флаги.
const channel =
  typeof window !== 'undefined' && 'BroadcastChannel' in window
    ? new BroadcastChannel('awwwdde.site')
    : null

if (channel) {
  channel.onmessage = ev => {
    if (ev.data?.type === 'invalidate') {
      cache = null
      void fetchSettings()
    }
  }
}

async function fetchSettings(): Promise<SiteSettings> {
  if (inflight) return inflight
  inflight = fetch(`${API_BASE}/api/site/settings`)
    .then(r => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      return r.json() as Promise<SiteSettings>
    })
    // Если бек недоступен / 404 / network error — НЕ оставляем кэш в null
    // (иначе гейт в App.tsx покажет белый экран навсегда). Падаем на пустой
    // словарь — дальше flagBool(_, _, default) отработает все ключи.
    .catch(() => ({} as SiteSettings))
    .then(data => {
      cache = data
      notify(data)
      return data
    })
    .finally(() => {
      inflight = null
    })
  return inflight
}

/** Принудительно сбросить кэш и перечитать с сервера + оповестить все вкладки. */
export function invalidateSiteSettings(): void {
  cache = null
  channel?.postMessage({ type: 'invalidate' })
  void fetchSettings()
}

/** Чтение настроек с auto-refresh и подпиской. Возвращает `null` пока
 *  первый запрос не вернулся (отличаем «ещё не знаем» от «знаем что пусто»). */
export function useSiteSettings(): SiteSettings | null {
  const [state, setState] = useState<SiteSettings | null>(() => cache)

  useEffect(() => {
    subscribers.add(setState)
    if (!cache) void fetchSettings().catch(() => { /* fallback к null */ })
    return () => {
      subscribers.delete(setState)
    }
  }, [])

  return state
}

/** Удобный шорткат: булев флаг, дефолт можно задать на вызывающей стороне. */
export function flagBool(settings: SiteSettings | null, key: string, def = false): boolean {
  if (!settings) return def
  const v = settings[key]
  if (v === undefined) return def
  return v === 'true' || v === '1'
}
