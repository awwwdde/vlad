'use client'

import { useTranslation } from 'react-i18next'
import { ArrowRight } from '@phosphor-icons/react'
import type { PortfolioItem } from '@/admin/types'
import { usePortfolio } from '@/hooks/usePortfolio'
import { ButtonLink } from '@/components/Button'
import { ProjectCard } from '@/components/ProjectCard'

export function FeaturedWork({ initialItems }: { initialItems?: PortfolioItem[] }) {
  const { t } = useTranslation()
  const items = usePortfolio(initialItems).slice(0, 4)
  return <section className="relative" aria-labelledby="selected-work-title">
    <div className="mx-auto max-w-[1920px] px-[6.8%] pt-[120px] max-[1100px]:pt-20 max-[750px]:px-[6%] max-[750px]:pt-16">
      <div className="mb-[70px] flex items-end justify-between gap-8 max-[750px]:gap-5 [&_h2]:max-w-[12ch] [&_h2]:text-[clamp(34px,5vw,72px)] [&_h2]:font-semibold [&_h2]:leading-[1.02] [&_h2]:tracking-[-.035em]">
        <h2 id="selected-work-title">{t('home.work_title')}</h2>
        <span className="pb-2 text-xs tracking-[.06em] text-muted max-[750px]:whitespace-nowrap max-[750px]:text-[10px]">{String(items.length).padStart(2, '0')} / {t('nav.projects')}</span>
      </div>
      <div className="grid grid-cols-1 gap-[50px] sm:grid-cols-2 sm:grid-rows-[repeat(5,minmax(0,1fr))]" data-project-grid>
        {items.map((item, i) => <article key={item.slug} className={`sm:row-span-2 ${[
          'sm:col-start-1 sm:row-start-1', 'sm:col-start-2 sm:row-start-2',
          'sm:col-start-1 sm:row-start-3', 'sm:col-start-2 sm:row-start-4',
        ][i]}`} data-work-step={i}>
          <div className="relative h-full" data-work-card>
            <span className="mb-[18px] block text-xs tracking-[.06em] text-muted">{String(i + 1).padStart(2, '0')} / {String(items.length).padStart(2, '0')}</span>
            <ProjectCard item={item} />
          </div>
        </article>)}
      </div>
      <div className="mt-[70px] flex justify-center"><ButtonLink href="/work" variant="ghost">{t('nav.all_projects')}<ArrowRight size={16} /></ButtonLink></div>
    </div>
  </section>
}
