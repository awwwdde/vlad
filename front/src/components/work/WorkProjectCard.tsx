'use client'

import Image from 'next/image'
import Link from 'next/link'
import { ArrowUpRight } from '@phosphor-icons/react'
import type { PortfolioItem } from '@/admin/types'
import { useBundle } from '@/hooks/usePortfolio'
import { projectImages } from '@/lib/projectImage'
import { AsciiProjectCover } from './AsciiProjectCover'

export function WorkProjectCard({ item, featured = false }: { item: PortfolioItem; featured?: boolean }) {
  const b = useBundle(item), cover = projectImages(item)[0]
  if (!b) return null
  return <Link href={`/work/${item.slug}`} className="group block" data-work-project>
    <div className={`relative isolate overflow-hidden bg-surface ${featured ? 'aspect-[16/10] md:aspect-[16/8]' : 'aspect-[4/3]'}`}>
      <div className="absolute inset-0 transition-transform duration-500 ease-[cubic-bezier(.23,1,.32,1)] [@media(hover:hover)_and_(pointer:fine)]:group-hover:scale-[1.025] motion-reduce:transition-none motion-reduce:group-hover:scale-100">
        {cover ? <Image src={cover} alt={b.title} fill priority={featured} sizes={featured ? '87vw' : '(max-width: 768px) 87vw, 42vw'} className="object-cover" /> : <AsciiProjectCover seed={item.slug} />}
      </div>
      <span aria-hidden className="absolute bottom-5 right-5 grid size-11 place-items-center rounded-full bg-bg/80 text-fg backdrop-blur-sm transition-colors group-hover:bg-bg md:bottom-7 md:right-7"><ArrowUpRight size={21} /></span>
    </div>
    <div className="mt-5 grid items-baseline gap-2 md:mt-6">
      <h3 className="text-[clamp(24px,2.5vw,38px)] font-medium leading-tight tracking-[-.04em]">{b.title}</h3>
      <p className="max-w-[42ch] text-base leading-relaxed text-muted md:text-[18px]">{b.tagline}</p>
    </div>
  </Link>
}
