'use client'

import Image from 'next/image'
import Link from 'next/link'
import { ArrowUpRight } from '@phosphor-icons/react'
import type { PortfolioItem } from '@/admin/types'
import { useBundle } from '@/hooks/usePortfolio'
import { projectImage } from '@/lib/projectImage'
import { cn } from '@/lib/cn'

export function ProjectCard({
  item,
  priority = false,
  className,
}: {
  item: PortfolioItem
  priority?: boolean
  className?: string
}) {
  const b = useBundle(item)
  if (!b) return null

  return (
    <Link href={`/work/${item.slug}`} className={cn('group block', className)}>
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-surface">
        <Image
          src={projectImage(item, 1200, 900)}
          alt={b.title}
          fill
          priority={priority}
          sizes="(max-width: 768px) 100vw, 50vw"
          className="object-cover transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
        />
      </div>

      <div className="mt-4 flex items-start justify-between gap-4">
        <div>
          <h3 className="text-[19px] font-medium leading-snug tracking-tight text-fg">
            {b.title}
          </h3>
          <p className="mt-1 max-w-prose text-[14px] leading-snug text-muted">{b.tagline}</p>
        </div>
        <ArrowUpRight
          size={18}
          weight="regular"
          className="mt-1 shrink-0 text-muted transition-colors duration-200 group-hover:text-accent"
        />
      </div>
    </Link>
  )
}
