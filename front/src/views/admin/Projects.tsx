'use client'

import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/cn'
import { api, ApiError } from '@/admin/api'
import type { ActionResult, EnvVar, EnvVarReveal, Project } from '@/admin/types'
import { AdminButton, ErrorNote, PageHeader, StatusBadge } from '@/admin/ui'
import { STATUS_META } from './projectStatus'
import { ProjectLoad } from './ProjectLoad'

type Busy = Record<string, string | undefined>  // slug → текущее действие

export default function Projects() {
  const [projects, setProjects] = useState<Project[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<Busy>({})
  const [logsFor, setLogsFor] = useState<Project | null>(null)
  const [envFor, setEnvFor] = useState<Project | null>(null)
  const [domainsFor, setDomainsFor] = useState<Project | null>(null)
  const [showNew, setShowNew] = useState(false)
  // Раскрытый стенд. Один за раз: две простыни графиков рядом невозможно
  // сравнивать, а прокрутка до второй превращается в поиск.
  const [openSlug, setOpenSlug] = useState<string | null>(null)

  // Мёрдж обновлённого проекта (после добавления/удаления домена) в список и
  // в открытую модалку доменов, чтобы UI сразу показывал актуальные домены.
  const updateProject = useCallback((proj: Project) => {
    setProjects(ps => (ps ?? []).map(p => (p.slug === proj.slug ? proj : p)))
    setDomainsFor(cur => (cur && cur.slug === proj.slug ? proj : cur))
  }, [])

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
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Под-сайты"
        subtitle="Каждый сайт — пара контейнеров (app + postgres) в общей docker-сети. Нажми на стенд, чтобы посмотреть нагрузку."
        action={
          <AdminButton variant="primary" onClick={() => setShowNew(true)}>
            Новый стенд
          </AdminButton>
        }
      />

      {error && <ErrorNote>{error}</ErrorNote>}

      <div className="flex flex-col">
        {projects === null && (
          <div className="font-ui text-[13px] text-muted">Загрузка…</div>
        )}
        {projects?.length === 0 && (
          <div className="border border-dashed border-line p-10 text-center font-ui text-[14px] text-muted">
            Пока ни одного стенда. Нажми «Новый стенд», чтобы добавить.
          </div>
        )}
        {projects?.map(p => (
          <ProjectCard
            key={p.id}
            project={p}
            busy={busy[p.slug]}
            open={openSlug === p.slug}
            onToggle={() => setOpenSlug(cur => (cur === p.slug ? null : p.slug))}
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
            onEnv={() => setEnvFor(p)}
            onDomains={() => setDomainsFor(p)}
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
        {domainsFor && (
          <DomainsModal
            project={domainsFor}
            onClose={() => setDomainsFor(null)}
            onUpdated={updateProject}
          />
        )}
        {envFor && (
          <EnvModal
            project={envFor}
            onClose={() => setEnvFor(null)}
            onRedeploy={() => {
              const slug = envFor.slug
              setEnvFor(null)
              act(slug, 'deploy', () =>
                api<ActionResult>(`/api/projects/${slug}/deploy`, {
                  method: 'POST',
                  body: {},
                }),
              )
            }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Карточка проекта ────────────────────────────────────────────────────────

function ProjectCard(props: {
  project: Project
  busy: string | undefined
  open: boolean
  onToggle: () => void
  onDeploy: () => void
  onStop: () => void
  onStart: () => void
  onLogs: () => void
  onEnv: () => void
  onDomains: () => void
  onDelete: (dropData: boolean) => void
}) {
  const { project: p, busy, open } = props
  const meta = STATUS_META[p.status]
  const inFlight = busy !== undefined
  const customDomains = p.custom_domains ?? []

  return (
    <motion.div layout className="border-t border-line">
      {/* Кликабельна только шапка блока. Кнопки действий лежат рядом, а не
          внутри неё: вложенная кнопка невалидна, да и промах по «Удалить»
          вместо раскрытия слишком дорого стоит. */}
      <button
        type="button"
        onClick={props.onToggle}
        aria-expanded={open}
        className="flex w-full items-start justify-between gap-4 py-5 text-left"
      >
        <span className="min-w-0">
          <span className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className="text-[19px] font-medium tracking-tight text-fg">{p.slug}</span>
            <StatusBadge label={meta.label} tone={meta.tone} />
            {p.title && <span className="font-ui text-[13px] text-muted">{p.title}</span>}
          </span>
          <span className="mt-1 block font-ui text-[13px] text-muted">{p.domain}</span>
        </span>

        <span
          aria-hidden
          className={cn(
            'mt-1 shrink-0 font-ui text-[15px] text-muted transition-transform duration-200',
            open && 'rotate-90',
          )}
        >
          &#8250;
        </span>
      </button>

      <div className="flex flex-wrap items-center gap-2 pb-5">
        <AdminButton
          variant="primary"
          onClick={props.onDeploy}
          busy={busy === 'deploy'}
          disabled={inFlight}
        >
          Развернуть
        </AdminButton>
        {p.status === 'running' ? (
          <AdminButton onClick={props.onStop} busy={busy === 'stop'} disabled={inFlight}>
            Остановить
          </AdminButton>
        ) : (
          <AdminButton onClick={props.onStart} busy={busy === 'start'} disabled={inFlight}>
            Запустить
          </AdminButton>
        )}
        <AdminButton onClick={props.onLogs} disabled={inFlight}>
          Логи
        </AdminButton>
        <AdminButton onClick={props.onEnv} disabled={inFlight}>
          .env
        </AdminButton>
        <AdminButton onClick={props.onDomains} disabled={inFlight}>
          Домены
        </AdminButton>
        <div className="flex-1" />
        <AdminButton
          variant="danger"
          busy={busy === 'delete'}
          disabled={inFlight}
          onClick={() => {
            const drop = window.confirm(
              `Удалить ${p.slug}? OK — снести вместе с БД (volume), Cancel — оставить БД.`,
            )
            const reallyDelete = window.confirm(
              drop
                ? `ПОДТВЕРДИ удаление ${p.slug} ВМЕСТЕ С ДАННЫМИ БД.`
                : `Удалить контейнеры ${p.slug}, БД сохранить?`,
            )
            if (reallyDelete) props.onDelete(drop)
          }}
        >
          Удалить
        </AdminButton>
      </div>

      {customDomains.length > 0 && (
        <div className="flex flex-wrap gap-2 pb-5">
          {customDomains.map(d => (
            <a
              key={d}
              href={`https://${d}`}
              target="_blank"
              rel="noreferrer"
              className="border border-line px-2.5 py-1 font-ui text-[12px] text-muted transition-colors duration-200 hover:text-fg"
            >
              {d}
            </a>
          ))}
        </div>
      )}

      {p.last_error && (
        <p className="mb-5 border border-danger/40 px-3 py-2 font-ui text-[12px] text-danger">
          {p.last_error}
        </p>
      )}

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="load"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="border-t border-line py-8">
              <ProjectLoad slug={p.slug} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
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
            className="w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm"
          />
        </Field>
        <Field label="title (опционально)">
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm"
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
            className="w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm"
          />
        </Field>

        <label className="flex items-center gap-2 text-sm text-muted">
          <input
            type="checkbox"
            checked={deployNow}
            onChange={e => setDeployNow(e.target.checked)}
          />
          Развернуть сразу после создания
        </label>

        {error && (
          <div className="rounded-lg border border-danger/40 bg-transparent px-3 py-2 text-sm text-danger">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={props.onClose}
            className="rounded-md px-3 py-1.5 text-sm text-muted hover:text-fg"
          >
            Отмена
          </button>
          <button
            type="submit"
            disabled={busy}
            className="rounded-md bg-accent px-4 py-1.5 text-sm font-medium text-accent-fg hover:opacity-90 disabled:opacity-50"
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
      <pre className="max-h-[60vh] overflow-auto rounded-lg bg-black/60 p-4 text-xs leading-relaxed text-muted whitespace-pre-wrap">
        {logs}
      </pre>
    </Modal>
  )
}

// ── Общие визуальные хелперы ────────────────────────────────────────────────

function Field(props: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs uppercase tracking-wider text-muted">
        {props.label}
      </span>
      {props.children}
      {props.hint && <span className="block text-xs text-muted">{props.hint}</span>}
    </label>
  )
}

// ── Модалка: env-vars гостя ─────────────────────────────────────────────────
// Полный CRUD по ключам, превью значения замаскировано (••••), значение
// можно «подсмотреть» через GET /env/{key}/reveal — один раз, без кэша.
// Preset «Bootstrap-админ» заполняет BOOTSTRAP_ADMIN_EMAIL + случайный пароль.

function EnvModal({
  project,
  onClose,
  onRedeploy,
}: {
  project: Project
  onClose: () => void
  onRedeploy: () => void
}) {
  const [vars, setVars] = useState<EnvVar[] | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [newKey, setNewKey] = useState('')
  const [newValue, setNewValue] = useState('')

  const reload = useCallback(() => {
    api<EnvVar[]>(`/api/projects/${project.slug}/env`)
      .then(setVars)
      .catch(e => setError(e.message ?? String(e)))
  }, [project.slug])

  useEffect(() => {
    reload()
  }, [reload])

  async function save(key: string, value: string) {
    setBusy(true)
    setError(null)
    try {
      await api<EnvVar>(`/api/projects/${project.slug}/env/${key}`, {
        method: 'PUT',
        body: { value },
      })
      reload()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  async function remove(key: string) {
    if (!window.confirm(`Удалить ${key}?`)) return
    setBusy(true)
    setError(null)
    try {
      await api(`/api/projects/${project.slug}/env/${key}`, { method: 'DELETE' })
      reload()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  async function addNew(e: FormEvent) {
    e.preventDefault()
    const key = newKey.trim().toUpperCase()
    if (!key) return
    await save(key, newValue)
    setNewKey('')
    setNewValue('')
  }

  // Preset: создаёт BOOTSTRAP_ADMIN_EMAIL + BOOTSTRAP_ADMIN_PASSWORD с
  // случайно сгенерированным паролем (16 символов). Email берёт от user'а.
  async function presetBootstrap() {
    const email = window.prompt(
      'Email для первого админа под-сайта:',
      `admin@${project.domain}`,
    )?.trim()
    if (!email) return
    // crypto-strong рандом, base62-ish.
    const buf = new Uint8Array(12)
    crypto.getRandomValues(buf)
    const pw = btoa(String.fromCharCode(...buf))
      .replace(/[+/=]/g, '')
      .slice(0, 16)
    setBusy(true)
    setError(null)
    try {
      await api(`/api/projects/${project.slug}/env/BOOTSTRAP_ADMIN_EMAIL`, {
        method: 'PUT',
        body: { value: email },
      })
      await api(`/api/projects/${project.slug}/env/BOOTSTRAP_ADMIN_PASSWORD`, {
        method: 'PUT',
        body: { value: pw },
      })
      reload()
      window.alert(
        `Создано:\n\nemail: ${email}\nпароль: ${pw}\n\n` +
          'Сохрани пароль ОТДЕЛЬНО — после передеплоя его уже нельзя будет ' +
          'посмотреть без расшифровки. После «Применить и передеплоить» войди ' +
          `по этим данным на https://${project.domain}/admin (или куда у тебя ` +
          'смотрит админка под-сайта).',
      )
    } catch (err) {
      setError(err instanceof ApiError ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  async function revealValue(key: string) {
    try {
      const r = await api<EnvVarReveal>(
        `/api/projects/${project.slug}/env/${key}/reveal`,
      )
      // Кладём в clipboard сразу — модалка не показывает plaintext.
      await navigator.clipboard.writeText(r.value).catch(() => {
        /* fallback ниже */
      })
      window.alert(
        `Значение ${key} скопировано в буфер обмена. ` +
          'Если буфер не сработал — вот оно:\n\n' +
          r.value,
      )
    } catch (e) {
      setError(e instanceof ApiError ? e.message : String(e))
    }
  }

  return (
    <Modal onClose={onClose} title={`Env · ${project.slug}`} wide>
      <p className="text-xs text-muted mb-4">
        Произвольные переменные окружения, которые передаются в контейнер
        под-сайта при деплое. <code>DATABASE_URL</code>,{' '}
        <code>SECRET_KEY</code>, <code>JWT_SECRET</code>,{' '}
        <code>PUBLIC_SITE_URL</code> — управляются панелью автоматически,{' '}
        их перебивать не нужно (но можно, если очень хочется).
      </p>

      {/* Текущие ключи */}
      <div className="space-y-2 mb-5">
        {vars === null && <div className="text-sm text-muted">Загрузка…</div>}
        {vars?.length === 0 && (
          <div className="text-sm text-muted text-center py-6 border border-dashed border-line rounded-lg">
            Пусто. Используй форму ниже или preset.
          </div>
        )}
        {vars?.map(ev => (
          <div
            key={ev.key}
            className="flex items-center gap-3 rounded-lg border border-line bg-surface px-3 py-2"
          >
            <code className="font-mono text-sm text-fg min-w-0 truncate">
              {ev.key}
            </code>
            <code className="font-mono text-xs text-muted flex-1 truncate">
              {ev.value_preview}
            </code>
            <button
              onClick={() => revealValue(ev.key)}
              className="rounded-md px-2 py-1 text-xs text-muted hover:text-fg"
              title="скопировать plaintext в буфер"
            >
              copy
            </button>
            <button
              onClick={() => remove(ev.key)}
              className="rounded-md px-2 py-1 text-xs text-danger hover:bg-transparent"
              disabled={busy}
            >
              ×
            </button>
          </div>
        ))}
      </div>

      {/* Preset */}
      <div className="mb-4 rounded-lg border border-good/35 bg-good/10 p-3">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-sm font-medium text-good">
              Bootstrap-админ под-сайта
            </div>
            <div className="text-xs text-muted mt-0.5">
              Создаст <code>BOOTSTRAP_ADMIN_EMAIL</code> и{' '}
              <code>BOOTSTRAP_ADMIN_PASSWORD</code> со случайным паролем.
              Сам сайт прочитает их при следующем деплое и заведёт пользователя.
            </div>
          </div>
          <button
            onClick={presetBootstrap}
            disabled={busy}
            className="rounded-md bg-accent/15 px-3 py-1.5 text-xs text-good hover:bg-good/25 disabled:opacity-50 whitespace-nowrap"
          >
            Создать
          </button>
        </div>
      </div>

      {/* Добавить вручную */}
      <form onSubmit={addNew} className="grid grid-cols-[1fr_2fr_auto] gap-2 mb-4">
        <input
          required
          placeholder="KEY"
          value={newKey}
          onChange={e => setNewKey(e.target.value.toUpperCase())}
          className="rounded-md border border-line bg-bg px-3 py-2 text-sm font-mono"
        />
        <input
          required
          placeholder="value"
          value={newValue}
          onChange={e => setNewValue(e.target.value)}
          className="rounded-md border border-line bg-bg px-3 py-2 text-sm font-mono"
        />
        <button
          type="submit"
          disabled={busy}
          className="rounded-md bg-accent px-3 py-2 text-sm font-medium text-accent-fg hover:opacity-90 disabled:opacity-50"
        >
          +
        </button>
      </form>

      {error && (
        <div className="rounded-lg border border-danger/40 bg-transparent px-3 py-2 text-sm text-danger mb-4">
          {error}
        </div>
      )}

      <div className="flex justify-between items-center pt-3 border-t border-line">
        <p className="text-xs text-muted">
          Изменения применятся при следующем деплое.
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-3 py-1.5 text-sm text-muted hover:text-fg"
          >
            Закрыть
          </button>
          <button
            type="button"
            onClick={onRedeploy}
            disabled={busy}
            className="rounded-md bg-accent px-4 py-1.5 text-sm font-medium text-accent-fg hover:opacity-90 disabled:opacity-50"
          >
            Применить и передеплоить
          </button>
        </div>
      </div>
    </Modal>
  )
}

// ── Модалка: кастомные домены ───────────────────────────────────────────────
// Привязка/отвязка доменов. Домен сразу прописывается в Caddy; TLS выпустится
// автоматически, как только A-запись домена укажет на IP сервера.

function DomainsModal({
  project,
  onClose,
  onUpdated,
}: {
  project: Project
  onClose: () => void
  onUpdated: (p: Project) => void
}) {
  const [newDomain, setNewDomain] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const domains = project.custom_domains ?? []

  async function add(e: FormEvent) {
    e.preventDefault()
    const domain = newDomain.trim().toLowerCase()
    if (!domain) return
    setBusy(true)
    setError(null)
    try {
      const updated = await api<Project>(`/api/projects/${project.slug}/domains`, {
        method: 'POST',
        body: { domain },
      })
      onUpdated(updated)
      setNewDomain('')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  async function remove(domain: string) {
    if (!window.confirm(`Отвязать домен ${domain}?`)) return
    setBusy(true)
    setError(null)
    try {
      const updated = await api<Project>(
        `/api/projects/${project.slug}/domains/${encodeURIComponent(domain)}`,
        { method: 'DELETE' },
      )
      onUpdated(updated)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal onClose={onClose} title={`Домены · ${project.slug}`}>
      <p className="text-xs text-muted mb-4">
        Базовый домен <code>{project.domain}</code> работает всегда. Кастомные
        домены добавляй здесь — затем поставь у регистратора{' '}
        <strong>A-запись домена на IP этого сервера</strong>. TLS-сертификат
        Caddy выпустит автоматически после того, как DNS обновится.
      </p>

      {/* Базовый домен */}
      <div className="mb-3 flex items-center gap-2 rounded-lg border border-line bg-surface px-3 py-2">
        <code className="font-mono text-sm text-muted flex-1 truncate">
          {project.domain}
        </code>
        <span className="text-xs text-muted">базовый</span>
      </div>

      {/* Кастомные домены */}
      <div className="space-y-2 mb-5">
        {domains.length === 0 && (
          <div className="text-sm text-muted text-center py-5 border border-dashed border-line rounded-lg">
            Кастомных доменов пока нет.
          </div>
        )}
        {domains.map(d => (
          <div
            key={d}
            className="flex items-center gap-3 rounded-lg border border-line bg-surface px-3 py-2"
          >
            <code className="font-mono text-sm text-good flex-1 truncate">{d}</code>
            <a
              href={`https://${d}`}
              target="_blank"
              rel="noreferrer"
              className="rounded-md px-2 py-1 text-xs text-muted hover:text-fg"
            >
              открыть ↗
            </a>
            <button
              onClick={() => remove(d)}
              disabled={busy}
              className="rounded-md px-2 py-1 text-xs text-danger hover:bg-transparent disabled:opacity-40"
            >
              ×
            </button>
          </div>
        ))}
      </div>

      {/* Добавить */}
      <form onSubmit={add} className="grid grid-cols-[1fr_auto] gap-2 mb-4">
        <input
          required
          placeholder="example.ru"
          value={newDomain}
          onChange={e => setNewDomain(e.target.value)}
          className="rounded-md border border-line bg-bg px-3 py-2 text-sm font-mono"
        />
        <button
          type="submit"
          disabled={busy}
          className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-fg hover:opacity-90 disabled:opacity-50"
        >
          {busy ? '…' : 'Привязать'}
        </button>
      </form>

      {error && (
        <div className="rounded-lg border border-danger/40 bg-transparent px-3 py-2 text-sm text-danger">
          {error}
        </div>
      )}
    </Modal>
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
        className={`rounded-2xl border border-line bg-bg p-6 w-full ${
          props.wide ? 'max-w-3xl' : 'max-w-md'
        }`}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{props.title}</h2>
          <button
            onClick={props.onClose}
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
