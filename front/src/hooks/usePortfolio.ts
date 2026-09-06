'use client'

import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { I18nBundle, PortfolioItem } from '@/admin/types'
import { FALLBACK_PORTFOLIO } from '@/data/portfolioFallback'

// ── Кэш + рассылка обновлений ────────────────────────────────────────────────
// Стратегия: stale-while-revalidate.
// 1) При маунте отдаём кэш (или FALLBACK), если он есть — никаких "загрузка…".
// 2) В фоне ВСЕГДА идём за свежими данными в /api/content/portfolio.
// 3) Когда ответ пришёл — обновляем кэш и оповещаем всех подписчиков.
// 4) Админка после сохранения дёргает invalidatePortfolio(), чтобы все
//    открытые вкладки публички (даже соседние) перерисовались.

let cache: PortfolioItem[] | null = null
let inflight: Promise<PortfolioItem[]> | null = null

const subscribers = new Set<(items: PortfolioItem[]) => void>()
function notify(items: PortfolioItem[]): void {
  for (const sub of subscribers) sub(items)
}

// Канал для общения между вкладками (admin → public site в соседней вкладке).
const channel =
  typeof window !== 'undefined' && 'BroadcastChannel' in window
    ? new BroadcastChannel('awwwdde.portfolio')
    : null
if (channel) {
  channel.onmessage = ev => {
    if (ev.data?.type === 'invalidate') {
      cache = null
      void fetchPortfolio()
    }
  }
}

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? ''

async function fetchPortfolio(): Promise<PortfolioItem[]> {
  if (inflight) return inflight
  inflight = fetch(`${API_BASE}/api/content/portfolio`)
    .then(r => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      return r.json() as Promise<PortfolioItem[]>
    })
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

/** Сбросить кэш и оповестить всех подписчиков (и другие вкладки).
 *  Дёргает админка после успешного save/delete/reorder. */
export function invalidatePortfolio(): void {
  cache = null
  channel?.postMessage({ type: 'invalidate' })
  void fetchPortfolio()
}

/** Список карточек портфолио. Возвращает кэш/fallback мгновенно, в фоне
 *  всегда фетчит свежее.
 *
 *  `initial` — данные, отрендеренные на сервере (см. lib/portfolio-server).
 *  Они нужны, чтобы SSR и первый клиентский рендер совпали: без них сервер
 *  отдал бы живые данные, а гидратация подставила FALLBACK, и React ругнулся
 *  бы на несовпадение. Модульный `cache` при SSR всегда пуст — он наполняется
 *  только в useEffect, то есть на клиенте, так что данные между запросами
 *  не текут. */
export function usePortfolio(initial?: PortfolioItem[]): PortfolioItem[] {
  const [items, setItems] = useState<PortfolioItem[]>(
    () => cache ?? initial ?? FALLBACK_PORTFOLIO,
  )
  useEffect(() => {
    subscribers.add(setItems)
    // На каждом маунте идём за свежими данными — не доверяем модулю.
    fetchPortfolio().catch(() => {
      /* кэш/fallback уже отдан */
    })
    return () => {
      subscribers.delete(setItems)
    }
  }, [])
  return items
}

/** Один проект по slug. null если slug отсутствует. */
export function usePortfolioItem(
  slug: string | undefined,
  initial?: PortfolioItem[],
): PortfolioItem | null {
  const items = usePortfolio(initial)
  if (!slug) return null
  return items.find(i => i.slug === slug) ?? null
}

/** Языковой бандл с автопрыжком на ru, если en пустой (и наоборот). */
export function useBundle(item: PortfolioItem | null): I18nBundle | null {
  const { i18n } = useTranslation()
  if (!item) return null
  const lang = i18n.language?.startsWith('en') ? 'en' : 'ru'
  const primary = item[lang]
  if (!primary.title) {
    const other = lang === 'ru' ? item.en : item.ru
    if (other.title) return other
  }
  return primary
}
