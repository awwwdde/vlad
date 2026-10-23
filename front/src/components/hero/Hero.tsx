'use client'

import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useTranslation } from 'react-i18next'
import { ArrowUpRight } from '@phosphor-icons/react'
import { AsciiText } from '@/components/AsciiText'
import { ThinkingOrb } from './ThinkingOrb'

// Text is server rendered immediately; the decorative renderer is a separate
// client chunk. The previous Three.js scene is no longer on this import path.
const AsciiSky = dynamic(() => import('./AsciiSky').then(m => m.AsciiSky), { ssr: false })

export function Hero() {
  const { t } = useTranslation()
  const title = t('home.sky_title1')
  const punctuation = title.endsWith('.') ? '.' : ''
  const words = (punctuation ? title.slice(0, -1) : title).trimEnd()
  const split = words.lastIndexOf(' ') + 1
  return (
    <section id="hero" className="relative isolate flex min-h-[max(640px,100svh)] items-end overflow-hidden bg-[#536d79] bg-[url('/sky-fallback.svg')] bg-cover bg-center bg-no-repeat text-[#f8f7f3] [text-rendering:optimizeLegibility] max-[700px]:min-h-[max(740px,100svh)] [@media(max-height:550px)_and_(min-width:701px)]:min-h-[550px] [&_a:focus-visible]:outline [&_a:focus-visible]:outline-2 [&_a:focus-visible]:outline-offset-[5px] [&_a:focus-visible]:outline-[#f8f7f3]" aria-labelledby="hero-title">
      <AsciiSky />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgb(23_43_54_/_12%),transparent_40%,rgb(30_49_57_/_12%)_65%,rgb(35_53_60_/_24%))]" aria-hidden="true" />
      <div className="relative mx-auto grid w-full max-w-[1920px] grid-cols-[minmax(0,1fr)_clamp(310px,23vw,365px)] items-end gap-[6%] pb-[clamp(52px,8svh,86px)] pl-[6.8%] pr-[5.2%] pt-[180px] max-[1050px]:grid-cols-[minmax(0,1fr)_310px] max-[1050px]:gap-7 max-[700px]:grid-cols-1 max-[700px]:px-[6%] max-[700px]:pt-[260px] max-[700px]:pb-[max(34px,env(safe-area-inset-bottom))] [@media(max-height:550px)_and_(min-width:701px)]:pt-[190px] [@media(max-height:550px)_and_(min-width:701px)]:pb-[35px]">
        <h1 id="hero-title" className="m-0 text-[clamp(42px,4.3vw,76px)] font-normal leading-[.98] tracking-[-.035em] max-[1050px]:text-[clamp(38px,4.7vw,52px)] max-[700px]:text-[clamp(34px,7.7vw,52px)] max-[700px]:leading-[1.08] [&>span]:block [&>span]:animate-hero-enter motion-reduce:[&>span]:animate-none [&>span:nth-child(2)]:[animation-delay:60ms] [&>span:nth-child(3)]:[animation-delay:120ms]">
          <span><AsciiText text={title} secret={t('home.easter_hero')} description={t('home.easter_hint')}>{words.slice(0, split)}<span className="whitespace-nowrap">{words.slice(split)}<ThinkingOrb />{punctuation}</span></AsciiText></span>
          <span className="text-[#bcc9ca]">{t('home.sky_title2')}</span>
          <span className="text-[#bcc9ca]">{t('home.sky_title3')}</span>
        </h1>
        <div className="pb-0.5 max-[700px]:max-w-[370px] [&_p]:max-w-[380px] [&_p]:whitespace-pre-line [&_p]:text-[clamp(16px,1.25vw,19px)] [&_p]:leading-[1.35] [&_p]:tracking-[-.025em] [&_p]:animate-hero-enter [&_p]:[animation-delay:180ms] max-[1050px]:[&_p]:text-base motion-reduce:[&_p]:animate-none">
          <p>{t('home.sky_description')}</p>
          <div className="mt-[26px] flex animate-hero-enter flex-wrap items-center gap-4 [animation-delay:240ms] max-[1050px]:gap-2 max-[700px]:mt-[21px] max-[700px]:gap-2.5 focus-within:animate-none motion-reduce:animate-none">
            <Link href="/work" className="inline-flex min-h-[46px] items-center justify-center gap-1.5 rounded-full border px-5 py-2.5 text-[17px] leading-[1.25] tracking-[-.035em] transition-colors duration-150 max-[1050px]:px-[15px] max-[1050px]:text-sm max-[700px]:text-[15px] motion-reduce:transition-none border-transparent bg-[#f8f7f3] text-[#192329] [@media(hover:hover)_and_(pointer:fine)]:hover:bg-[#e4e8e6]">
              {t('home.sky_work')} <ArrowUpRight size={17} aria-hidden="true" />
            </Link>
            <Link href="/contact" className="inline-flex min-h-[46px] items-center justify-center gap-1.5 rounded-full border px-5 py-2.5 text-[17px] leading-[1.25] tracking-[-.035em] transition-colors duration-150 max-[1050px]:px-[15px] max-[1050px]:text-sm max-[700px]:text-[15px] motion-reduce:transition-none border-[rgb(235_239_236_/_45%)] bg-[rgb(202_217_219_/_8%)] text-[#f8f7f3] backdrop-blur-xl [@media(hover:hover)_and_(pointer:fine)]:hover:bg-[rgb(230_237_235_/_18%)] [@media(hover:hover)_and_(pointer:fine)]:hover:border-[#f8f7f3] [@media(prefers-reduced-transparency:reduce)]:bg-[#536d79] [@media(prefers-reduced-transparency:reduce)]:backdrop-blur-none">{t('home.sky_contact')}</Link>
          </div>
        </div>
      </div>
    </section>
  )
}
