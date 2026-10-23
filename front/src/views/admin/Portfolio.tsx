'use client'

import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { api, ApiError } from '@/admin/api'
import type { PortfolioItem, PortfolioItemPayload, I18nBundle } from '@/admin/types'
import { invalidatePortfolio } from '@/hooks/usePortfolio'
import { GalleryEditor } from './GalleryEditor'
import { CaseBundleFields } from './CaseBundleFields'
import { useUnsavedChanges } from '@/admin/useUnsavedChanges'
import { AdminButton, PageHeader } from '@/admin/ui'

const EMPTY_BUNDLE: I18nBundle = { title: '', tagline: '', desc: '', tags: [] }

const EMPTY_ITEM: PortfolioItemPayload = {
  slug: '',
  link: null,
  image_url: null,
  accent: '#C4B5FD',
  ru: { ...EMPTY_BUNDLE },
  en: { ...EMPTY_BUNDLE },
}

export default function Portfolio() {
  const [items, setItems] = useState<PortfolioItem[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<{ item: PortfolioItem | null } | null>(null)

  const reload = useCallback(() => {
    api<PortfolioItem[]>('/api/content/portfolio')
      .then(setItems)
      .catch(e => setError(e.message ?? String(e)))
  }, [])

  useEffect(() => {
    reload()
  }, [reload])

  // Reorder: optimistic — двигаем локально, шлём весь массив slug'ов на бек.
  async function move(slug: string, dir: -1 | 1) {
    if (!items) return
    const idx = items.findIndex(i => i.slug === slug)
    const target = idx + dir
    if (target < 0 || target >= items.length) return
    const next = [...items]
    ;[next[idx], next[target]] = [next[target], next[idx]]
    setItems(next)
    try {
      await api('/api/content/portfolio/reorder', {
        method: 'POST',
        body: { slugs: next.map(i => i.slug) },
      })
      invalidatePortfolio()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : String(e))
      reload() // откат к серверной правде
    }
  }

  async function remove(slug: string) {
    if (!window.confirm(`Удалить «${slug}» из портфолио?`)) return
    try {
      await api(`/api/content/portfolio/${slug}`, { method: 'DELETE' })
      setItems(items?.filter(i => i.slug !== slug) ?? null)
      invalidatePortfolio()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : String(e))
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader title="Портфолио и кейсы" subtitle="Обложки, описание, задачи, решения, этапы и результаты. Отдельный контент для RU и EN." action={<AdminButton variant="primary" onClick={() => setEditing({ item: null })}>Новый проект</AdminButton>} />

      {error && (
        <div className="rounded-lg border border-danger/40 bg-transparent px-4 py-3 text-sm text-danger">
          {error}
        </div>
      )}

      <div className="grid gap-3">
        {items === null && <div className="text-sm text-muted">Загрузка…</div>}
        {items?.length === 0 && (
          <div className="rounded-xl border border-dashed border-line p-10 text-center text-muted">
            Ещё ни одной карточки.
          </div>
        )}
        {items?.map((it, idx) => (
          <motion.div
            layout
            key={it.id}
            className="flex flex-wrap items-center gap-3 border-t border-line py-5 sm:gap-4"
          >
            <div
              className="w-1 self-stretch rounded-full"
              style={{ backgroundColor: it.accent ?? '#444' }}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-3">
                <h3 className="font-semibold truncate">{it.ru.title || it.slug}</h3>
                <span className="text-xs text-muted font-mono">/{it.slug}</span>
              </div>
              <p className="text-xs text-muted truncate mt-0.5">
                {it.ru.tagline || it.en.tagline || '—'}
              </p>
            </div>
            <div className="flex items-center gap-1 text-muted">
              <IconBtn title="вверх" disabled={idx === 0} onClick={() => move(it.slug, -1)}>↑</IconBtn>
              <IconBtn
                title="вниз"
                disabled={idx === (items?.length ?? 0) - 1}
                onClick={() => move(it.slug, 1)}
              >
                ↓
              </IconBtn>
            </div>
            <button
              onClick={() => setEditing({ item: it })}
              className="rounded-md bg-surface px-3 py-1.5 text-xs hover:bg-surface"
            >
              Править
            </button>
            <button
              onClick={() => remove(it.slug)}
              className="rounded-md border border-danger/40 px-3 py-1.5 text-xs text-danger hover:bg-transparent"
            >
              Удалить
            </button>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {editing && (
          <Editor
            item={editing.item}
            onClose={() => setEditing(null)}
            onSaved={() => {
              setEditing(null)
              reload()
            }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

function IconBtn(props: {
  children: React.ReactNode
  onClick: () => void
  title: string
  disabled?: boolean
}) {
  return (
    <button
      title={props.title}
      onClick={props.onClick}
      disabled={props.disabled}
      className="w-7 h-7 rounded text-sm hover:bg-surface disabled:opacity-30 disabled:cursor-not-allowed"
    >
      {props.children}
    </button>
  )
}

// ── Редактор ────────────────────────────────────────────────────────────────

function Editor(props: {
  item: PortfolioItem | null
  onClose: () => void
  onSaved: () => void
}) {
  const { item } = props
  const isNew = item === null
  const [form, setForm] = useState<PortfolioItemPayload>(() =>
    item
      ? {
          slug: item.slug,
          link: item.link,
          image_url: item.image_url,
          accent: item.accent,
          ru: { ...item.ru },
          en: { ...item.en },
        }
      : { ...EMPTY_ITEM },
  )
  const [busy, setBusy] = useState(false)
  const [lang, setLang] = useState<'ru' | 'en'>('ru')
  const [original] = useState(() => JSON.stringify(form))
  const dirty = JSON.stringify(form) !== original
  useUnsavedChanges(dirty)
  const close = () => { if (!busy && (!dirty || window.confirm('Есть несохранённые изменения кейса. Закрыть без сохранения?'))) props.onClose() }
  const [error, setError] = useState<string | null>(null)
  // Галерея живёт своим состоянием: её эндпоинты отвечают обновлённой
  // карточкой, и ждать общего сохранения формы незачем.
  const [gallery, setGallery] = useState<string[]>(item?.images ?? [])

  function patch(p: Partial<PortfolioItemPayload>) {
    setForm(f => ({ ...f, ...p }))
  }
  function patchBundle(lang: 'ru' | 'en', p: Partial<I18nBundle>) {
    setForm(f => ({ ...f, [lang]: { ...f[lang], ...p } }))
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      // Очищаем пустые строки в nullable полях, чтобы в БД лежал null.
      const payload = {
        ...form,
        link: form.link?.trim() || null,
        image_url: form.image_url?.trim() || null,
        accent: form.accent?.trim() || null,
      }
      if (isNew) {
        await api('/api/content/portfolio', { method: 'POST', body: payload })
      } else {
        await api(`/api/content/portfolio/${item!.slug}`, {
          method: 'PUT',
          body: payload,
        })
      }
      invalidatePortfolio()
      props.onSaved()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal onClose={close} busy={busy} title={isNew ? 'Новый проект' : `Кейс · ${item!.slug}`}>
      <form id="case-editor-form" onSubmit={submit} className="space-y-5">
        <fieldset disabled={busy} className="min-w-0 space-y-6">
        {/* Общие поля */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <TextField
            label="slug"
            value={form.slug}
            onChange={v => patch({ slug: v })}
            required
            hint="часть URL: /work/<slug>"
          />
          <TextField
            label="accent (hex)"
            value={form.accent ?? ''}
            onChange={v => patch({ accent: v })}
            placeholder="#C4B5FD"
          />
          <TextField
            label="link"
            value={form.link ?? ''}
            onChange={v => patch({ link: v })}
            placeholder="https://…"
            className="sm:col-span-2"
          />
        </div>

        {/* Галерея доступна только у сохранённой карточки: файлы кладутся
            по слагу, а у новой его ещё нет в базе. */}
        {item ? (
          <GalleryEditor
            slug={item.slug}
            images={gallery}
            onChange={updated => {
              setGallery(updated.images)
              invalidatePortfolio()
            }}
          />
        ) : (
          <p className="font-ui text-[12px] text-muted">
            Картинки можно будет загрузить сразу после создания карточки.
          </p>
        )}

        {/* Двуязычные бандлы */}
        <div className="flex gap-2" role="group" aria-label="Язык кейса">{(['ru', 'en'] as const).map(value => <AdminButton key={value} type="button" aria-pressed={lang === value} variant={lang === value ? 'primary' : 'ghost'} onClick={() => setLang(value)}>{value.toUpperCase()}</AdminButton>)}</div>
        <div>
          <BundleEditor key={lang} lang={lang} bundle={form[lang]} onChange={p => patchBundle(lang, p)} />
        </div>

        {error && (
          <div className="rounded-lg border border-danger/40 bg-transparent px-3 py-2 text-sm text-danger">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={close}
            className="rounded-md px-3 py-1.5 text-sm text-muted hover:text-fg"
          >
            Отмена
          </button>
          <button
            type="submit"
            disabled={busy}
            className="rounded-md bg-accent px-4 py-1.5 text-sm font-medium text-accent-fg hover:opacity-90 disabled:opacity-50"
          >
            {busy ? 'Сохраняем…' : 'Сохранить'}
          </button>
        </div>
        </fieldset>
      </form>
    </Modal>
  )
}

function BundleEditor(props: {
  lang: 'ru' | 'en'
  bundle: I18nBundle
  onChange: (p: Partial<I18nBundle>) => void
}) {
  const { bundle, lang, onChange } = props
  return (
    <div className="rounded-xl border border-line bg-bg p-4 space-y-3">
      <div className="text-xs uppercase tracking-wider text-muted">{lang}</div>
      <TextField label="Название" value={bundle.title} onChange={v => onChange({ title: v })} />
      <TextField label="Короткое описание / слоган" value={bundle.tagline} onChange={v => onChange({ tagline: v })} />
      <label className="block space-y-1.5">
        <span className="text-xs uppercase tracking-wider text-muted">О проекте</span>
        <textarea
          value={bundle.desc}
          onChange={e => onChange({ desc: e.target.value })}
          rows={4}
          className="w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm resize-none"
        />
      </label>
      <TextField
        label="Услуги и технологии (через запятую)"
        value={bundle.tags.join(', ')}
        onChange={v =>
          onChange({
            tags: v
              .split(',')
              .map(t => t.trim())
              .filter(Boolean),
          })
        }
      />
      <CaseBundleFields bundle={bundle} onChange={onChange} />
    </div>
  )
}

// ── shared visual helpers (мини-копия из Projects.tsx — оставляем здесь, чтобы
//   не плодить общий ui-пакет ради двух элементов) ───────────────────────────

function TextField(props: {
  label: string
  value: string
  onChange: (v: string) => void
  required?: boolean
  placeholder?: string
  hint?: string
  className?: string
}) {
  return (
    <label className={`block space-y-1.5 ${props.className ?? ''}`}>
      <span className="text-xs uppercase tracking-wider text-muted">
        {props.label}
      </span>
      <input
        value={props.value}
        required={props.required}
        placeholder={props.placeholder}
        onChange={e => props.onChange(e.target.value)}
        className="w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm"
      />
      {props.hint && <span className="block text-xs text-muted">{props.hint}</span>}
    </label>
  )
}

function Modal(props: { onClose: () => void; title: string; busy: boolean; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null, overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    ref.current?.querySelector<HTMLButtonElement>('[data-close]')?.focus()
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); ref.current?.querySelector<HTMLButtonElement>('[data-close]')?.click() }
      if (event.key !== 'Tab') return
      const focusable = Array.from(ref.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), textarea:not(:disabled), a[href]') ?? []).filter(e => e.getClientRects().length > 0)
      const first = focusable[0], last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
    }
    document.addEventListener('keydown', key)
    return () => { document.body.style.overflow = overflow; document.removeEventListener('keydown', key); previous?.focus() }
  }, [])
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-8 overflow-auto"
      onClick={props.onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 10, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 10, scale: 0.98 }}
        transition={{ duration: 0.2 }}
        onClick={e => e.stopPropagation()}
        ref={ref}
        role="dialog" aria-modal="true" aria-labelledby="case-editor-title"
        className="my-auto max-h-[calc(100dvh-4rem)] w-full max-w-4xl overflow-y-auto rounded-2xl border border-line bg-bg p-5 md:p-8"
      >
        <div className="sticky -top-5 z-20 mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-line bg-bg py-4 md:-top-8">
          <h2 id="case-editor-title" className="text-lg font-semibold">{props.title}</h2>
          <AdminButton type="submit" form="case-editor-form" variant="primary" busy={props.busy}>Сохранить кейс</AdminButton>
          <button
            onClick={props.onClose}
            data-close aria-label="Закрыть редактор"
            className="text-muted hover:text-fg text-xl leading-none"
          >
            ×
          </button>
        </div>
        {props.children}
      </motion.div>
    </motion.div>
  )
}
