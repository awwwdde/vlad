'use client'

import { useTranslation } from 'react-i18next'
import { ArrowUpRight } from '@phosphor-icons/react'
import type { PortfolioItem } from '@/admin/types'
import { usePortfolio } from '@/hooks/usePortfolio'
import { AsciiAtmosphere } from '@/components/work/AsciiAtmosphere'
import { WorkProjectCard } from '@/components/work/WorkProjectCard'
import { AsciiHoverText } from '@/components/AsciiHoverText'
import { ButtonLink } from '@/components/Button'
import { flagBool, useSiteSettings } from '@/hooks/useSiteSettings'

export default function Work({ initialItems }: { initialItems?: PortfolioItem[] }) {
  const { t } = useTranslation()
  const items = usePortfolio(initialItems)
  const background = flagBool(useSiteSettings(), 'work_background', true)

  return <div className="relative isolate pb-16 md:pb-24" data-work-index>
    <header className="relative flex min-h-[620px] items-end pb-14 pt-40 max-md:min-h-[560px] md:pb-20">
      {background && <AsciiAtmosphere />}
      <div className="relative mx-auto grid w-full max-w-[1920px] items-end gap-8 px-[6.8%] max-[750px]:px-[6%] lg:grid-cols-[1.2fr_1fr] lg:gap-[10%]">
        <h1 className="text-[clamp(68px,10vw,164px)] font-medium leading-[.9] tracking-[-.065em]">
          {t('work.title')}
        </h1>
        <p className="max-w-[38ch] text-base leading-relaxed text-muted md:text-[18px] lg:pb-1"><AsciiHoverText text={t('work.sub')} secret={t('work.secret')} description={t('work.hover_hint')} /></p>
      </div>
    </header>

    <div className="mx-auto w-full max-w-[1920px] px-[6.8%] max-[750px]:px-[6%]">
    <section aria-labelledby="work-list-title">
      <h2 id="work-list-title" className="sr-only">{t('work.list_label')}</h2>
      {items.length === 0 ? <p className="border-t border-line py-16 text-base text-muted">{t('work.empty')}</p> :
        <div className="grid grid-cols-1 items-start gap-x-[50px] gap-y-14 md:grid-cols-2 md:gap-y-20">
          {items.map((item, i) => <div key={item.slug} className={i === 0 ? 'md:col-span-2 md:mb-5' : i % 2 === 0 ? 'md:translate-y-20' : ''}>
            <WorkProjectCard item={item} featured={i === 0} />
          </div>)}
        </div>
      }
    </section>

    <section className="mt-28 grid items-end gap-7 border-t border-fg/15 pt-10 md:mt-48 md:grid-cols-[1.2fr_1fr] md:gap-[10%] md:pt-14" aria-labelledby="work-next-title">
      <h2 id="work-next-title" className="max-w-[17ch] text-[clamp(34px,4.3vw,68px)] font-medium leading-[1.06] tracking-[-.045em]">{t('work.next_title')}</h2>
      <div>
        <p className="mb-6 max-w-[38ch] text-base leading-relaxed text-muted">{t('work.next_body')}</p>
        <ButtonLink href="/contact">{t('common.cta_contact')}<ArrowUpRight size={17} aria-hidden="true" /></ButtonLink>
      </div>
    </section>
    </div>
  </div>
}
