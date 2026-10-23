'use client'

import Link from 'next/link'
import { ArrowDown } from '@phosphor-icons/react'
import { useTranslation } from 'react-i18next'
import { AsciiSculpture } from '@/components/ascii/AsciiSculpture'

export function ContactHero() {
  const { t } = useTranslation()
  return <section id="hero" aria-labelledby="contact-title" className="relative isolate overflow-hidden bg-[#263d49] text-[#f5f2e9]">
    <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_75%_45%,rgb(91_126_138_/_30%),transparent_65%)]" />
    <div className="relative mx-auto grid min-h-[780px] max-w-[1920px] items-center gap-2 px-[6.8%] pb-16 pt-40 max-md:px-[6%] max-md:pb-9 max-md:pt-32 md:grid-cols-[1.05fr_1fr] md:gap-[3%]">
      <div className="relative z-10">
        <h1 id="contact-title" className="max-w-[7ch] animate-hero-enter text-[clamp(74px,11.5vw,176px)] font-medium leading-[.9] tracking-[-.065em] motion-reduce:animate-none">{t('contact.headline')}</h1>
        <p className="mt-8 max-w-[33ch] text-[clamp(18px,1.8vw,25px)] leading-[1.4] tracking-[-.02em] text-[#c6d3d4]">{t('contact.sub')}</p>
        <Link href="#contact-form" className="mt-8 inline-flex min-h-12 items-center gap-5 rounded-full bg-[#e0c99f] px-6 py-3 text-base font-medium tracking-[-.02em] text-[#263d49] transition-colors hover:bg-[#f2dfbd]">{t('contact.form_link')}<ArrowDown size={19} aria-hidden /></Link>
      </div>
      <div className="pointer-events-none relative -mx-[12%] h-[560px] max-md:-mx-[5%] max-md:mt-[-20px] max-md:h-[340px]"><AsciiSculpture shape="signal" dark /></div>
    </div>
  </section>
}
