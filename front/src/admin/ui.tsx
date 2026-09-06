'use client'

import { cn } from '@/lib/cn'

/**
 * Примитивы админки.
 *
 * Панель говорит теми же токенами, что и сайт: `--bg`, `--fg`, `--muted`,
 * `--line`, `--accent`. Раньше у неё была своя палитра из neutral-950 и жёстко
 * тёмный фон; из-за этого любая правка цвета делалась дважды, а светлая
 * системная тема панель не касалась вовсе. Теперь тема одна на всё.
 *
 * Форма тоже общая: волосяные линии вместо рамок-коробок, кнопки-пилюли,
 * Manrope на служебных подписях.
 */

// ── Кнопка ───────────────────────────────────────────────────────────────────

type ButtonVariant = 'primary' | 'ghost' | 'danger'

const BUTTON_BASE =
  'inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-full ' +
  'px-4 py-2 font-ui text-[13px] font-medium leading-none transition-colors duration-200 ' +
  'disabled:pointer-events-none disabled:opacity-45 active:translate-y-px'

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-accent text-accent-fg hover:opacity-90',
  ghost: 'border border-line text-fg hover:border-fg',
  // Опасное действие красное, но не кричит: заливка только на наведении.
  danger: 'border border-danger/40 text-danger hover:bg-danger/10',
}

export function AdminButton({
  variant = 'ghost',
  busy,
  className,
  children,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
  busy?: boolean
}) {
  return (
    <button
      className={cn(BUTTON_BASE, BUTTON_VARIANTS[variant], className)}
      disabled={rest.disabled || busy}
      {...rest}
    >
      {busy ? '…' : children}
    </button>
  )
}

// ── Плитка показателя ────────────────────────────────────────────────────────

export function Stat({
  label,
  value,
  hint,
  tone = 'neutral',
}: {
  label: string
  value: React.ReactNode
  hint?: string
  tone?: 'neutral' | 'good' | 'warning' | 'critical'
}) {
  const toneClass =
    tone === 'good'
      ? 'text-good'
      : tone === 'warning'
        ? 'text-warning'
        : tone === 'critical'
          ? 'text-danger'
          : 'text-fg'

  return (
    <div className="border-t border-line pt-4">
      <div className="font-ui text-[12px] font-medium tracking-tight text-muted">{label}</div>
      <div className={cn('mt-1.5 text-[26px] font-semibold tracking-tight tabular-nums', toneClass)}>
        {value}
      </div>
      {hint && <div className="mt-0.5 font-ui text-[12px] text-muted">{hint}</div>}
    </div>
  )
}

// ── Статус ───────────────────────────────────────────────────────────────────

/**
 * Статус всегда идёт точкой и подписью. Одной точкой обойтись нельзя:
 * состояние - это семантика, и на цвет её вешать нечестно по отношению
 * к тем, кто цвет не различает.
 */
export function StatusBadge({
  label,
  tone,
  className,
}: {
  label: string
  tone: 'neutral' | 'good' | 'warning' | 'critical'
  className?: string
}) {
  const dot =
    tone === 'good'
      ? 'bg-good'
      : tone === 'warning'
        ? 'bg-warning'
        : tone === 'critical'
          ? 'bg-danger'
          : 'bg-muted'

  return (
    <span className={cn('inline-flex items-center gap-2 font-ui text-[13px] text-muted', className)}>
      <span aria-hidden className={cn('h-1.5 w-1.5 rounded-full', dot)} />
      {label}
    </span>
  )
}

// ── Поле формы ───────────────────────────────────────────────────────────────

export const INPUT_CLASS =
  'w-full border border-line bg-bg px-3 py-2.5 font-ui text-[14px] text-fg ' +
  'placeholder:text-muted/70 transition-colors duration-200 ' +
  'hover:border-muted/60 focus:border-fg focus:outline-none'

export function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="font-ui text-[13px] font-medium text-fg">{label}</span>
      {children}
      {hint && <span className="font-ui text-[12px] text-muted">{hint}</span>}
    </label>
  )
}

// ── Сообщение об ошибке ──────────────────────────────────────────────────────

export function ErrorNote({ children }: { children: React.ReactNode }) {
  return (
    <p role="alert" className="border border-danger/40 px-4 py-3 font-ui text-[13px] text-danger">
      {children}
    </p>
  )
}

// ── Заголовок раздела ────────────────────────────────────────────────────────

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string
  subtitle?: string
  action?: React.ReactNode
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-6">
      <div>
        <h1 className="text-[28px] font-semibold tracking-[-0.03em]">{title}</h1>
        {subtitle && <p className="mt-1.5 max-w-prose text-[14px] text-muted">{subtitle}</p>}
      </div>
      {action}
    </header>
  )
}
