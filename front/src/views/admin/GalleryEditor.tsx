'use client'

import { useRef, useState } from 'react'
import Image from 'next/image'
import { ApiError, tokenStore } from '@/admin/api'
import type { PortfolioItem } from '@/admin/types'
import { ErrorNote } from '@/admin/ui'
import { cn } from '@/lib/cn'

/**
 * Галерея карточки: загрузка, порядок, удаление.
 *
 * Отдельно от формы с текстами и сохраняется сразу, без общей кнопки. Так
 * задумано: форма отправляет свои поля целиком и про картинки ничего не знает,
 * а держать их в том же сабмите означало бы гонять файлы заново при каждой
 * правке подписи.
 *
 * Первая картинка - обложка: её и только её видно на главной и в списке работ.
 * Об этом сказано прямо на первой плитке, иначе порядок выглядит декоративным.
 */
const MAX = 5

export function GalleryEditor({
  slug,
  images,
  onChange,
}: {
  slug: string
  images: string[]
  onChange: (item: PortfolioItem) => void
}) {
  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const free = MAX - images.length

  /** Загрузка идёт голым fetch, а не через api(): тот всегда ставит
   *  Content-Type: application/json, а multipart требует, чтобы границу
   *  проставил сам браузер. */
  async function upload(files: FileList) {
    if (!files.length) return
    setBusy(true)
    setError(null)
    try {
      const body = new FormData()
      for (const f of Array.from(files).slice(0, free)) body.append('files', f)

      const token = tokenStore.get()
      const res = await fetch(`/api/content/portfolio/${slug}/images`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body,
      })
      const payload = await res.json().catch(() => null)
      if (!res.ok) throw new ApiError(res.status, payload?.detail ?? 'Не удалось загрузить')
      onChange(payload as PortfolioItem)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : String(e))
    } finally {
      setBusy(false)
      if (input.current) input.current.value = ''
    }
  }

  async function call(path: string, method: string, body?: unknown) {
    setBusy(true)
    setError(null)
    try {
      const token = tokenStore.get()
      const res = await fetch(path, {
        method,
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(body ? { 'Content-Type': 'application/json' } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
      })
      const payload = await res.json().catch(() => null)
      if (!res.ok) throw new ApiError(res.status, payload?.detail ?? 'Ошибка')
      onChange(payload as PortfolioItem)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  const swap = (i: number, j: number) => {
    const order = images.map((_, k) => k)
    ;[order[i], order[j]] = [order[j], order[i]]
    return call(`/api/content/portfolio/${slug}/images`, 'PUT', { order })
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <span className="font-ui text-[13px] font-medium text-fg">
          Галерея{' '}
          <span className="font-normal text-muted">
            {images.length} из {MAX}
          </span>
        </span>
        <span className="font-ui text-[12px] text-muted">
          Первая — обложка на главной. Сохраняется сразу.
        </span>
      </div>

      {error && <ErrorNote>{error}</ErrorNote>}

      <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
        {images.map((src, i) => (
          <div key={src} className="flex flex-col gap-1.5">
            <div className="relative aspect-[4/3] overflow-hidden border border-line bg-surface">
              <Image src={src} alt="" fill sizes="160px" className="object-cover" />
              {i === 0 && (
                <span className="absolute left-1 top-1 rounded-full bg-fg px-2 py-0.5 font-ui text-[10px] text-bg">
                  обложка
                </span>
              )}
            </div>
            <div className="flex items-center justify-between">
              <div className="flex gap-1">
                <Tiny label="левее" disabled={busy || i === 0} onClick={() => swap(i, i - 1)}>
                  ←
                </Tiny>
                <Tiny
                  label="правее"
                  disabled={busy || i === images.length - 1}
                  onClick={() => swap(i, i + 1)}
                >
                  →
                </Tiny>
              </div>
              <Tiny
                label="удалить"
                danger
                disabled={busy}
                onClick={() => call(`/api/content/portfolio/${slug}/images/${i}`, 'DELETE')}
              >
                ×
              </Tiny>
            </div>
          </div>
        ))}

        {free > 0 && (
          <button
            type="button"
            disabled={busy}
            onClick={() => input.current?.click()}
            className="flex aspect-[4/3] flex-col items-center justify-center gap-1 border border-dashed border-line font-ui text-[12px] text-muted transition-colors duration-200 hover:border-fg hover:text-fg disabled:opacity-50"
          >
            <span className="text-[20px] leading-none">+</span>
            {busy ? 'загружаю…' : `добавить (${free})`}
          </button>
        )}
      </div>

      <input
        ref={input}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={e => e.target.files && upload(e.target.files)}
      />

      {images.length === 0 && (
        <p className="font-ui text-[12px] text-muted">
          Без картинок карточка покажет заглушку. JPEG, PNG, WEBP или GIF до 12 МБ;
          большие уменьшаются до 1920px и чистятся от EXIF.
        </p>
      )}
    </div>
  )
}

function Tiny({
  children, onClick, disabled, danger, label,
}: {
  children: React.ReactNode
  onClick: () => void
  disabled?: boolean
  danger?: boolean
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={cn(
        'flex h-6 w-6 items-center justify-center rounded-full border border-line text-[12px] transition-colors duration-200 disabled:opacity-30',
        danger ? 'text-danger hover:border-danger/50' : 'text-muted hover:text-fg',
      )}
    >
      {children}
    </button>
  )
}
