'use client'

import { useTranslation } from 'react-i18next'
import { LANGS, setLang, type Lang } from '@/i18n'
import { cn } from '@/lib/cn'

export function LangSwitcher({
  className,
  onDark = false,
  separator = false,
}: {
  className?: string
  /** Поверх иллюстрации героя: там нужен белый, токены темы неприменимы. */
  onDark?: boolean
  separator?: boolean
}) {
  const { i18n } = useTranslation()
  const current = (i18n.language?.startsWith('en') ? 'en' : 'ru') as Lang

  return (
    <div className={cn('flex items-center gap-1 font-ui text-base font-medium', className)}>
      {LANGS.map((lang, index) => (
        <span key={lang} className="inline-flex items-center gap-1">
          {separator && index > 0 && <span aria-hidden="true" className={onDark ? 'text-white/65' : 'text-muted'}>/</span>}
        <button
          type="button"
          onClick={() => setLang(lang)}
          aria-pressed={lang === current}
          // Цвет задаётся классом в обоих состояниях, а не инлайном: только так
          // между белым и тёмным работает transition-colors.
          className={cn(
            'rounded-full uppercase transition-colors duration-150',
            separator ? 'min-h-11 min-w-9 px-1 py-1' : 'px-2 py-1',
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
        </span>
      ))}
    </div>
  )
}
