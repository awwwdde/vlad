'use client'

import { useTranslation } from 'react-i18next'
import type { I18nBundle } from '@/admin/types'
import { AsciiSculpture } from '@/components/ascii/AsciiSculpture'

export function CaseStory({ bundle: b, children }: { bundle: I18nBundle; children?: React.ReactNode }) {
  const { t } = useTranslation()
  const steps = (b.steps ?? []).filter(step => step.title.trim() || step.body.trim())
  const deliverables = (b.deliverables ?? []).filter(value => value.trim())
  return <>
    {(b.challenge?.trim() || b.approach?.trim()) && <section className="mt-20 grid gap-12 border-t border-fg/15 pt-9 md:mt-32 md:grid-cols-2 md:gap-[10%] md:pt-12" aria-label={t('project.thinking')}>
      {([['challenge', b.challenge], ['approach', b.approach]] as const).map(([key, text]) => text?.trim() && <div key={key}>
        <h2 className="text-sm text-muted">{t(`project.${key}`)}</h2>
        <p className="mt-6 whitespace-pre-line text-[clamp(24px,2.6vw,40px)] leading-[1.3] tracking-[-.035em]">{text}</p>
      </div>)}
    </section>}

    {children}

    {steps.length > 0 && <section className="mt-20 md:mt-32" aria-labelledby="case-process">
      <div className="mb-10 flex flex-wrap items-end justify-between gap-5"><h2 id="case-process" className="max-w-[15ch] text-[clamp(38px,5.6vw,82px)] font-medium leading-[1.05] tracking-[-.05em]">{t('project.process')}</h2><span aria-hidden className="font-mono text-2xl text-muted">{'{ idea → live }'}</span></div>
      <ol>{steps.map((step, i) => <li key={i} className="grid gap-5 border-t border-fg/15 py-8 md:grid-cols-[.13fr_.8fr_1fr] md:gap-8 md:py-10">
        <span aria-hidden className="font-mono text-sm text-muted">{String(i + 1).padStart(2, '0')}</span>
        <h3 className="text-[clamp(26px,3vw,44px)] font-medium leading-[1.1] tracking-[-.035em]">{step.title}</h3>
        <p className="max-w-[40ch] whitespace-pre-line text-lg leading-relaxed text-muted md:text-xl">{step.body}</p>
      </li>)}</ol>
    </section>}

    {(b.outcome?.trim() || deliverables.length > 0) && <section className="relative isolate -mx-[7.87037%] mt-20 overflow-hidden bg-[#293f4a] px-[6.8%] py-12 text-[#f3f2e9] max-[750px]:-mx-[6.81818%] max-[750px]:px-[6%] md:mt-32 md:py-20" aria-labelledby="case-outcome" data-header-dark>
      <div className="grid gap-8 lg:grid-cols-[1.25fr_.75fr] lg:gap-[7%]">
        <div className="relative z-10"><h2 id="case-outcome" className="text-sm text-[#d4be98]">{t('project.outcome')}</h2>{b.outcome?.trim() && <p className="mt-6 max-w-[25ch] whitespace-pre-line text-[clamp(28px,3.7vw,54px)] leading-[1.18] tracking-[-.04em]">{b.outcome}</p>}</div>
        <div aria-hidden className="pointer-events-none -my-5 h-[250px] opacity-80 lg:-my-10 lg:h-[320px]"><AsciiSculpture dark motionSetting="case_model_animated" /></div>
      </div>
      {deliverables.length > 0 && <div className="relative z-10 mt-12 border-t border-white/20 pt-7"><h3 className="mb-5 text-sm text-[#c1cdce]">{t('project.deliverables')}</h3><ul className="grid gap-x-10 sm:grid-cols-2">{deliverables.map((value, i) => <li key={i} className="flex gap-3 border-b border-white/15 py-4 text-lg"><span aria-hidden className="font-mono text-[#d4be98]">+</span>{value}</li>)}</ul></div>}
    </section>}
  </>
}
