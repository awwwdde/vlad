'use client'

import { useTranslation } from 'react-i18next'
import type { PortfolioItem } from '@/admin/types'
import { usePortfolio } from '@/hooks/usePortfolio'
import { ProjectCard } from '@/components/ProjectCard'
import { Reveal } from '@/components/Reveal'
import { FlowerField } from '@/components/FlowerField'

export default function Work({ initialItems }: { initialItems?: PortfolioItem[] }) {
  const { t } = useTranslation()
  const items = usePortfolio(initialItems)

  return (
    <div className="relative mx-auto w-full max-w-[1920px] overflow-hidden px-5 pb-24 pt-16 md:px-[100px] md:pb-32 md:pt-24">
      <FlowerField seed={2204} count={12} />
      <div className="relative">
      <h1 className="text-[clamp(40px,6.4vw,88px)] font-semibold leading-[0.95] tracking-[-0.035em]">
        {t('work.title')}
      </h1>
      <p className="mt-6 max-w-prose text-[17px] leading-relaxed text-muted md:text-[19px]">
        {t('work.sub')}
      </p>

      {items.length === 0 ? (
        <p className="mt-20 border-t border-line pt-10 text-[16px] text-muted">
          {t('work.empty')}
        </p>
      ) : (
        <div className="mt-14 grid grid-cols-1 gap-12 md:mt-20 md:grid-cols-2 md:gap-x-8 md:gap-y-16">
          {items.map((item, i) => (
            <Reveal key={item.slug} delay={(i % 2) * 0.05}>
              <ProjectCard item={item} priority={i < 2} />
            </Reveal>
          ))}
        </div>
      )}
      </div>
    </div>
  )
}
