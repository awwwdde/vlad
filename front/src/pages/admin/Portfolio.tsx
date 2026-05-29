import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { api, ApiError } from '@/admin/api'
import type { PortfolioItem, PortfolioItemPayload, I18nBundle } from '@/admin/types'
import { invalidatePortfolio } from '@/hooks/usePortfolio'

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
      <header className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Портфолио</h1>
          <p className="text-sm text-neutral-500 mt-1">
            Карточки на главной (S5Work), в /work и /work/:slug. Двуязычные.
          </p>
        </div>
        <button
          onClick={() => setEditing({ item: null })}
          className="rounded-lg bg-neutral-100 px-4 py-2 text-sm font-medium text-neutral-950 hover:bg-white"
        >
          + Новый
        </button>
      </header>

      {error && (
        <div className="rounded-lg border border-red-900/50 bg-red-950/40 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="grid gap-3">
        {items === null && <div className="text-sm text-neutral-500">Загрузка…</div>}
        {items?.length === 0 && (
          <div className="rounded-xl border border-dashed border-neutral-800 p-10 text-center text-neutral-500">
            Ещё ни одной карточки.
          </div>
        )}
        {items?.map((it, idx) => (
          <motion.div
            layout
            key={it.id}
            className="rounded-xl border border-neutral-900 bg-neutral-950 p-4 flex items-center gap-4"
          >
            <div
              className="w-1 self-stretch rounded-full"
              style={{ backgroundColor: it.accent ?? '#444' }}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-3">
                <h3 className="font-semibold truncate">{it.ru.title || it.slug}</h3>
                <span className="text-xs text-neutral-600 font-mono">/{it.slug}</span>
              </div>
              <p className="text-xs text-neutral-500 truncate mt-0.5">
                {it.ru.tagline || it.en.tagline || '—'}
              </p>
            </div>
            <div className="flex items-center gap-1 text-neutral-500">
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
              className="rounded-md bg-neutral-900 px-3 py-1.5 text-xs hover:bg-neutral-800"
            >
              Править
            </button>
            <button
              onClick={() => remove(it.slug)}
              className="rounded-md border border-red-900/50 px-3 py-1.5 text-xs text-red-300 hover:bg-red-950/40"
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
      className="w-7 h-7 rounded text-sm hover:bg-neutral-900 disabled:opacity-30 disabled:cursor-not-allowed"
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
  const [error, setError] = useState<string | null>(null)

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
    <Modal onClose={props.onClose} title={isNew ? 'Новая карточка' : `Править · ${item!.slug}`}>
      <form onSubmit={submit} className="space-y-5">
        {/* Общие поля */}
        <div className="grid grid-cols-2 gap-3">
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
            className="col-span-2"
          />
          <TextField
            label="image_url"
            value={form.image_url ?? ''}
            onChange={v => patch({ image_url: v })}
            placeholder="/images/foo.jpg"
            className="col-span-2"
          />
        </div>

        {/* Двуязычные бандлы */}
        <div className="grid grid-cols-2 gap-4">
          <BundleEditor
            lang="ru"
            bundle={form.ru}
            onChange={p => patchBundle('ru', p)}
          />
          <BundleEditor
            lang="en"
            bundle={form.en}
            onChange={p => patchBundle('en', p)}
          />
        </div>

        {error && (
          <div className="rounded-lg border border-red-900/50 bg-red-950/40 px-3 py-2 text-sm text-red-300">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={props.onClose}
            className="rounded-md px-3 py-1.5 text-sm text-neutral-400 hover:text-neutral-100"
          >
            Отмена
          </button>
          <button
            type="submit"
            disabled={busy}
            className="rounded-md bg-neutral-100 px-4 py-1.5 text-sm font-medium text-neutral-950 hover:bg-white disabled:opacity-50"
          >
            {busy ? 'Сохраняем…' : 'Сохранить'}
          </button>
        </div>
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
    <div className="rounded-xl border border-neutral-900 bg-neutral-950 p-4 space-y-3">
      <div className="text-xs uppercase tracking-wider text-neutral-500">{lang}</div>
      <TextField label="title" value={bundle.title} onChange={v => onChange({ title: v })} />
      <TextField label="tagline" value={bundle.tagline} onChange={v => onChange({ tagline: v })} />
      <label className="block space-y-1.5">
        <span className="text-xs uppercase tracking-wider text-neutral-500">desc</span>
        <textarea
          value={bundle.desc}
          onChange={e => onChange({ desc: e.target.value })}
          rows={4}
          className="w-full rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm resize-none"
        />
      </label>
      <TextField
        label="tags (через запятую)"
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
      <span className="text-xs uppercase tracking-wider text-neutral-500">
        {props.label}
      </span>
      <input
        value={props.value}
        required={props.required}
        placeholder={props.placeholder}
        onChange={e => props.onChange(e.target.value)}
        className="w-full rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm"
      />
      {props.hint && <span className="block text-xs text-neutral-600">{props.hint}</span>}
    </label>
  )
}

function Modal(props: { onClose: () => void; title: string; children: React.ReactNode }) {
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
        className="rounded-2xl border border-neutral-800 bg-neutral-950 p-6 w-full max-w-3xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{props.title}</h2>
          <button
            onClick={props.onClose}
            className="text-neutral-500 hover:text-neutral-100 text-xl leading-none"
          >
            ×
          </button>
        </div>
        {props.children}
      </motion.div>
    </motion.div>
  )
}
