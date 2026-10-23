'use client'

import { useCallback, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AboutReveal } from './AboutReveal'
import { RunningCat } from './RunningCat'
import { flagBool, useSiteSettings } from '@/hooks/useSiteSettings'

export function NowSection() {
  const { t } = useTranslation()
  const settings = useSiteSettings()
  const enabled = flagBool(settings, 'about_cat_enabled', true)
  const [cat, setCat] = useState<'idle' | 'running' | 'still'>('idle')
  const clicks = useRef({ count: 0, last: 0 })
  const finish = useCallback(() => setCat('idle'), [])
  const activate = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (!enabled || cat !== 'idle') return
    const now = performance.now()
    clicks.current.count = now - clicks.current.last > 2400 ? 1 : clicks.current.count + 1
    clicks.current.last = now
    if (clicks.current.count === 3) {
      clicks.current.count = 0
      setCat(event.detail === 0 || matchMedia('(prefers-reduced-motion: reduce)').matches ? 'still' : 'running')
    }
  }
  return <section aria-labelledby="about-now-title" className="relative overflow-hidden bg-[#293f4a] text-[#f3f2e9]" data-header-dark data-now-cat={cat}>
    {enabled && <button type="button" onClick={activate} aria-label={t('about.now_action')} className="absolute inset-0 z-10 cursor-default border-0 bg-transparent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-5px] focus-visible:outline-[#d4be98]" />}
    <div className="pointer-events-none mx-auto grid max-w-[1920px] gap-9 px-[6.8%] pb-36 pt-16 max-md:px-[6%] md:grid-cols-[.65fr_1.35fr] md:gap-[10%] md:pb-44 md:pt-28">
      <div><h2 id="about-now-title" className="text-base text-[#d4be98]">{t('about.now_title')}</h2><span aria-hidden className="mt-12 hidden font-mono text-[clamp(80px,9vw,150px)] leading-none tracking-[-.15em] text-[#b4c4c5]/25 md:block">{'{ : }'}</span></div>
      <AboutReveal><p className="max-w-[30ch] text-[clamp(27px,3.5vw,52px)] leading-[1.2] tracking-[-.04em]">{t('about.now_body')}</p></AboutReveal>
    </div>
    {enabled && cat !== 'idle' && <RunningCat still={cat === 'still'} finish={finish} />}
  </section>
}

