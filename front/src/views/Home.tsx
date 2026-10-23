'use client'

import type { PortfolioItem } from '@/admin/types'
import { Hero } from '@/components/hero/Hero'
import { WorkJourney } from '@/components/home/WorkJourney'
import { PORTFOLIO_THEME } from '@/lib/siteTheme'

export default function Home({ initialItems }: { initialItems?: PortfolioItem[] }) {
  return (
    <div className={PORTFOLIO_THEME}>
      <Hero />

      {/* Секции ниже героя идут встык: ни линий, ни смены тона. Страница
          читается одним полотном, а разделяют блоки воздух и смена ритма
          раскладки. */}
      <WorkJourney initialItems={initialItems} />

    </div>
  )
}
