'use client'

import type { PortfolioItem } from '@/admin/types'
import { Hero } from '@/components/hero/Hero'
import { Craft } from '@/components/home/Craft'
import { FeaturedWork } from '@/components/home/FeaturedWork'
import { FinalCta } from '@/components/home/FinalCta'

export default function Home({ initialItems }: { initialItems?: PortfolioItem[] }) {
  return (
    <>
      <Hero />

      {/* Секции ниже героя идут встык: ни линий, ни смены тона. Страница
          читается одним полотном, а разделяют блоки воздух и смена ритма
          раскладки. */}
      <Craft />

      <FeaturedWork initialItems={initialItems} />

      <FinalCta />
    </>
  )
}
