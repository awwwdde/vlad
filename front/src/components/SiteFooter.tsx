'use client'

import Link from 'next/link'
import { useTranslation } from 'react-i18next'
import { Logo } from '@/components/Logo'

const SOCIAL = [
  { label: 'Telegram', href: 'https://t.me/awwwdde' },
  { label: 'GitHub', href: 'https://github.com/awwwdde' },
  { label: 'Instagram', href: 'https://instagram.com/awwwdde' },
]

export function SiteFooter() {
  const { t } = useTranslation()

  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex w-full max-w-[1920px] flex-col gap-6 px-5 py-10 md:flex-row md:items-center md:justify-between md:px-[100px]">
        <div className="flex flex-col gap-2">
          <Link href="/" className="text-fg" aria-label="awwwdde">
            <Logo className="h-6" />
          </Link>
          <span className="text-[13px] text-muted">{t('footer.made')}</span>
        </div>

        <nav className="flex flex-wrap gap-x-6 gap-y-2">
          {SOCIAL.map(item => (
            <a
              key={item.label}
              href={item.href}
              target="_blank"
              rel="noreferrer noopener"
              className="text-[14px] text-muted transition-colors duration-200 hover:text-fg"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <span className="font-mono text-[12px] text-muted">
          &copy; {new Date().getFullYear()}
        </span>
      </div>
    </footer>
  )
}
