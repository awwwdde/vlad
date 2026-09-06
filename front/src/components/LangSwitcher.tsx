'use client'

import { useTranslation } from 'react-i18next'
import { LANGS, setLang, type Lang } from '@/i18n'
import { cn } from '@/lib/cn'

export function LangSwitcher({
  className,
  onDark = false,
}: {
  className?: string
  /** Поверх иллюстрации героя: там нужен белый, токены темы неприменимы. */
  onDark?: boolean
}) {
  const { i18n } = useTranslation()
  const current = (i18n.language?.startsWith('en') ? 'en' : 'ru') as Lang

  return (
    <div className={cn('flex items-center gap-1 font-ui text-[13px] font-medium', className)}>
      {LANGS.map(lang => (
        <button
          key={lang}
          type="button"
          onClick={() => setLang(lang)}
          aria-pressed={lang === current}
          // Цвет задаётся классом в обоих состояниях, а не инлайном: только так
          // между белым и тёмным работает transition-colors.
          className={cn(
            'rounded-full px-2 py-1 uppercase transition-colors duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]',
            onDark
              ? lang === current
                ? 'text-white'
                : 'text-white/60 hover:text-white'
              : lang === current
                ? 'text-fg'
                : 'text-muted hover:text-fg',
          )}
        >
          {lang}
        </button>
      ))}
    </div>
  )
}
