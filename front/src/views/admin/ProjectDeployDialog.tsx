'use client'

import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { api } from '@/admin/api'
import type { DeployOptions, Deployment, Project } from '@/admin/types'
import { AdminButton, ErrorNote, Field, INPUT_CLASS, StatusBadge } from '@/admin/ui'
import { useUnsavedChanges } from '@/admin/useUnsavedChanges'
import { DeploymentConsole } from './DeploymentConsole'

export const DEPLOY_DEFAULTS: DeployOptions = {
  git_branch: '', context_dir: '.', dockerfile: 'Dockerfile', app_port: null,
  health_path: '/healthz', health_timeout: 120, health_interval: 3, health_status: 200,
  memory_mb: null, cpus: null, pids_limit: null, restart_policy: 'unless-stopped',
  start_command: [], no_cache: false, pull_base_image: false, database_enabled: true,
}
const STAGES: Record<string, string> = { queued: 'В очереди', source: 'Получение кода', build: 'Сборка образа', database: 'База данных', container: 'Запуск приложения', health: 'HTTP-проверка', publish: 'Публикация маршрута', complete: 'Готово' }
type Preflight = { can_deploy: boolean; checks: { status: string; label: string; message: string }[] }

export function ProjectDeployDialog({ project, busy, onClose, onSaved, onDeploy, initialTab = 'settings' }: { initialTab?: 'settings' | 'console'; project: Project; busy: boolean; onClose: () => void; onSaved: (project: Project) => void; onDeploy: () => void }) {
  const [form, setForm] = useState(() => ({ title: project.title ?? '', source: project.source ?? '', deploy_config: { ...DEPLOY_DEFAULTS, ...project.deploy_config } }))
  const [command, setCommand] = useState(() => JSON.stringify(project.deploy_config?.start_command ?? []))
  const [baseline, setBaseline] = useState(() => JSON.stringify({ form, command }))
  const [tab, setTab] = useState<'settings' | 'preflight' | 'history' | 'console'>(initialTab)
  const [saving, setSaving] = useState(false), [checking, setChecking] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState('')
  const [preflight, setPreflight] = useState<Preflight | null>(null), [history, setHistory] = useState<Deployment[] | null>(null), [historyError, setHistoryError] = useState('')
  const dirty = JSON.stringify({ form, command }) !== baseline
  const locked = saving || busy || project.status === 'building' || project.status === 'deploying'
  useUnsavedChanges(dirty)
  const root = useRef<HTMLDivElement>(null), closeRef = useRef<() => void>(() => {})
  const close = useCallback(() => { if (!saving && (!dirty || window.confirm('Есть несохранённые настройки. Закрыть без сохранения?'))) onClose() }, [saving, dirty, onClose])
  useEffect(() => { closeRef.current = close }, [close])
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null, overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'; root.current?.focus()
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); closeRef.current() }
      if (event.key !== 'Tab') return
      const elements = Array.from(root.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled)') ?? []).filter(e => e.getClientRects().length)
      const first = elements[0], last = elements[elements.length - 1]
      if (event.shiftKey && (document.activeElement === first || document.activeElement === root.current)) { event.preventDefault(); last?.focus() }
      else if (!event.shiftKey && (document.activeElement === last || document.activeElement === root.current)) { event.preventDefault(); first?.focus() }
    }
    document.addEventListener('keydown', key)
    return () => { document.body.style.overflow = overflow; document.removeEventListener('keydown', key); previous?.focus() }
  }, [])
  useEffect(() => {
    if (tab !== 'history') return
    let cancelled = false, pending = false
    const load = async () => {
      if (pending) return
      pending = true
      try { const data = await api<Deployment[]>(`/api/projects/${project.slug}/deployments`); if (!cancelled) { setHistory(data); setHistoryError('') } }
      catch (error) { if (!cancelled) setHistoryError(error instanceof Error ? error.message : String(error)) }
      finally { pending = false }
    }
    void load(); const timer = window.setInterval(load, 3000)
    return () => { cancelled = true; clearInterval(timer) }
  }, [tab, project.slug])
  const patch = <K extends keyof DeployOptions>(key: K, value: DeployOptions[K]) => {
    setForm(current => ({ ...current, deploy_config: { ...current.deploy_config, [key]: value } })); setNotice(''); setPreflight(null)
  }
  async function save(event: FormEvent) {
    event.preventDefault()
    if (locked) return
    setError(''); setNotice('')
    try {
      const args: unknown = command.trim() ? JSON.parse(command) : []
      if (!Array.isArray(args) || args.some(value => typeof value !== 'string')) throw new Error('Команда запуска — JSON-массив строк, например ["node", "server.js"]')
      setSaving(true)
      const data = await api<Project>(`/api/projects/${project.slug}/settings`, { method: 'PUT', body: { ...form, title: form.title.trim() || null, source: form.source.trim() || null, deploy_config: { ...form.deploy_config, start_command: args } } })
      const next = { title: data.title ?? '', source: data.source ?? '', deploy_config: { ...DEPLOY_DEFAULTS, ...data.deploy_config } }, cmd = JSON.stringify(next.deploy_config.start_command)
      setForm(next); setCommand(cmd); setBaseline(JSON.stringify({ form: next, command: cmd })); onSaved(data); setPreflight(null); setNotice('Настройки сохранены. Рабочий сайт не перезапускался; параметры применятся при следующем деплое.')
    } catch (error) { setError(error instanceof Error ? error.message : String(error)) }
    finally { setSaving(false) }
  }
  async function check() {
    if (dirty) return
    setChecking(true); setError('')
    try { setPreflight(await api<Preflight>(`/api/projects/${project.slug}/readiness`)) }
    catch (error) { setError(error instanceof Error ? error.message : String(error)) }
    finally { setChecking(false) }
  }
  async function launch() {
    if (dirty || locked || checking) return
    setChecking(true); setError('')
    try {
      const ready = await api<Preflight>(`/api/projects/${project.slug}/readiness`)
      setPreflight(ready)
      if (!ready.can_deploy) { setTab('preflight'); setError('Выкладка не запущена: исправьте блокирующие проблемы.'); return }
      setTab('console'); onDeploy()
    } catch (e) { setError(e instanceof Error ? e.message : String(e)) }
    finally { setChecking(false) }
  }
  const options = form.deploy_config
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 md:p-8" onClick={close}>
    <div ref={root} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="deploy-dialog-title" onClick={event => event.stopPropagation()} className="flex max-h-[calc(100dvh-2rem)] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-line bg-bg text-fg outline-none">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-line px-5 py-5 md:px-8"><div><p className="font-mono text-xs text-muted">{project.domain}</p><h2 id="deploy-dialog-title" className="mt-1 text-2xl font-medium tracking-tight">Выкладка · {project.slug}</h2></div><div className="flex flex-wrap gap-2">{tab === 'settings' && <AdminButton type="submit" form="deploy-settings" variant="primary" disabled={!dirty || locked} busy={saving}>Сохранить</AdminButton>}<AdminButton disabled={dirty || locked || checking} busy={busy || checking} onClick={() => void launch()}>Развернуть</AdminButton><AdminButton aria-label="Закрыть настройки выкладки" onClick={close}>×</AdminButton></div></header>
      <div className="flex flex-wrap gap-2 border-b border-line px-5 py-3 md:px-8" role="group" aria-label="Раздел выкладки">{([['settings', 'Настройки'], ['preflight', 'Проверка'], ['history', 'История'], ['console', 'Консоль']] as const).map(([key, label]) => <AdminButton key={key} aria-pressed={tab === key} variant={tab === key ? 'primary' : 'ghost'} onClick={() => setTab(key)}>{label}</AdminButton>)}</div>
      <div className="overflow-y-auto px-5 py-6 md:px-8">
        {error && <div className="mb-5"><ErrorNote>{error}</ErrorNote></div>}
        {notice && <p role="status" className="mb-6 rounded-xl border border-good/30 p-4 text-sm text-good">{notice}</p>}
        {tab === 'console' && <DeploymentConsole slug={project.slug} />}
        {tab === 'settings' && <form id="deploy-settings" onSubmit={save}><fieldset disabled={locked} className="min-w-0 space-y-9">
          <section><h3 className="mb-5 text-xl font-medium">Исходники и сборка</h3><div className="grid gap-5 sm:grid-cols-2">
            <Field label="Название"><input maxLength={200} value={form.title} onChange={event => setForm(current => ({ ...current, title: event.target.value }))} className={INPUT_CLASS} /></Field>
            <Field label="Git-репозиторий или папка" hint="Доступ к приватному Git настраивается на сервере; секреты приложения — в .env."><input maxLength={500} value={form.source} onChange={event => { setForm(current => ({ ...current, source: event.target.value })); setPreflight(null) }} className={INPUT_CLASS} /></Field>
            <Field label="Ветка Git" hint="Пусто — ветка репозитория по умолчанию; main, staging, feature/name."><input maxLength={100} value={options.git_branch} onChange={event => patch('git_branch', event.target.value)} className={INPUT_CLASS} /></Field>
            <Field label="Контекст сборки" hint="Относительно корня репозитория, например . или apps/site."><input required value={options.context_dir} onChange={event => patch('context_dir', event.target.value)} className={INPUT_CLASS} /></Field>
            <Field label="Dockerfile" hint="Относительно выбранного контекста сборки."><input required value={options.dockerfile} onChange={event => patch('dockerfile', event.target.value)} className={INPUT_CLASS} /></Field>
            <Field label="Команда запуска" hint={'JSON-массив аргументов. [] — CMD из Dockerfile. Без оболочки.'}><input value={command} onChange={event => setCommand(event.target.value)} placeholder={'["node", "server.js"]'} className={`${INPUT_CLASS} font-mono`} /></Field>
          </div><div className="mt-5 flex flex-wrap gap-5"><Check label="Сборка без кэша" checked={options.no_cache} change={value => patch('no_cache', value)} /><Check label="Обновлять базовый образ" checked={options.pull_base_image} change={value => patch('pull_base_image', value)} /><Check label="PostgreSQL для сайта" checked={options.database_enabled} change={value => patch('database_enabled', value)} /></div><p className="mt-3 text-sm text-muted">Отключение PostgreSQL не удаляет существующие данные. Секреты не следует включать в команду сборки или запуска.</p></section>
          <section className="border-t border-line pt-7"><div className="mb-5 flex flex-wrap items-center justify-between gap-4"><h3 className="text-xl font-medium">Запуск и HTTP-проверка</h3><div className="flex flex-wrap gap-2"><AdminButton type="button" onClick={() => { setForm(current => ({ ...current, deploy_config: { ...current.deploy_config, app_port: 3000, health_path: '/', database_enabled: false, memory_mb: 1024, cpus: 1, pids_limit: 256 } })); setPreflight(null) }}>Профиль Node / Next</AdminButton><AdminButton type="button" onClick={() => { setForm(current => ({ ...current, deploy_config: { ...current.deploy_config, app_port: 80, health_path: '/', database_enabled: false, memory_mb: 256, cpus: .5, pids_limit: 128 } })); setPreflight(null) }}>Профиль статики</AdminButton></div></div>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Порт приложения" hint="Пусто — порт панели (обычно 8080). Заданный порт также передаётся как PORT."><input type="number" min={1} max={65535} value={options.app_port ?? ''} onChange={event => patch('app_port', event.target.value ? Number(event.target.value) : null)} className={INPUT_CLASS} /></Field>
              <Field label="Путь HTTP-проверки"><input required value={options.health_path} onChange={event => patch('health_path', event.target.value)} className={INPUT_CLASS} /></Field>
              <Field label="Ожидаемый HTTP-код"><input type="number" required min={200} max={399} value={options.health_status} onChange={event => patch('health_status', Number(event.target.value))} className={INPUT_CLASS} /></Field>
              <Field label="Ожидание готовности, с"><input type="number" required min={10} max={600} value={options.health_timeout} onChange={event => patch('health_timeout', Number(event.target.value))} className={INPUT_CLASS} /></Field>
              <Field label="Интервал проверок, с"><input type="number" required min={1} max={30} value={options.health_interval} onChange={event => patch('health_interval', Number(event.target.value))} className={INPUT_CLASS} /></Field>
              <Field label="Политика перезапуска"><select value={options.restart_policy} onChange={event => patch('restart_policy', event.target.value as DeployOptions['restart_policy'])} className={INPUT_CLASS}><option value="unless-stopped">Если не остановлен вручную</option><option value="on-failure">При ошибке</option><option value="no">Без перезапуска</option></select></Field>
            </div><p className="mt-3 text-sm leading-relaxed text-muted">В образе нужен curl или wget. Старая и новая версии временно используют общую БД — миграции должны быть обратно совместимыми. Новая версия запускается в отдельном контейнере. Маршрут переключается после HTTP-проверки. Профили меняют только настройки — Dockerfile должен поддерживать выбранный порт.</p>
          </section>
          <section className="border-t border-line pt-7"><h3 className="mb-5 text-xl font-medium">Ресурсы приложения</h3><div className="grid gap-5 sm:grid-cols-3"><Field label="Память, МБ"><input type="number" min={128} max={32768} value={options.memory_mb ?? ''} onChange={event => patch('memory_mb', event.target.value ? Number(event.target.value) : null)} className={INPUT_CLASS} /></Field><Field label="CPU, ядер"><input type="number" min={.1} max={16} step={.1} value={options.cpus ?? ''} onChange={event => patch('cpus', event.target.value ? Number(event.target.value) : null)} className={INPUT_CLASS} /></Field><Field label="Лимит процессов"><input type="number" min={32} max={4096} value={options.pids_limit ?? ''} onChange={event => patch('pids_limit', event.target.value ? Number(event.target.value) : null)} className={INPUT_CLASS} /></Field></div><p className="mt-3 text-sm text-muted">Пустое значение сохраняет прежнее поведение без лимита. Журнал приложения автоматически ротируется: 3 файла по 10 МБ. Лимиты относятся к контейнеру приложения, не к сборке и PostgreSQL.</p></section>
        </fieldset></form>}
        {tab === 'preflight' && <section><h3 className="text-2xl font-medium">До запуска</h3><p className="mb-6 mt-3 text-sm leading-relaxed text-muted">Проверка Docker, Caddy, worker, места, сохранённых файлов и доступа к ветке Git. Может занять до 20 секунд; сборку и контейнеры не запускает.{dirty ? ' Сначала сохраните изменения.' : ''}</p><AdminButton disabled={dirty || locked} busy={checking} onClick={check}>Проверить конфигурацию</AdminButton>{preflight && <ul className="mt-7 space-y-4">{preflight.checks.map((check, index) => <li key={index} className="rounded-xl border border-line p-5"><div className="mb-2 flex items-center gap-3"><StatusBadge label={check.status === 'ok' ? 'OK' : check.status === 'error' ? 'Ошибка' : 'Учесть'} tone={check.status === 'ok' ? 'good' : check.status === 'error' ? 'critical' : 'warning'} /><h4 className="font-medium">{check.label}</h4></div><p className="text-sm leading-relaxed text-muted">{check.message}</p></li>)}</ul>}</section>}
        {tab === 'history' && <section><h3 className="text-2xl font-medium">Последние 30 выкладок</h3><p className="mt-3 text-sm text-muted">Этапы сохраняются на сервере; список обновляется каждые 3 секунды. Выкладка идёт в фоне: страницу можно закрыть. Новая версия проверяется отдельно; до переключения работает предыдущая. При прерывании worker продолжит задание.</p>{historyError && <div className="mt-5"><ErrorNote>{historyError}</ErrorNote></div>}{history === null && !historyError && <p className="mt-6 text-muted">Загрузка…</p>}{history?.length === 0 && <p className="mt-6 text-muted">История появится после первого деплоя обновлённой панелью.</p>}<ol className="mt-7">{history?.map(attempt => <li key={attempt.id} className="border-t border-line py-5"><div className="flex flex-wrap items-center gap-4"><span className="font-mono text-sm">#{attempt.id}</span><StatusBadge label={attempt.status === 'running' ? 'Готово' : attempt.status === 'failed' ? 'Ошибка' : attempt.status === 'queued' ? 'В очереди' : 'Выполняется'} tone={attempt.status === 'running' ? 'good' : attempt.status === 'failed' ? 'critical' : 'warning'} /><span>{STAGES[attempt.stage] ?? attempt.stage}</span></div><p className="mt-3 text-sm text-muted">{new Date(attempt.started_at).toLocaleString('ru-RU')}{attempt.finished_at ? ` · ${Math.max(0, Math.round((Date.parse(attempt.finished_at) - Date.parse(attempt.started_at)) / 1000))} с` : ''}{attempt.revision ? ` · ${attempt.revision.slice(0, 10)}` : ''}</p>{attempt.error && <pre className="mt-4 whitespace-pre-wrap break-words rounded-xl border border-danger/30 p-4 font-mono text-xs leading-relaxed text-danger">{attempt.error}</pre>}</li>)}</ol></section>}
      </div>
    </div>
  </div>
}

function Check({ label, checked, change }: { label: string; checked: boolean; change: (value: boolean) => void }) {
  return <label className="inline-flex items-center gap-3 text-sm"><input type="checkbox" checked={checked} onChange={event => change(event.target.checked)} className="size-4 accent-accent" />{label}</label>
}
