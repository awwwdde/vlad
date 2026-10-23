'use client'

import dynamic from 'next/dynamic'
import type { PortfolioItem } from '@/admin/types'
import { Craft } from './Craft'
import { FeaturedWork } from './FeaturedWork'
import { Logo } from '@/components/Logo'
import { SiteFooter } from '@/components/SiteFooter'
import { FinalCta } from './FinalCta'

const AsciiLogo = dynamic(() => import('./AsciiLogo').then(m => m.AsciiLogo), { ssr: false })

export function WorkJourney({ initialItems }: { initialItems?: PortfolioItem[] }) {
  return <div className="group/journey relative isolate [&[data-journey-ready=true]_[data-journey-origin]>svg]:invisible [&[data-journey-ready=true]_[data-journey-end]>svg]:invisible motion-reduce:[&_[data-journey-origin]>svg]:!visible motion-reduce:[&_[data-journey-end]>svg]:!visible" data-work-journey>
    <div className="pointer-events-none absolute inset-0 z-[2] motion-reduce:hidden" aria-hidden="true"><div className="sticky top-0 h-[100svh] w-full"><AsciiLogo journey /></div></div>
    <Craft journey />
    <FeaturedWork initialItems={initialItems} />
    <div className="box-content grid min-h-[72svh] place-items-center pb-[110svh] max-[650px]:min-h-[56svh] motion-reduce:pb-0" aria-hidden="true"><div className="relative grid h-80 w-[min(660px,70%)] place-items-center max-[650px]:h-[280px] max-[650px]:w-[85%] [&_svg]:h-auto [&_svg]:w-[90%] [&_svg]:opacity-75" data-journey-end><Logo /></div></div>
    <section className="relative z-10 flex min-h-[100svh] flex-col overflow-hidden" data-journey-finale aria-labelledby="finale-title">
      <FinalCta />
    </section>
    <SiteFooter journey />
  </div>
}
