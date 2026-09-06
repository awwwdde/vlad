import type { PortfolioItem } from '@/admin/types'
import { FALLBACK_PORTFOLIO } from '@/data/portfolioFallback'

// Серверный фетч портфолио для SSR/ISR. В контейнере ходим напрямую в панель
// по внутреннему адресу сети Docker (panel:8000) — Caddy в этом пути не нужен.
// Локально по умолчанию — uvicorn на localhost:8000.
const SERVER_API_BASE =
  process.env.INTERNAL_API_BASE ?? process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:8000'

// Кэш страницы живёт минуту: правки из админки доезжают почти сразу, но каждый
// заход на /work не бьёт в FastAPI. Клиент поверх этого всё равно делает
// stale-while-revalidate (см. usePortfolio).
const REVALIDATE_SECONDS = 60

export async function getPortfolio(): Promise<PortfolioItem[]> {
  try {
    const r = await fetch(`${SERVER_API_BASE}/api/content/portfolio`, {
      next: { revalidate: REVALIDATE_SECONDS },
    })
    if (!r.ok) return FALLBACK_PORTFOLIO
    return (await r.json()) as PortfolioItem[]
  } catch {
    // Бек недоступен на сборке/рендере — отдаём бандленный фолбэк, страница
    // остаётся живой, клиент дотянет свежее.
    return FALLBACK_PORTFOLIO
  }
}

export async function getPortfolioItem(slug: string): Promise<PortfolioItem | null> {
  const items = await getPortfolio()
  return items.find(i => i.slug === slug) ?? null
}
