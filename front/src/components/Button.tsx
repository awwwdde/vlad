import Link from 'next/link'
import { cn } from '@/lib/cn'

type Variant = 'primary' | 'ghost'

// Радиусы на сайте: всё прямоугольное, кнопки — пилюли. Одно правило, без
// исключений, поэтому кнопка читается как единственный кликабельный объект.
const BASE =
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full px-6 py-3 ' +
  'font-medium text-[15px] leading-none transition-[background-color,color,border-color,transform] ' +
  'duration-200 active:translate-y-px disabled:pointer-events-none disabled:opacity-55'

const VARIANTS: Record<Variant, string> = {
  // accent-fg подобран под accent в обеих темах: 5.1:1 в светлой, выше в тёмной.
  primary: 'bg-accent text-accent-fg hover:opacity-90',
  ghost: 'border border-line text-fg hover:border-fg',
}

interface CommonProps {
  variant?: Variant
  className?: string
  children: React.ReactNode
}

export function ButtonLink({
  href,
  external,
  variant = 'primary',
  className,
  children,
}: CommonProps & { href: string; external?: boolean }) {
  const cls = cn(BASE, VARIANTS[variant], className)

  if (external) {
    return (
      <a href={href} target="_blank" rel="noreferrer noopener" className={cls}>
        {children}
      </a>
    )
  }
  return (
    <Link href={href} className={cls}>
      {children}
    </Link>
  )
}

export function Button({
  variant = 'primary',
  className,
  children,
  ...rest
}: CommonProps & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className={cn(BASE, VARIANTS[variant], className)} {...rest}>
      {children}
    </button>
  )
}
