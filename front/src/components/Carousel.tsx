'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { CaretLeft, CaretRight } from '@phosphor-icons/react'
import { cn } from '@/lib/cn'

/**
 * Карусель картинок проекта.
 *
 * При одной картинке превращается в обычный снимок: ни стрелок, ни точек,
 * ни счётчика. Управление, которое ничего не переключает, - это шум, который
 * читатель проверяет глазами каждый раз заново.
 *
 * Листание идёт прокруткой контейнера со scroll-snap, а не перестановкой
 * transform: так работает свайп на телефоне, инерция ведёт себя как везде,
 * и клавиатура со скринридером получают обычный прокручиваемый список.
 */
export function Carousel({ images, alt }: { images: string[]; alt: string }) {
  const track = useRef<HTMLDivElement>(null)
  const [index, setIndex] = useState(0)
  const single = images.length <= 1

  const goTo = useCallback((i: number) => {
    const el = track.current
    if (!el) return
    const clamped = Math.max(0, Math.min(images.length - 1, i))
    el.scrollTo({ left: clamped * el.clientWidth, behavior: 'smooth' })
  }, [images.length])

  // Индекс выводим из фактической прокрутки, а не храним отдельно: иначе
  // свайп пальцем и состояние точек разъезжаются.
  useEffect(() => {
    const el = track.current
    if (!el || single) return
    let frame = 0
    const onScroll = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() =>
        setIndex(Math.round(el.scrollLeft / Math.max(1, el.clientWidth))),
      )
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      el.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(frame)
    }
  }, [single])

  return (
    <figure className="flex flex-col gap-4">
      <div className="relative">
        <div
          ref={track}
          tabIndex={single ? -1 : 0}
          role={single ? undefined : 'group'}
          aria-label={single ? undefined : `${alt}: ${images.length} изображений`}
          onKeyDown={e => {
            if (e.key === 'ArrowRight') { e.preventDefault(); goTo(index + 1) }
            if (e.key === 'ArrowLeft') { e.preventDefault(); goTo(index - 1) }
          }}
          className={cn(
            'flex w-full snap-x snap-mandatory overflow-x-auto',
            // Полосу прокрутки прячем: листают стрелками, точками и свайпом.
            '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
          )}
        >
          {images.map((src, i) => (
            <div key={src} className="relative aspect-[16/10] w-full shrink-0 snap-start bg-surface">
              <Image
                src={src}
                alt={images.length > 1 ? `${alt}, кадр ${i + 1}` : alt}
                fill
                priority={i === 0}
                sizes="(max-width: 1024px) 100vw, 1200px"
                className="object-cover"
              />
            </div>
          ))}
        </div>

        {!single && (
          <>
            <Arrow side="left" disabled={index === 0} onClick={() => goTo(index - 1)} />
            <Arrow side="right" disabled={index === images.length - 1} onClick={() => goTo(index + 1)} />
          </>
        )}
      </div>

      {!single && (
        <figcaption className="flex items-center justify-between gap-4">
          <div className="flex gap-2">
            {images.map((src, i) => (
              <button
                key={src}
                type="button"
                onClick={() => goTo(i)}
                aria-label={`Кадр ${i + 1}`}
                aria-current={i === index}
                className={cn(
                  'h-1.5 rounded-full transition-all duration-300',
                  i === index ? 'w-7 bg-fg' : 'w-1.5 bg-muted/50 hover:bg-muted',
                )}
              />
            ))}
          </div>
          <span className="font-ui text-[13px] tabular-nums text-muted">
            {index + 1} / {images.length}
          </span>
        </figcaption>
      )}
    </figure>
  )
}

function Arrow({
  side, disabled, onClick,
}: { side: 'left' | 'right'; disabled: boolean; onClick: () => void }) {
  const Icon = side === 'left' ? CaretLeft : CaretRight
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={side === 'left' ? 'Предыдущий кадр' : 'Следующий кадр'}
      className={cn(
        'absolute top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full',
        'border border-black/10 bg-white/90 text-[#17210c] backdrop-blur-sm',
        'transition-opacity duration-200 disabled:opacity-0',
        side === 'left' ? 'left-4' : 'right-4',
      )}
    >
      <Icon size={18} weight="bold" />
    </button>
  )
}
