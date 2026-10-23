'use client'

import Link from 'next/link'
import { useTranslation } from 'react-i18next'
import { ArrowDown } from '@phosphor-icons/react'
import { AsciiRibbon } from './AsciiRibbon'

export function AboutHero() {
  const { t } = useTranslation()
  return <section id="hero" aria-labelledby="about-title" className="relative isolate mx-auto w-full max-w-[1920px] overflow-hidden px-[6.8%] pb-12 pt-36 max-md:px-[6%] max-md:pt-28 md:min-h-[850px] md:pb-16 md:pt-44" data-about-scene>
    <div className="relative">
      <div className="pointer-events-none absolute -right-[14%] -top-[8%] -z-10 h-[125%] w-[78%] max-md:relative max-md:-right-[28%] max-md:mb-[-170px] max-md:mt-[-30px] max-md:h-[320px] max-md:w-full max-md:opacity-60"><AsciiRibbon /></div>
      <h1 id="about-title" className="relative max-w-[9ch] animate-hero-enter text-[clamp(68px,10.6vw,176px)] font-medium leading-[.92] tracking-[-.065em] motion-reduce:animate-none max-md:text-[clamp(54px,17.2vw,100px)]">
        <span className="block">{t('about.manifest_line1')}</span><span className="block">{t('about.manifest_line2')}</span><span className="block text-[#71898d]">{t('about.manifest_line3')}</span>
      </h1>
    </div>
    <div className="relative mt-12 grid items-end gap-8 md:mt-16 md:grid-cols-[1.1fr_1fr] md:gap-[12%]">
      <Link href="#about-story" className="flex min-h-12 w-fit items-center gap-4 text-base underline decoration-fg/25 underline-offset-8"><span className="flex size-12 items-center justify-center rounded-full border border-fg/25"><ArrowDown size={20} aria-hidden /></span>{t('about.read_more')}</Link>
      <p className="max-w-[29ch] text-[clamp(20px,2vw,29px)] leading-[1.3] tracking-[-.025em]">{t('about.hero_role')}</p>
    </div>
  </section>
}
