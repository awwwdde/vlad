'use client'

import dynamic from 'next/dynamic'
import { useTranslation } from 'react-i18next'
import { Reveal } from '@/components/Reveal'
import { Logo } from '@/components/Logo'

const AsciiLogo = dynamic(() => import('./AsciiLogo').then(m => m.AsciiLogo), { ssr: false })
const STACK = [
  { key: 'home.stack_ui', items: ['TypeScript', 'React', 'Next.js', 'Tailwind CSS', 'Motion', 'Three.js'] },
  { key: 'home.stack_server', items: ['Python', 'FastAPI', 'Node.js', 'PostgreSQL'] },
  { key: 'home.stack_infra', items: ['Docker', 'Caddy', 'Linux', 'CI'] },
]

export function Craft({ journey = false }: { journey?: boolean }) {
  const { t } = useTranslation()
  return (
    <section id="craft" className="relative overflow-hidden bg-bg" aria-labelledby="craft-title">
      <div className={`mx-auto w-full max-w-[1920px] px-[6.8%] pt-20 max-[1100px]:px-[6%] max-[1100px]:pt-16 ${journey ? 'pb-[70svh] motion-reduce:pb-[100px]' : 'pb-[120px] max-[1100px]:pb-[88px]'}`}>
        <div className="grid grid-cols-2 items-start gap-[8%] max-[650px]:grid-cols-1 max-[650px]:gap-7 [&_h2]:m-0 [&_h2]:max-w-[16ch] [&_h2]:text-[clamp(34px,5vw,72px)] [&_h2]:font-semibold [&_h2]:leading-[1.02] [&_h2]:tracking-[-.035em]">
          <h2 id="craft-title">{t('home.craft_title')}</h2>
          <Reveal className="mt-[100px] max-w-[420px] justify-self-end text-[17px] leading-[1.65] text-muted max-[1100px]:mt-[60px] max-[1100px]:text-base max-[650px]:mt-0 max-[650px]:justify-self-start"><p>{t('home.craft_lead')}</p></Reveal>
        </div>
        <div className={`mt-[72px] grid grid-cols-[minmax(0,.9fr)_minmax(0,2.4fr)_minmax(0,.9fr)] items-start gap-9 [grid-template-areas:'steps_mark_stack'] max-[1100px]:mt-5 max-[1100px]:grid-cols-2 max-[1100px]:gap-x-[8%] max-[650px]:mt-0 max-[650px]:grid-cols-1 max-[650px]:gap-12 ${journey ? "max-[1100px]:[grid-template-areas:'steps_stack'_'mark_mark'] max-[650px]:[grid-template-areas:'steps'_'stack'_'mark']" : "max-[1100px]:[grid-template-areas:'mark_mark'_'steps_stack'] max-[650px]:[grid-template-areas:'mark'_'steps'_'stack']"}`}>
          <div className="grid gap-[42px] [grid-area:steps] max-[650px]:gap-8">
            {[1, 2, 3].map(n => (
              <Reveal key={n} className="border-t border-line pt-[22px] [&_h3]:m-0 [&_h3]:text-[clamp(20px,1.55vw,24px)] [&_h3]:font-medium [&_h3]:leading-[1.2] [&_h3]:tracking-[-.025em] [&_p]:mt-[14px] [&_p]:text-base [&_p]:leading-[1.6] [&_p]:text-muted max-[650px]:[&_p]:text-[15px]">
                <div className="flex items-baseline gap-[14px] [&_span]:text-[13px] [&_span]:tabular-nums [&_span]:text-muted">
                  <span>{`0${n}`}</span><h3>{t(`home.step${n}_title`)}</h3>
                </div>
                <p>{t(`home.step${n}_body`)}</p>
              </Reveal>
            ))}
          </div>
          <div className="relative min-h-[560px] self-stretch [grid-area:mark] max-[1100px]:min-h-[380px] max-[650px]:min-h-[320px]" data-journey-origin={journey ? '' : undefined} role="img" aria-label={t('home.craft_ascii_label')}>
            {journey ? <Logo className="absolute left-1/2 top-1/2 h-auto w-[90%] -translate-x-1/2 -translate-y-1/2 opacity-75" /> : <AsciiLogo />}
          </div>
          <div className="grid gap-12 pt-14 [grid-area:stack] max-[1100px]:pt-0 max-[650px]:gap-8 [&_h3]:text-[13px] [&_h3]:font-medium [&_h3]:text-muted [&_ul]:mt-4 [&_ul]:flex [&_ul]:flex-wrap [&_ul]:gap-x-[22px] [&_ul]:gap-y-2 [&_li]:text-[clamp(18px,1.4vw,21px)] [&_li]:leading-[1.45] [&_li]:tracking-[-.025em]">
            {STACK.map(group => (
              <Reveal key={group.key} className="border-t border-line pt-[22px]">
                <h3>{t(group.key)}</h3>
                <ul>{(t(`${group.key}_items`, { returnObjects: true, defaultValue: group.items }) as string[]).map((item, index) => <li key={index}>{item}</li>)}</ul>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
