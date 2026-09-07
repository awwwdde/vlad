'use client'

import Link from 'next/link'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, ArrowRight, ArrowUpRight } from '@phosphor-icons/react'
import type { PortfolioItem } from '@/admin/types'
import { useBundle, usePortfolio, usePortfolioItem } from '@/hooks/usePortfolio'
import { ButtonLink } from '@/components/Button'
import { Carousel } from '@/components/Carousel'
import { FlowerField } from '@/components/FlowerField'
import { Reveal } from '@/components/Reveal'
import { RevealWords } from '@/components/hero/RevealText'
import { placeholder, projectImages } from '@/lib/projectImage'

/**
 * Страница одной работы.
 *
 * Раскладка та же, что на главной: поля в 100px, волосяные линии вместо
 * рамок, разброс блоков по сетке. Страница проекта не должна выглядеть
 * приложением к сайту.
 *
 * Порядок блоков отвечает порядку вопросов: что это (заголовок и слоган),
 * как выглядит (карусель), что внутри (описание и состав работ), куда
 * дальше (соседние проекты). Кнопка на живой сайт стоит дважды - у карусели
 * и в конце: до первой доходят не все, а после просмотра хотят открыть.
 */
interface Props {
  slug: string
  initialItems?: PortfolioItem[]
}

export default function ProjectDetail({ slug, initialItems }: Props) {
  const { t } = useTranslation()

  const items = usePortfolio(initialItems)
  const item = usePortfolioItem(slug, initialItems)

  // Хуки вызываются до ранних return-ов (правила хуков).
  const idx = item ? items.findIndex(i => i.slug === item.slug) : -1
  const prev = items.length > 1 && idx > 0 ? items[idx - 1] : null
  const next = items.length > 1 && idx >= 0 ? items[(idx + 1) % items.length] : null
  const b = useBundle(item)
  const nextBundle = useBundle(next)
  const prevBundle = useBundle(prev)

  if (!item || !b) {
    return (
      <div className="mx-auto w-full max-w-[1920px] px-5 py-32 md:px-[100px]">
        <p className="text-[19px] text-muted">{t('project.not_found')}</p>
        <Link href="/work" className="mt-4 inline-flex items-center gap-2 text-[15px] text-accent">
          <ArrowLeft size={16} />
          {t('project.back')}
        </Link>
      </div>
    )
  }

  const gallery = projectImages(item)
  const shots = gallery.length ? gallery : [placeholder(item.slug, 1600, 1000)]

  return (
    <article className="relative overflow-hidden">
      <FlowerField seed={3311} count={10} />

      <div className="relative mx-auto w-full max-w-[1920px] px-5 pb-24 pt-10 md:px-[100px] md:pb-32 md:pt-14">
        <Link
          href="/work"
          className="group inline-flex items-center gap-2 font-ui text-[14px] text-muted transition-colors duration-200 hover:text-fg"
        >
          <ArrowLeft
            size={15}
            className="transition-transform duration-200 group-hover:-translate-x-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0"
          />
          {t('project.back')}
        </Link>

        {/* ── Заголовок ─────────────────────────────────────────────────── */}
        <div className="mt-10 grid grid-cols-1 gap-y-8 md:grid-cols-12 md:gap-x-8">
          <h1 className="max-w-[13ch] text-[clamp(38px,6.4vw,92px)] font-semibold leading-[0.98] tracking-[-0.035em] md:col-span-7">
            <RevealWords text={b.title} />
          </h1>

          <Reveal delay={0.12} className="md:col-span-4 md:col-start-9 md:mt-[1.2rem]">
            <p className="max-w-prose text-[18px] leading-snug text-muted md:text-[21px]">
              {b.tagline}
            </p>
            {/* Позиция в списке — дешёвый, но настоящий контекст: видно,
                что работ несколько и эта не единственная. */}
            {idx >= 0 && items.length > 1 && (
              <p className="mt-5 font-ui text-[13px] tabular-nums text-muted">
                {t('project.position', {
                  n: String(idx + 1).padStart(2, '0'),
                  total: String(items.length).padStart(2, '0'),
                })}
              </p>
            )}
          </Reveal>
        </div>

        {/* ── Карусель ──────────────────────────────────────────────────── */}
        <div className="mt-12 md:mt-16">
          <Carousel images={shots} alt={b.title} />
          {gallery.length === 0 && (
            <p className="mt-3 font-ui text-[12px] text-muted">{t('project.no_image')}</p>
          )}
        </div>

        {/* ── Содержание ────────────────────────────────────────────────── */}
        <div className="mt-16 grid grid-cols-1 gap-y-12 md:mt-24 md:grid-cols-12 md:gap-x-8 md:gap-y-0">
          <Reveal className="md:col-span-6 md:col-start-1">
            <h2 className="font-ui text-[13px] font-medium tracking-tight text-muted">
              {t('project.overview')}
            </h2>
            <p className="mt-5 max-w-prose text-[17px] leading-relaxed md:text-[19px]">
              {b.desc}
            </p>
          </Reveal>

          <Reveal delay={0.08} className="md:col-span-4 md:col-start-8 md:mt-16">
            <h2 className="font-ui text-[13px] font-medium tracking-tight text-muted">
              {t('project.stack')}
            </h2>
            {/* Состав работ списком, а не плашками: плашки на сайте уже
                заняты, а список из четырёх строк читается быстрее россыпи. */}
            <ul className="mt-4 flex flex-col">
              {b.tags.map(tag => (
                <li key={tag} className="border-t border-line py-2.5 text-[17px] tracking-tight">
                  {tag}
                </li>
              ))}
            </ul>

            {item.link && (
              <div className="mt-8">
                <ButtonLink href={item.link} external variant="ghost">
                  {t('project.visit')}
                  <ArrowUpRight size={16} />
                </ButtonLink>
              </div>
            )}
          </Reveal>
        </div>
      </div>

      {/* ── Соседние работы ─────────────────────────────────────────────── */}
      {(prev || next) && (
        <nav className="relative border-t border-line">
          <div className="mx-auto grid w-full max-w-[1920px] grid-cols-1 gap-y-8 px-5 py-14 md:grid-cols-2 md:gap-x-8 md:px-[100px] md:py-20">
            {prev && prevBundle ? (
              <NeighbourLink
                href={`/work/${prev.slug}`}
                label={t('project.prev')}
                title={prevBundle.title}
                side="prev"
              />
            ) : (
              <span />
            )}
            {next && nextBundle && (
              <NeighbourLink
                href={`/work/${next.slug}`}
                label={t('project.next')}
                title={nextBundle.title}
                side="next"
              />
            )}
          </div>
        </nav>
      )}
    </article>
  )
}

function NeighbourLink({
  href, label, title, side,
}: { href: string; label: string; title: string; side: 'prev' | 'next' }) {
  const Icon = side === 'prev' ? ArrowLeft : ArrowRight
  return (
    <Link
      href={href}
      className={`group flex items-center gap-5 ${side === 'next' ? 'md:justify-end md:text-right' : ''}`}
    >
      {side === 'prev' && (
        <Icon
          size={22}
          className="shrink-0 text-muted transition-[transform,color] duration-200 group-hover:-translate-x-1 group-hover:text-accent motion-reduce:transition-none"
        />
      )}
      <span>
        <span className="block font-ui text-[13px] text-muted">{label}</span>
        <span className="mt-1 block text-[clamp(22px,3vw,38px)] font-semibold tracking-[-0.03em] transition-colors duration-200 group-hover:text-accent">
          {title}
        </span>
      </span>
      {side === 'next' && (
        <Icon
          size={22}
          className="shrink-0 text-muted transition-[transform,color] duration-200 group-hover:translate-x-1 group-hover:text-accent motion-reduce:transition-none"
        />
      )}
    </Link>
  )
}
