'use client'

import Link from 'next/link'
import dynamic from 'next/dynamic'
import { useTranslation } from 'react-i18next'
import { Logo } from './Logo'
import { useSiteSettings } from '@/hooks/useSiteSettings'
import { contactEmail, publicLink, SITE_DEFAULTS } from '@/lib/siteSettings'

const FooterLogo = dynamic(() => import('./home/AsciiLogo').then(m => m.AsciiLogo), { ssr: false })
const link = 'inline-flex min-h-11 items-center py-2 transition-colors duration-150 hover:text-fg motion-reduce:transition-none'

export function SiteFooter({ journey = false }: { journey?: boolean }) {
  const { t } = useTranslation()
  const settings = useSiteSettings(), email = contactEmail(settings)
  const socials = ['telegram', 'github', 'instagram'].map(name => ({ name, href: publicLink(settings?.[`social_${name}`], SITE_DEFAULTS[`social_${name}`]) }))
  return <footer className={`relative z-10 isolate overflow-hidden text-fg ${journey ? 'bg-transparent' : 'bg-bg'}`} role="contentinfo" data-ascii-footer data-journey-footer={journey || undefined}>
    <div className="relative mx-auto flex min-h-[490px] w-full max-w-[1920px] flex-col px-[6.8%] pb-5 pt-12 md:min-h-[560px] md:pt-16">
      <div className="relative z-10 flex flex-col items-center gap-3 text-center">
        <a href={`mailto:${email}`} className="max-w-full break-all text-[clamp(26px,3.5vw,56px)] font-medium leading-tight tracking-[-.045em] underline decoration-fg/20 underline-offset-8 transition-colors duration-150 hover:text-accent">{email}</a>
        <nav aria-label={t('footer.socials_label')} className="flex flex-wrap justify-center gap-x-7 font-ui text-base font-medium text-muted">
          {socials.filter(social => social.href).map(social => <a key={social.name} href={social.href} target="_blank" rel="noreferrer noopener" className={`${link} capitalize`}>{social.name === 'github' ? 'GitHub' : social.name} ↗</a>)}
        </nav>
      </div>
      <div className="pointer-events-none relative -mx-[8%] my-2 min-h-[240px] flex-1 md:min-h-[290px]" data-footer-logo aria-hidden="true">{journey ? <div className="absolute inset-0 hidden items-center justify-center motion-reduce:flex"><Logo className="h-[34%] !w-[90%] opacity-[.12]" /></div> : <div className="absolute inset-0 opacity-[.16]"><FooterLogo /></div>}</div>
      <nav aria-label={t('footer.documents_label')} className="relative z-10 flex flex-wrap justify-center gap-x-6 font-ui text-sm font-medium leading-relaxed text-muted">
        <Link href="/privacy" className={link}>{t('footer.privacy_label')}</Link>
        <Link href="/consent" className={link}>{t('footer.consent_label')}</Link>
      </nav>
    </div>
  </footer>
}
