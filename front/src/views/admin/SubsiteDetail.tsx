'use client'

import { useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { api } from '@/admin/api'
import type { ActionResult, Project } from '@/admin/types'
import { AdminButton, ErrorNote, StatusBadge } from '@/admin/ui'
import { STATUS_META } from './projectStatus'
import { ProjectLoad } from './ProjectLoad'
import { DeploymentConsole } from './DeploymentConsole'
import { ServerDiagnostics, type Readiness } from './ServerDiagnostics'
import { DomainsModal, EnvModal, LogsModal } from './Projects'
import { ProjectDeployDialog } from './ProjectDeployDialog'

const TABS = [['overview', 'Обзор'], ['load', 'Нагрузка'], ['console', 'Консоль'], ['diagnostics', 'Диагностика'], ['settings', 'Настройки']] as const

export default function SubsiteDetail() {
  const { slug = '' } = useParams()
  const [search, setSearch] = useSearchParams()
  const tab = TABS.some(([id]) => id === search.get('tab')) ? search.get('tab') : 'overview'
  const [project, setProject] = useState<Project | null>(null)
  const [error, setError] = useState('')
  const [loadError, setLoadError] = useState('')
  const [busy, setBusy] = useState(false)
  const [modal, setModal] = useState<'env' | 'domains' | 'logs' | 'settings' | null>(null)
  useEffect(() => {
    let cancelled = false, pending = false
    const controller = new AbortController()
    const load = async () => {
      if (pending || document.hidden) return
      pending = true
      try {
        const value = await api<Project>(`/api/projects/${slug}`, { signal: controller.signal })
        if (!cancelled) { setProject(value); setLoadError('') }
      } catch (e) { if (!cancelled) setLoadError(e instanceof Error ? e.message : String(e)) }
      finally { pending = false }
    }
    void load(); const timer = window.setInterval(load, 5000)
    document.addEventListener('visibilitychange', load)
    return () => { cancelled = true; controller.abort(); clearInterval(timer); document.removeEventListener('visibilitychange', load) }
  }, [slug])
  const current = project?.slug === slug ? project : null
  const locked = busy || current?.status === 'building' || current?.status === 'deploying'
  async function action(name: 'deploy' | 'start' | 'stop', verified = false) {
    if (!current || locked) return
    setBusy(true); setError('')
    try {
      if (name === 'deploy' && !verified) {
        const ready = await api<Readiness>(`/api/projects/${slug}/readiness`)
        if (!ready.can_deploy) { setModal(null); setSearch({ tab: 'diagnostics' }); throw new Error('Выкладка не запущена: исправьте блокирующие проблемы диагностики.') }
      }
      const result = await api<ActionResult>(`/api/projects/${slug}/${name}`, { method: 'POST', ...(name === 'deploy' ? { body: {} } : {}) })
      setProject(result.project)
      if (name === 'deploy') { setModal(null); setSearch({ tab: 'console' }) }
    } catch (e) { if (name === 'deploy') setModal(null); setError(e instanceof Error ? e.message : String(e)) }
    finally { setBusy(false) }
  }
  return <div className="space-y-7">
    <Link to="/projects" className="text-sm text-muted hover:text-fg">← Все подсайты</Link>
    {loadError && <ErrorNote>{loadError}</ErrorNote>}
    {error && <ErrorNote>{error}</ErrorNote>}
    {!current && <p className="text-muted">{error ? 'Сайт не загружен.' : 'Загрузка сайта…'}</p>}
    {current && <>
      <header className="flex flex-wrap items-start justify-between gap-6"><div className="min-w-0"><div className="flex flex-wrap items-center gap-4"><h1 className="break-all text-4xl font-medium tracking-tight md:text-5xl">{current.title || current.slug}</h1><StatusBadge label={STATUS_META[current.status].label} tone={STATUS_META[current.status].tone} /></div><a href={`https://${current.domain}`} target="_blank" rel="noopener noreferrer" className="mt-4 inline-block break-all text-muted underline decoration-line underline-offset-4 hover:text-fg">{current.domain} ↗</a></div><div className="flex flex-wrap gap-2"><AdminButton variant="primary" busy={busy} disabled={locked} onClick={() => void action('deploy')}>Развернуть</AdminButton><AdminButton disabled={locked} onClick={() => void action(current.status === 'running' ? 'stop' : 'start')}>{current.status === 'running' ? 'Остановить' : 'Запустить'}</AdminButton></div></header>
      {current.last_error && <ErrorNote>{current.last_error}</ErrorNote>}
      <nav aria-label="Разделы подсайта" className="flex flex-wrap gap-2 border-y border-line py-4">{TABS.map(([id, label]) => <Link key={id} to={`?tab=${id}`} aria-current={tab === id ? 'page' : undefined} className={`rounded-full border px-5 py-2.5 text-sm font-medium ${tab === id ? 'border-fg bg-fg text-bg' : 'border-line hover:border-fg'}`}>{label}</Link>)}</nav>
      {tab === 'overview' && <>
        <div className="grid gap-4 md:grid-cols-3">{[
          ['Активная версия', current.image_tag || 'Пока не опубликована'],
          ['Контейнер приложения', current.app_container || 'Пока не создан'],
          ['Последняя публикация', current.deployed_at ? new Date(current.deployed_at).toLocaleString('ru-RU') : 'Ещё не было'],
        ].map(([label, value]) => <div key={label} className="rounded-2xl border border-line p-5"><p className="text-xs text-muted">{label}</p><p className="mt-3 break-all font-mono text-sm">{value}</p></div>)}</div>
        <ProjectLoad slug={slug} />
      </>}
      {tab === 'load' && <ProjectLoad slug={slug} />}
      {tab === 'console' && <DeploymentConsole slug={slug} />}
      {tab === 'diagnostics' && <ServerDiagnostics slug={slug} />}
      {tab === 'settings' && <section className="space-y-5"><h2 className="text-2xl font-medium">Управление сайтом</h2><p className="text-sm leading-relaxed text-muted">Сохранение параметров выкладки не меняет работающую версию. Применение — при следующем деплое.</p><div className="grid gap-4 md:grid-cols-2">{[
        ['settings', 'Сборка и ресурсы', 'Источник, ветка, Dockerfile, порт, HTTP-проверка и лимиты.'],
        ['domains', 'Домены', 'Основной адрес и дополнительные домены сайта.'],
        ['env', 'Переменные окружения', 'Зашифрованные секреты и параметры приложения.'],
        ['logs', 'Логи приложения', 'Текущий runtime-вывод активного контейнера.'],
      ].map(([id, title, description]) => <button key={id} disabled={id !== 'logs' && locked} onClick={() => setModal(id as 'settings' | 'domains' | 'env' | 'logs')} className="rounded-2xl border border-line p-6 text-left hover:border-fg disabled:opacity-50"><span className="block text-lg font-medium">{title} ↗</span><span className="mt-2 block text-sm leading-relaxed text-muted">{description}</span></button>)}</div></section>}
      {modal === 'settings' && <ProjectDeployDialog project={current} busy={busy} onClose={() => setModal(null)} onSaved={setProject} onDeploy={() => void action('deploy', true)} />}
      {modal === 'env' && <EnvModal project={current} onClose={() => setModal(null)} onRedeploy={() => void action('deploy')} />}
      {modal === 'domains' && <DomainsModal project={current} onClose={() => setModal(null)} onUpdated={setProject} />}
      {modal === 'logs' && <LogsModal project={current} onClose={() => setModal(null)} />}
    </>}
  </div>
}
