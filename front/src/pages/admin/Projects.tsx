import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { api, ApiError } from '@/admin/api'
import type { ActionResult, Project } from '@/admin/types'
import { STATUS_META } from './projectStatus'

type Busy = Record<string, string | undefined>  // slug → текущее действие

export default function Projects() {
  const [projects, setProjects] = useState<Project[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<Busy>({})
  const [logsFor, setLogsFor] = useState<Project | null>(null)
  const [showNew, setShowNew] = useState(false)

  const reload = useCallback(() => {
    api<Project[]>('/api/projects')
      .then(setProjects)
      .catch(e => setError(e.message ?? String(e)))
  }, [])

  useEffect(() => {
    reload()
  }, [reload])

  // Универсальная обёртка над любым действием: помечаем slug как busy,
  // дёргаем API, мёрджим обновлённый проект в список.
  async function act(
    slug: string,
    action: string,
    run: () => Promise<ActionResult | void>,
  ) {
    setBusy(b => ({ ...b, [slug]: action }))
    setError(null)
    try {
      const r = await run()
      if (r && 'project' in r) {
        setProjects(ps =>
          (ps ?? []).map(p => (p.slug === slug ? r.project : p)),
        )
      } else {
        reload()
      }
    } catch (e) {
      setError(e instanceof ApiError ? e.message : String(e))
    } finally {
      setBusy(b => ({ ...b, [slug]: undefined }))
    }
  }

  return (
    <div className="space-y-8">
      <header className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Под-сайты</h1>
          <p className="text-sm text-neutral-500 mt-1">
            Каждый сайт — пара контейнеров (<code>app</code> + <code>postgres</code>) в общей docker-сети.
          </p>
        </div>
        <button
          onClick={() => setShowNew(true)}
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

      <div className="grid gap-4">
        {projects === null && (
          <div className="text-sm text-neutral-500">Загрузка…</div>
        )}
        {projects?.length === 0 && (
          <div className="rounded-xl border border-dashed border-neutral-800 p-10 text-center text-neutral-500">
            Пока ни одного проекта. Нажми «+ Новый», чтобы добавить.
          </div>
        )}
        {projects?.map(p => (
          <ProjectCard
            key={p.id}
            project={p}
            busy={busy[p.slug]}
            onDeploy={() =>
              act(p.slug, 'deploy', () =>
                api<ActionResult>(`/api/projects/${p.slug}/deploy`, {
                  method: 'POST',
                  body: {},
                }),
              )
            }
            onStop={() =>
              act(p.slug, 'stop', () =>
                api<ActionResult>(`/api/projects/${p.slug}/stop`, { method: 'POST' }),
              )
            }
            onStart={() =>
              act(p.slug, 'start', () =>
                api<ActionResult>(`/api/projects/${p.slug}/start`, { method: 'POST' }),
              )
            }
            onLogs={() => setLogsFor(p)}
            onDelete={(dropData) =>
              act(p.slug, 'delete', async () => {
                await api(`/api/projects/${p.slug}`, {
                  method: 'DELETE',
                  query: { drop_data: dropData },
                })
                setProjects(ps => (ps ?? []).filter(x => x.slug !== p.slug))
              })
            }
          />
        ))}
      </div>

      <AnimatePresence>
        {showNew && (
          <NewProjectModal
            onClose={() => setShowNew(false)}
            onCreated={() => {
              setShowNew(false)
              reload()
            }}
          />
        )}
        {logsFor && (
          <LogsModal project={logsFor} onClose={() => setLogsFor(null)} />
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Карточка проекта ────────────────────────────────────────────────────────

function ProjectCard(props: {
  project: Project
  busy: string | undefined
  onDeploy: () => void
  onStop: () => void
  onStart: () => void
  onLogs: () => void
  onDelete: (dropData: boolean) => void
}) {
  const { project: p, busy } = props
  const meta = STATUS_META[p.status]
  const inFlight = busy !== undefined

  return (
    <motion.div
      layout
      className="rounded-xl border border-neutral-900 bg-neutral-950 p-5"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold">{p.slug}</h3>
            <span className={`text-xs ${meta.text}`}>● {meta.label}</span>
          </div>
          <a
            href={`https://${p.domain}`}
            target="_blank"
            rel="noreferrer"
            className="text-sm text-neutral-400 hover:text-neutral-100"
          >
            {p.domain} ↗
          </a>
          {p.source && (
            <div className="mt-1 text-xs text-neutral-600 truncate">
              source: {p.source}
            </div>
          )}
          {p.last_error && (
            <div className="mt-2 rounded-md border border-red-900/40 bg-red-950/30 px-2 py-1 text-xs text-red-300 break-words">
              {p.last_error}
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Btn onClick={props.onDeploy} busy={busy === 'deploy'} disabled={inFlight}>
          Deploy
        </Btn>
        {p.status === 'running' ? (
          <Btn onClick={props.onStop} busy={busy === 'stop'} disabled={inFlight}>
            Stop
          </Btn>
        ) : (
          <Btn onClick={props.onStart} busy={busy === 'start'} disabled={inFlight}>
            Start
          </Btn>
        )}
        <Btn onClick={props.onLogs} disabled={inFlight} variant="ghost">
          Логи
        </Btn>
        <div className="flex-1" />
        <Btn
          onClick={() => {
            const drop = window.confirm(
              `Удалить ${p.slug}? Нажми OK — снести вместе с БД (volume), Cancel — оставить БД.`,
            )
            // confirm возвращает true=OK / false=Cancel; нам нужен второй prompt:
            // упрощённо — два варианта через double-confirm.
            const reallyDelete = window.confirm(
              drop
                ? `ПОДТВЕРДИ удаление ${p.slug} ВМЕСТЕ С ДАННЫМИ БД.`
                : `Удалить контейнеры ${p.slug}, БД сохранить?`,
            )
            if (reallyDelete) props.onDelete(drop)
          }}
          busy={busy === 'delete'}
          disabled={inFlight}
          variant="danger"
        >
          Удалить
        </Btn>
      </div>
    </motion.div>
  )
}

function Btn(props: {
  children: React.ReactNode
  onClick: () => void
  busy?: boolean
  disabled?: boolean
  variant?: 'default' | 'ghost' | 'danger'
}) {
  const { variant = 'default' } = props
  const base =
    'rounded-md px-3 py-1.5 text-xs font-medium transition disabled:opacity-40 disabled:cursor-not-allowed'
  const styles =
    variant === 'danger'
      ? 'border border-red-900/50 text-red-300 hover:bg-red-950/40'
      : variant === 'ghost'
      ? 'text-neutral-400 hover:text-neutral-100'
      : 'bg-neutral-100 text-neutral-950 hover:bg-white'
  return (
    <button
      onClick={props.onClick}
      disabled={props.disabled}
      className={`${base} ${styles}`}
    >
      {props.busy ? '…' : props.children}
    </button>
  )
}

// ── Модалка: новый проект ───────────────────────────────────────────────────

function NewProjectModal(props: { onClose: () => void; onCreated: () => void }) {
  const [slug, setSlug] = useState('')
  const [title, setTitle] = useState('')
  const [source, setSource] = useState('')
  const [deployNow, setDeployNow] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await api('/api/projects', {
        method: 'POST',
        body: {
          slug: slug.trim().toLowerCase(),
          title: title.trim() || null,
          source: source.trim() || null,
        },
      })
      if (deployNow) {
        await api(`/api/projects/${slug.trim().toLowerCase()}/deploy`, {
          method: 'POST',
          body: {},
        })
      }
      props.onCreated()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal onClose={props.onClose} title="Новый под-сайт">
      <form onSubmit={submit} className="space-y-4">
        <Field label="slug (поддомен)" hint="латиница, цифры, дефис">
          <input
            required
            value={slug}
            onChange={e => setSlug(e.target.value)}
            placeholder="npure"
            className="w-full rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm"
          />
        </Field>
        <Field label="title (опционально)">
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="w-full rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm"
          />
        </Field>
        <Field
          label="source"
          hint="git-URL (https/ssh) либо путь к папке в workspaces панели"
        >
          <input
            value={source}
            onChange={e => setSource(e.target.value)}
            placeholder="https://github.com/you/npure.git"
            className="w-full rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm"
          />
        </Field>

        <label className="flex items-center gap-2 text-sm text-neutral-300">
          <input
            type="checkbox"
            checked={deployNow}
            onChange={e => setDeployNow(e.target.checked)}
          />
          Развернуть сразу после создания
        </label>

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
            {busy ? 'Создаём…' : 'Создать'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

// ── Модалка: логи ───────────────────────────────────────────────────────────

function LogsModal({ project, onClose }: { project: Project; onClose: () => void }) {
  const [logs, setLogs] = useState<string>('Загрузка…')

  useEffect(() => {
    let cancelled = false
    api<{ logs: string }>(`/api/projects/${project.slug}/logs`, { query: { tail: 500 } })
      .then(r => {
        if (!cancelled) setLogs(r.logs || '(пусто)')
      })
      .catch(e => {
        if (!cancelled) setLogs('Ошибка: ' + (e.message ?? String(e)))
      })
    return () => {
      cancelled = true
    }
  }, [project.slug])

  return (
    <Modal onClose={onClose} title={`Логи · ${project.slug}`} wide>
      <pre className="max-h-[60vh] overflow-auto rounded-lg bg-black/60 p-4 text-xs leading-relaxed text-neutral-300 whitespace-pre-wrap">
        {logs}
      </pre>
    </Modal>
  )
}

// ── Общие визуальные хелперы ────────────────────────────────────────────────

function Field(props: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs uppercase tracking-wider text-neutral-500">
        {props.label}
      </span>
      {props.children}
      {props.hint && <span className="block text-xs text-neutral-600">{props.hint}</span>}
    </label>
  )
}

function Modal(props: {
  onClose: () => void
  title: string
  wide?: boolean
  children: React.ReactNode
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
      onClick={props.onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 10, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 10, scale: 0.98 }}
        transition={{ duration: 0.2 }}
        onClick={e => e.stopPropagation()}
        className={`rounded-2xl border border-neutral-800 bg-neutral-950 p-6 w-full ${
          props.wide ? 'max-w-3xl' : 'max-w-md'
        }`}
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
