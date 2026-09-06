'use client'

import { useTranslation } from 'react-i18next'
import { ButtonLink } from '@/components/Button'
import { LangSwitcher } from '@/components/LangSwitcher'
import { Logo } from '@/components/Logo'

/** Заглушка публичного сайта. Включается флагом coming_soon в админке.
 *  Обход: `?preview` в адресе или вход в /admin (см. SiteShell). */
export default function ComingSoon() {
  const { t } = useTranslation()

  return (
    <div className="flex min-h-[100dvh] flex-col">
      <header className="mx-auto flex h-16 w-full max-w-[1920px] items-center justify-between px-5 md:px-[100px]">
        <Logo className="h-5 text-fg" />
        <LangSwitcher />
      </header>

      <main className="mx-auto flex w-full max-w-[1920px] flex-1 flex-col justify-center px-5 py-16 md:px-[100px]">
        <p className="font-mono text-[12px] uppercase tracking-[0.18em] text-muted">
          {t('coming.label')}
        </p>
        <h1 className="mt-6 text-[clamp(56px,14vw,180px)] font-semibold leading-[0.9] tracking-[-0.04em]">
          {t('coming.title')}
        </h1>
        <p className="mt-8 max-w-prose text-[17px] leading-relaxed text-muted">
          {t('coming.body')}
        </p>
        <div className="mt-10">
          <ButtonLink href={`mailto:${t('common.email')}`} external>
            {t('common.email')}
          </ButtonLink>
        </div>
      </main>

      <footer className="mx-auto w-full max-w-[1920px] px-5 pb-8 font-mono text-[12px] text-muted md:px-[100px]">
        &copy; {new Date().getFullYear()} awwwdde
      </footer>
    </div>
  )
}
