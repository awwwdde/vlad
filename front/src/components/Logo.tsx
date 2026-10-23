import { cn } from '@/lib/cn'
import { BRAND_MARK_PATH } from '@/lib/brandMark'

/** The owner's standalone sign, using the same vector path as the favicon. */
export function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 352 93" className={cn('aspect-[352/93] w-auto shrink-0', className)} role="img" aria-label="awwwdde">
      <path fill="currentColor" fillRule="evenodd" d={BRAND_MARK_PATH} />
    </svg>
  )
}
