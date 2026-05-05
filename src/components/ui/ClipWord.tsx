import type { ReactNode } from 'react'
import { clsx } from 'clsx'

interface Props {
  children: ReactNode
  className?: string
  dark?: boolean
}

export function ClipWord({ children, className, dark = false }: Props) {
  return (
    <span className={clsx(
      'inline-block px-[0.18em] -mx-[0.08em] rounded-sm',
      'bg-lav',
      dark ? 'text-ink' : 'text-ink',
      className,
    )}>
      {children}
    </span>
  )
}
