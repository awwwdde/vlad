'use client'

import { useTranslation } from 'react-i18next'
import { ArrowRight } from '@phosphor-icons/react'
import type { PortfolioItem } from '@/admin/types'
import { usePortfolio } from '@/hooks/usePortfolio'
import { ButtonLink } from '@/components/Button'
import { FlowerField } from '@/components/FlowerField'
import { ProjectCard } from '@/components/ProjectCard'
import { Reveal } from '@/components/Reveal'
import { RevealWords } from '@/components/hero/RevealText'
import { cn } from '@/lib/cn'

/**
 * Три избранных проекта, разбросанных по странице.
 *
 * Тот же приём, что в секции выше: карточки сидят на общей 12-колоночной
 * сетке, но на разных колонках, с разными сдвигами вниз и разной шириной.
 * Разная ширина здесь работает вдвойне - у карточек фиксированная пропорция
 * превью, поэтому вместе с колонками меняется и размер снимка, и композиция
 * перестаёт читаться каталогом.
 *
 * Линии сверху нет: секции идут встык и должны читаться одним полотном, а не
 * набором отсеков.
 */
const FEATURED = 3

/** Позиции заданы поштучно: это композиция, а не список, и вывести её
 *  формулой означало бы вернуть регулярность, от которой мы уходим. */
const SLOTS = [
  'md:col-start-1 md:col-span-5 md:row-start-2',
  'md:col-start-7 md:col-span-6 md:row-start-2 md:mt-28',
  'md:col-start-3 md:col-span-5 md:row-start-3 md:mt-16',
]

export function FeaturedWork({ initialItems }: { initialItems?: PortfolioItem[] }) {
  const { t } = useTranslation()
  const items = usePortfolio(initialItems).slice(0, FEATURED)

  return (
    <section className="relative overflow-hidden">
      <FlowerField seed={7702} count={12} />

      <div className="relative mx-auto w-full max-w-[1920px] px-5 py-20 md:px-[100px] md:py-28">
        <div className="grid grid-cols-1 gap-y-14 md:grid-cols-12 md:gap-x-8 md:gap-y-0">
          <h2 className="text-[clamp(30px,4.2vw,58px)] font-semibold leading-[1.02] tracking-[-0.035em] md:col-span-5 md:col-start-1 md:row-start-1">
            <RevealWords inView text={t('home.work_title')} />
          </h2>

          {items.map((item, i) => (
            <Reveal key={item.slug} delay={i * 0.06} className={cn(SLOTS[i])}>
              <ProjectCard item={item} priority={i === 0} />
            </Reveal>
          ))}

          {/* Кнопка стоит не под списком, а в пустом углу разворота - там, где
              взгляд оказывается, дочитав до последней карточки. */}
          <Reveal
            delay={0.2}
            className="md:col-span-4 md:col-start-9 md:row-start-3 md:mt-40 md:justify-self-start"
          >
            <ButtonLink href="/work" variant="ghost">
              {t('home.work_all')}
              <ArrowRight size={16} weight="regular" />
            </ButtonLink>
          </Reveal>
        </div>
      </div>
    </section>
  )
}
