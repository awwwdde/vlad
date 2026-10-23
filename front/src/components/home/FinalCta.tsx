'use client'

import { useTranslation } from 'react-i18next'
import { ArrowUpRight, Calculator } from '@phosphor-icons/react'
import { ButtonLink } from '@/components/Button'
import { useSiteSettings } from '@/hooks/useSiteSettings'
import { contactEmail, publicLink, SITE_DEFAULTS } from '@/lib/siteSettings'

const BLOCKS = [
  { labelKey: 'home.cta_brief_label', bodyKey: 'home.cta_brief_body' },
  { labelKey: 'home.cta_terms_label', bodyKey: 'home.cta_terms_body' },
  { labelKey: 'home.cta_next_label', bodyKey: 'home.cta_next_body' },
]

/** Full-width foreground over the expanding ASCII mark. */
export function FinalCta() {
  const { t } = useTranslation()
  const settings = useSiteSettings(), email = contactEmail(settings)
  return (
    <div className="relative flex flex-1 items-center" data-journey-contact>
      <div className="mx-auto w-full max-w-[1920px] px-[6.8%] py-16 md:py-20">
        <div className="grid items-start gap-10 md:grid-cols-[1.05fr_1fr] md:gap-[10%]">
          <h2 id="finale-title" className="max-w-[13ch] text-[clamp(42px,5.7vw,88px)] font-semibold leading-[.99] tracking-[-.045em]">
            {t('home.cta_title')}
          </h2>
          <div className="max-w-[620px] md:pt-2">
            <p className="max-w-[43ch] text-base leading-relaxed text-muted md:text-[17px]">{t('home.cta_body')}</p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <ButtonLink href="/contact">{t('common.cta_contact')}</ButtonLink>
              <ButtonLink href={publicLink(settings?.calculator_url, SITE_DEFAULTS.calculator_url) || SITE_DEFAULTS.calculator_url} variant="ghost" className="max-w-full whitespace-normal border-fg/20 text-left leading-snug">
                <Calculator size={18} className="shrink-0" aria-hidden="true" />{t('home.cost_calculator')}
              </ButtonLink>
            </div>
            <div className="mt-6">
              <span className="block font-ui text-[13px] text-muted">{t('home.cta_direct')}</span>
              <a href={`mailto:${email}`} className="mt-1.5 inline-flex max-w-full items-center gap-1.5 break-all text-[17px] tracking-tight text-fg underline decoration-fg/25 underline-offset-4 transition-colors hover:decoration-accent md:text-[19px]">
                {email}<ArrowUpRight size={16} className="shrink-0" aria-hidden="true" />
              </a>
            </div>
          </div>
        </div>
        <div className="mt-14 grid gap-8 md:mt-20 md:grid-cols-3 md:gap-[50px]">
          {BLOCKS.map(block => (
            <div key={block.labelKey} className="border-t border-fg/15 pt-5">
              <h3 className="font-ui text-[13px] font-medium tracking-tight text-muted">{t(block.labelKey)}</h3>
              <p className="mt-3 max-w-[45ch] text-[15px] leading-relaxed md:text-base">{t(block.bodyKey)}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
