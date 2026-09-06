'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, ArrowRight, ArrowUpRight } from '@phosphor-icons/react'
import type { PortfolioItem } from '@/admin/types'
import { useBundle, usePortfolio, usePortfolioItem } from '@/hooks/usePortfolio'
import { ButtonLink } from '@/components/Button'
import { projectImage } from '@/lib/projectImage'

interface Props {
  slug: string
  initialItems?: PortfolioItem[]
}

export default function ProjectDetail({ slug, initialItems }: Props) {
  const { t } = useTranslation()

  const items = usePortfolio(initialItems)
  const item = usePortfolioItem(slug, initialItems)

  // Все хуки вызываются до ранних return-ов (правила хуков).
  const idx = item ? items.findIndex(i => i.slug === item.slug) : -1
  const next = items.length > 1 && idx >= 0 ? items[(idx + 1) % items.length] : null
  const b = useBundle(item)
  const nextBundle = useBundle(next)

  if (!item || !b) {
    return (
      <div className="mx-auto w-full max-w-[1920px] px-5 py-32 md:px-[100px]">
        <p className="text-[19px] text-muted">{t('project.not_found')}</p>
        <Link href="/work" className="mt-4 inline-flex items-center gap-2 text-[15px] text-accent">
          <ArrowLeft size={16} weight="regular" />
          {t('project.back')}
        </Link>
      </div>
    )
  }

  return (
    <article>
      <div className="mx-auto w-full max-w-[1920px] px-5 pt-10 md:px-[100px] md:pt-14">
        <Link
          href="/work"
          className="group inline-flex items-center gap-2 text-[14px] text-muted transition-colors duration-200 hover:text-fg"
        >
          <ArrowLeft
            size={15}
            weight="regular"
            className="transition-transform duration-200 group-hover:-translate-x-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0"
          />
          {t('project.back')}
        </Link>

        <h1 className="mt-8 max-w-[14ch] text-[clamp(40px,6.6vw,92px)] font-semibold leading-[0.95] tracking-[-0.035em]">
          {b.title}
        </h1>
        <p className="mt-5 max-w-prose text-[19px] leading-snug text-muted md:text-[22px]">
          {b.tagline}
        </p>
      </div>

      <div className="mx-auto mt-12 w-full max-w-[1920px] px-5 md:mt-16 md:px-[100px]">
        <div className="relative aspect-[16/9] w-full overflow-hidden bg-surface">
          <Image
            src={projectImage(item, 1920, 1080)}
            alt={b.title}
            fill
            priority
            sizes="(max-width: 1400px) 100vw, 1400px"
            className="object-cover"
          />
        </div>
      </div>

      <div className="mx-auto mt-14 w-full max-w-[1920px] px-5 md:mt-20 md:px-[100px]">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-12 md:gap-8">
          <div className="md:col-span-7">
            <h2 className="font-mono text-[12px] uppercase tracking-[0.18em] text-muted">
              {t('project.overview')}
            </h2>
            <p className="mt-5 max-w-prose text-[17px] leading-relaxed md:text-[19px]">{b.desc}</p>
          </div>

          <div className="md:col-span-4 md:col-start-9">
            <h2 className="font-mono text-[12px] uppercase tracking-[0.18em] text-muted">
              {t('project.stack')}
            </h2>
            <ul className="mt-5 flex flex-wrap gap-2">
              {b.tags.map(tag => (
                <li key={tag} className="border border-line px-3 py-1.5 text-[13px] text-muted">
                  {tag}
                </li>
              ))}
            </ul>

            {item.link && (
              <div className="mt-8">
                <ButtonLink href={item.link} external variant="ghost">
                  {t('project.visit')}
                  <ArrowUpRight size={16} weight="regular" />
                </ButtonLink>
              </div>
            )}
          </div>
        </div>
      </div>

      {next && nextBundle && (
        <div className="mt-20 border-t border-line md:mt-28">
          <Link
            href={'/work/' + next.slug}
            className="group mx-auto flex w-full max-w-[1920px] items-center justify-between gap-6 px-5 py-12 md:px-[100px] md:py-16"
          >
            <div>
              <span className="font-mono text-[12px] uppercase tracking-[0.18em] text-muted">
                {t('project.next')}
              </span>
              <h2 className="mt-3 text-[clamp(28px,4.4vw,60px)] font-semibold tracking-[-0.03em] transition-colors duration-200 group-hover:text-accent">
                {nextBundle.title}
              </h2>
            </div>
            <ArrowRight
              size={28}
              weight="regular"
              className="shrink-0 text-muted transition-[transform,color] duration-200 group-hover:translate-x-1 group-hover:text-accent motion-reduce:transition-none motion-reduce:group-hover:translate-x-0"
            />
          </Link>
        </div>
      )}
    </article>
  )
}
