'use client'

import { useTranslation } from 'react-i18next'
import Link from 'next/link'
import { ArrowUpRight } from '@phosphor-icons/react'
import { AboutHero } from '@/components/about/AboutHero'
import { AboutReveal } from '@/components/about/AboutReveal'
import { NowSection } from '@/components/about/NowSection'

const APPROACH = ['understand', 'design', 'build'] as const
const TOOLS = ['interface', 'logic', 'launch'] as const

export default function About() {
  const { t } = useTranslation()
  return <div data-about-page>
    <AboutHero />
    <section id="about-story" aria-labelledby="about-story-title" className="mx-auto max-w-[1920px] scroll-mt-28 px-[6.8%] py-20 max-md:px-[6%] md:py-32">
      <AboutReveal className="grid gap-9 border-t border-fg/20 pt-8 md:grid-cols-[1.1fr_1fr] md:gap-[12%]">
        <h2 id="about-story-title" className="max-w-[12ch] text-[clamp(44px,6vw,92px)] font-medium leading-[1.01] tracking-[-.055em]">{t('about.story_title')}</h2>
        <div className="max-w-[45ch] space-y-6 text-lg leading-relaxed text-muted md:pt-2 md:text-xl"><p>{t('about.body1')}</p><p>{t('about.body2')}</p></div>
      </AboutReveal>
      <div className="mt-20 md:mt-32">{APPROACH.map((key, index) => <AboutReveal key={key} className="grid items-start gap-6 border-t border-fg/20 py-9 md:grid-cols-[1.1fr_1fr] md:gap-[12%] md:py-12">
        <h3 className="flex items-start gap-5 text-[clamp(30px,4.4vw,66px)] font-medium leading-[1.08] tracking-[-.045em]"><span aria-hidden className="mt-2 shrink-0 font-mono text-lg tracking-normal text-muted">{['{ }', '< >', '[ ]'][index]}</span>{t(`about.${key}_title`)}</h3>
        <p className="max-w-[42ch] text-lg leading-relaxed text-muted md:pt-2">{t(`about.${key}_body`)}</p>
      </AboutReveal>)}</div>
    </section>
    <NowSection />
    <section aria-labelledby="about-tools-title" className="mx-auto max-w-[1920px] px-[6.8%] py-20 max-md:px-[6%] md:py-32">
      <AboutReveal className="mb-12 grid gap-7 md:mb-16 md:grid-cols-[1.1fr_1fr] md:gap-[12%]"><h2 id="about-tools-title" className="max-w-[15ch] text-[clamp(38px,5vw,74px)] font-medium leading-[1.04] tracking-[-.05em]">{t('about.tools_title')}</h2><p className="max-w-[42ch] text-lg leading-relaxed text-muted">{t('about.tools_body')}</p></AboutReveal>
      {TOOLS.map(key => <AboutReveal key={key} className="grid gap-5 border-t border-fg/20 py-7 md:grid-cols-[1.1fr_1fr] md:gap-[12%]"><h3 className="text-base text-muted">{t(`about.${key}`)}</h3><ul className="flex flex-wrap gap-x-7 gap-y-3">{(t(`about.tools_${key}`, { returnObjects: true }) as string[]).map((tool, index) => <li key={index} className="text-[clamp(22px,2.5vw,36px)] tracking-[-.035em]">{tool}</li>)}</ul></AboutReveal>)}
      <AboutReveal className="mt-16 border-t border-fg/20 pt-10 md:mt-28 md:pt-14"><Link href="/work" className="group flex items-center justify-between gap-8 text-[clamp(36px,6.5vw,104px)] font-medium leading-[1.03] tracking-[-.055em]"><span className="max-w-[15ch]">{t('about.work_transition')}</span><span className="flex size-16 shrink-0 items-center justify-center rounded-full border border-fg/25 transition-colors group-hover:bg-fg group-hover:text-bg md:size-24"><ArrowUpRight className="size-8 md:size-12" aria-hidden /></span></Link></AboutReveal>
    </section>
  </div>
}
