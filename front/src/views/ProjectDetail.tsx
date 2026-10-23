'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, ArrowUpRight } from '@phosphor-icons/react'
import type { PortfolioItem } from '@/admin/types'
import { useBundle, usePortfolio } from '@/hooks/usePortfolio'
import { ButtonLink } from '@/components/Button'
import { AsciiHoverText } from '@/components/AsciiHoverText'
import { Logo } from '@/components/Logo'
import { projectImage, projectImages } from '@/lib/projectImage'
import { AsciiProjectCover } from '@/components/work/AsciiProjectCover'
import { CaseStory } from '@/components/work/CaseStory'

export default function ProjectDetail({ slug, initialItems }: { slug: string; initialItems?: PortfolioItem[] }) {
  const { t } = useTranslation()
  const items = usePortfolio(initialItems)
  const index = items.findIndex(project => project.slug === slug)
  const item = items[index] ?? null
  const next = items.length > 1 && index >= 0 ? items[(index + 1) % items.length] : null
  const previous = index > 0 ? items[index - 1] : null
  const b = useBundle(item), nextBundle = useBundle(next)

  if (!item || !b) return <div className="mx-auto max-w-[1920px] px-[6.8%] py-24">
    <h1 className="text-4xl tracking-tight">{t('project.not_found')}</h1>
    <Link href="/work" className="mt-8 inline-flex items-center gap-2 text-muted"><ArrowLeft size={16} />{t('project.back')}</Link>
  </div>

  const images = projectImages(item)
  const cover = images[0]
  const gallery = images.slice(1)
  const facts = ([['client', b.client], ['year', b.year], ['role', b.role], ['duration', b.duration]] as const).filter(([, value]) => value?.trim())

  return <article className="mx-auto w-full max-w-[1920px] px-[6.8%] pb-16 pt-10 max-[750px]:px-[6%] md:pb-24 md:pt-16" data-project-detail>
    <header>
      <Link href="/work" className="inline-flex min-h-11 items-center gap-2 text-sm text-muted transition-colors hover:text-fg"><ArrowLeft size={16} aria-hidden />{t('project.back')}</Link>
      <div className="mt-9 grid items-end gap-8 lg:mt-12 lg:grid-cols-[1.5fr_1fr] lg:gap-[8%]">
        <h1 className="min-w-0 break-words text-[clamp(48px,7.7vw,124px)] font-semibold leading-[.98] tracking-[-.055em]">
          <AsciiHoverText key={slug} text={b.title} secret={t('project.secret')} description={t('work.hover_hint')} />
        </h1>
        <div className="lg:pb-1">
          <p className="max-w-[28ch] text-[clamp(20px,2.1vw,32px)] leading-[1.2] tracking-[-.025em] text-muted">{b.tagline}</p>
          {item.link && <ButtonLink href={item.link} external variant="ghost" className="mt-7 border-fg/20">{t('project.live')}<ArrowUpRight size={17} aria-hidden /></ButtonLink>}
        </div>
      </div>
      {facts.length > 0 && <dl className="mt-12 grid grid-cols-2 gap-x-8 gap-y-6 border-t border-fg/15 pt-6 lg:mt-16 lg:grid-cols-4">{facts.map(([key, value]) => <div key={key}><dt className="text-sm text-muted">{t(`project.${key}`)}</dt><dd className="mt-3 whitespace-pre-line text-base leading-relaxed md:text-lg">{value}</dd></div>)}</dl>}
    </header>

    <figure className="mt-12 md:mt-20">
      <div className="relative aspect-[16/10] overflow-hidden bg-surface md:aspect-[16/9]">
        {cover ? <Image src={cover} alt={b.gallery_captions?.[0]?.trim() || b.title} fill priority sizes="(max-width: 1920px) 87vw, 1660px" className="object-cover" /> : <AsciiProjectCover seed={item.slug} />}
      </div>
      {images.length === 0 && <figcaption className="mt-3 text-xs text-muted">{t('project.no_image')}</figcaption>}
      {cover && b.gallery_captions?.[0]?.trim() && <figcaption className="mt-4 text-sm text-muted">{b.gallery_captions[0]}</figcaption>}
    </figure>

    <section className="mt-16 grid gap-10 border-t border-fg/15 pt-8 md:mt-24 md:grid-cols-[1.5fr_1fr] md:gap-[8%] md:pt-10" aria-labelledby="project-overview">
      <div>
        <h2 id="project-overview" className="mb-6 text-sm text-muted">{t('project.overview')}</h2>
        {b.desc && <div className="max-w-[34ch] whitespace-pre-line text-[clamp(22px,2.55vw,38px)] leading-[1.3] tracking-[-.03em]">{b.desc}</div>}
      </div>
      {b.tags.length > 0 && <div>
        <h2 className="mb-6 text-sm text-muted">{t('project.stack')}</h2>
        <ul>{b.tags.map(tag => <li key={tag} className="border-t border-fg/15 py-4 text-lg tracking-tight first:border-t-0 first:pt-0 md:text-xl">{tag}</li>)}</ul>
      </div>}
    </section>

    <CaseStory bundle={b}>
      {gallery.length > 0 && <section className="mt-16 md:mt-24" aria-labelledby="project-gallery">
      <h2 id="project-gallery" className="mb-7 text-sm text-muted">{t('project.details')}</h2>
      <div className="grid grid-cols-1 items-start gap-6 md:grid-cols-2 md:gap-[50px]">
        {gallery.map((src, i) => <figure key={`${src}-${i}`} className={i % 3 === 0 ? 'md:col-span-2' : ''}>
          <Image src={src} alt={b.gallery_captions?.[i + 1]?.trim() || t('project.image_alt', { title: b.title, n: i + 2 })} width={1600} height={1000} sizes={i % 3 === 0 ? '87vw' : '(max-width: 768px) 87vw, 42vw'} className="h-auto w-full bg-surface" />
          {b.gallery_captions?.[i + 1]?.trim() && <figcaption className="mt-4 text-sm leading-relaxed text-muted">{b.gallery_captions[i + 1]}</figcaption>}
        </figure>)}
      </div>
    </section>}
    </CaseStory>



    <section className="mt-20 flex flex-col items-start justify-between gap-7 border-t border-fg/15 pt-9 md:mt-28 md:flex-row md:items-center" aria-labelledby="project-discuss">
      <h2 id="project-discuss" className="max-w-[19ch] text-[clamp(30px,3.6vw,54px)] font-medium leading-[1.08] tracking-[-.04em]">{t('project.discuss')}</h2>
      <ButtonLink href="/contact">{t('common.cta_contact')}<ArrowUpRight size={17} aria-hidden /></ButtonLink>
    </section>

    {next && nextBundle && <nav className="mt-20 border-t border-fg/15 pt-9 md:mt-28" aria-label={t('project.more')}>
      <Link href={`/work/${next.slug}`} className="group grid items-center gap-8 md:grid-cols-[1fr_1fr] md:gap-[8%]" data-project-next>
        <div>
          <span className="text-sm text-muted">{t('project.next')}</span>
          <h2 className="mt-5 flex items-start gap-5 text-[clamp(36px,5.7vw,88px)] font-semibold leading-[1.02] tracking-[-.045em] transition-colors group-hover:text-accent">{nextBundle.title}<ArrowUpRight className="mt-[.08em] size-[.65em] shrink-0" aria-hidden /></h2>
          <p className="mt-5 max-w-[30ch] text-base leading-relaxed text-muted">{nextBundle.tagline}</p>
        </div>
        <div className="relative aspect-[4/3] overflow-hidden bg-surface">
          {projectImages(next).length > 0 ? <Image src={projectImage(next, 1000, 750)} alt={nextBundle.title} fill sizes="(max-width: 768px) 87vw, 42vw" className="object-cover transition-transform duration-500 ease-[cubic-bezier(.23,1,.32,1)] [@media(hover:hover)_and_(pointer:fine)]:group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100" /> : <Logo className="absolute left-1/2 top-1/2 h-auto w-1/2 -translate-x-1/2 -translate-y-1/2 opacity-15" />}
        </div>
      </Link>
      <div className="mt-9 flex flex-wrap justify-between gap-5 text-sm text-muted">
        <Link href="/work" className="inline-flex min-h-11 items-center gap-2 hover:text-fg"><ArrowLeft size={16} aria-hidden />{t('project.back')}</Link>
        {previous && <Link href={`/work/${previous.slug}`} className="inline-flex min-h-11 items-center gap-2 hover:text-fg">{t('project.prev')}<ArrowLeft size={16} aria-hidden /></Link>}
      </div>
    </nav>}
  </article>
}
