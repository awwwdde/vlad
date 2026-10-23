'use client'

import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { api, ApiError } from '@/admin/api'
import type { MetricsOverview, Project } from '@/admin/types'
import { bytes, percent } from '@/admin/charts/format'
import { ErrorNote, PageHeader, Stat, StatusBadge } from '@/admin/ui'
import { ServerDiagnostics } from './ServerDiagnostics'
import { STATUS_META } from './projectStatus'

// Тоже самое имя канала и того же ключа, что и в front public (useSiteSettings).
// При тоггле — оповещаем все вкладки (включая публику) перечитать настройки.
const SITE_CHANNEL =
  typeof window !== 'undefined' && 'BroadcastChannel' in window
    ? new BroadcastChannel('awwwdde.site')
    : null

export default function Dashboard() {
  const [projects, setProjects] = useState<Project[] | null>(null)
  const [load, setLoad] = useState<MetricsOverview | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [metricsError, setMetricsError] = useState(false)

  useEffect(() => {
    let cancelled = false, pending = false
    const controller = new AbortController()
    const reload = async () => {
      if (pending || document.hidden) return
      pending = true
      const [sites, metrics] = await Promise.allSettled([
        api<Project[]>('/api/projects', { signal: controller.signal }),
        api<MetricsOverview>('/api/metrics/overview', { signal: controller.signal }),
      ])
      pending = false
      if (cancelled) return
      if (sites.status === 'fulfilled') { setProjects(sites.value); setError(null) }
      else setError(sites.reason instanceof Error ? sites.reason.message : String(sites.reason))
      if (metrics.status === 'fulfilled') { setLoad(metrics.value); setMetricsError(false) }
      else { setLoad(null); setMetricsError(true) }
    }
    void reload()
    const timer = window.setInterval(reload, 15000)
    document.addEventListener('visibilitychange', reload)
    return () => { cancelled = true; controller.abort(); clearInterval(timer); document.removeEventListener('visibilitychange', reload) }
  }, [])

  const attention = (load?.projects ?? []).filter(p => p.attention)

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Дашборд" subtitle="Сводка по стендам: сколько их и сколько они едят." />

      {error && <ErrorNote>{error}</ErrorNote>}

      <ComingSoonToggle />
      <ServerDiagnostics />
      <div className="grid gap-4 md:grid-cols-3">{[
        ['/content', 'Тексты RU / EN', 'Главная, About, контакты, списки инструментов и пасхалки.'],
        ['/settings', 'Настройки сайта', 'Ссылки, почта, ASCII-фоны и сведения для формы обращений.'],
        ['/portfolio', 'Работы портфолио', 'Обложки, галереи, описания и порядок проектов.'],
      ].map(([to, title, description]) => <Link key={to} to={to} className="rounded-2xl border border-line p-5 transition-colors hover:bg-white/30"><span className="block text-lg font-medium tracking-tight">{title} ↗</span><span className="mt-2 block text-sm leading-relaxed text-muted">{description}</span></Link>)}</div>
      {metricsError && <p role="status" className="text-sm text-warning">Метрики недоступны. Состояние ресурсов не подтверждено; список сайтов загружается отдельно.</p>}

      {load?.warning && <p role="status" className="rounded-xl border border-warning/30 p-4 text-sm text-warning">{load.warning}</p>}

      {/* Четыре числа вместо шести счётчиков по статусам. Прежняя сетка
          отвечала на вопрос «сколько чего в каком состоянии», который никто
          не задаёт; спрашивают «всё ли живо» и «сколько это ест». */}
      <div className="grid grid-cols-2 gap-x-8 gap-y-4 md:grid-cols-4">
        <Stat label="Стендов" value={load?.projects_total ?? projects?.length ?? '—'} />
        <Stat
          label="Работают"
          value={load?.projects_running ?? '—'}
          tone={load && load.projects_running > 0 ? 'good' : 'neutral'}
        />
        <Stat label="Процессор, всего" value={percent(load?.cpu_percent_total)} />
        <Stat label="Память, всего" value={bytes(load?.mem_bytes_total)} />
      </div>

      {attention.length > 0 && (
        <section>
          <h2 className="font-ui text-[13px] font-medium tracking-tight text-fg">
            Требуют внимания
          </h2>
          <ul className="mt-3 flex flex-col">
            {attention.map(p => (
              <li
                key={p.slug}
                className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-t border-line py-3"
              >
                <Link
                  to={`/projects/${p.slug}`}
                  className="text-[16px] font-medium tracking-tight text-fg underline decoration-line underline-offset-4"
                >
                  {p.slug}
                </Link>
                <span className="font-ui text-[13px] text-warning">{p.attention}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="font-ui text-[13px] font-medium tracking-tight text-fg">Стенды</h2>
          <Link
            to="/projects"
            className="font-ui text-[13px] text-muted transition-colors duration-200 hover:text-fg"
          >
            все
          </Link>
        </div>
        <ul className="mt-3 flex flex-col">
          {(projects ?? []).slice(0, 6).map(p => (
            <li
              key={p.id}
              className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-t border-line py-3"
            >
              <span>
                <Link to={`/projects/${p.slug}`} className="text-[16px] font-medium tracking-tight text-fg hover:underline">{p.slug}</Link>
                <a href={`https://${p.domain}`} target="_blank" rel="noopener noreferrer" className="ml-3 break-all font-ui text-[13px] text-muted underline decoration-line underline-offset-4 hover:text-fg">{p.domain} ↗</a>
              </span>
              <StatusBadge
                label={STATUS_META[p.status].label}
                tone={STATUS_META[p.status].tone}
              />
            </li>
          ))}
          {projects && projects.length === 0 && (
            <li className="border-t border-line py-6 text-center font-ui text-[13px] text-muted">
              Ещё нет ни одного стенда
            </li>
          )}
        </ul>
      </section>
    </div>
  )
}

// ── Тоггл «Режим тестов» ───────────────────────────────────────────────────

function ComingSoonToggle() {
  // null = ещё не загрузили; true/false — текущее состояние
  const [enabled, setEnabled] = useState<boolean | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(() => {
    api<Record<string, string>>('/api/site/settings')
      .then(s => setEnabled(s.coming_soon === 'true'))
      .catch(e => setError(e instanceof ApiError ? e.message : String(e)))
  }, [])

  useEffect(() => {
    reload()
  }, [reload])

  async function toggle() {
    if (enabled === null) return
    const next = !enabled
    setBusy(true)
    setError(null)
    // Оптимистично переключаем UI — отыграем назад если PUT упадёт.
    setEnabled(next)
    try {
      await api(`/api/site/settings/coming_soon`, {
        method: 'PUT',
        body: { value: next ? 'true' : 'false' },
      })
      // Оповещаем все открытые вкладки публички — они мгновенно
      // перерисуются в ComingSoon (или обратно).
      SITE_CHANNEL?.postMessage({ type: 'invalidate' })
    } catch (e) {
      setEnabled(!next)
      setError(e instanceof ApiError ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  const isLoading = enabled === null

  return (
    <motion.div
      layout
      className={`rounded-xl border p-5 flex items-center gap-5 ${
        enabled
          ? 'border-warning/40 bg-warning/10'
          : 'border-line bg-bg'
      }`}
    >
      {/* Статус-индикатор */}
      <div className="flex-shrink-0">
        <motion.div
          animate={enabled ? { scale: [1, 1.15, 1], opacity: [0.7, 1, 0.7] } : {}}
          transition={enabled ? { duration: 1.8, repeat: Infinity, ease: 'easeInOut' } : {}}
          className={`w-3 h-3 rounded-full ${
            enabled ? 'bg-warning' : 'bg-good'
          }`}
        />
      </div>

      <div className="flex-1 min-w-0">
        <h2 className="text-sm font-medium text-fg">
          {isLoading
            ? 'Загрузка статуса…'
            : enabled
              ? 'Сайт скрыт: режим тестов'
              : 'Сайт открыт для всех'}
        </h2>
        <p className="text-xs text-muted mt-1 max-w-xl">
          {enabled
            ? 'Обычные посетители видят заглушку ComingSoon. Ты, как админ, и любой по ссылке ?preview — видят полный сайт.'
            : 'Главная и страницы Work/About доступны любому посетителю. Включи режим тестов, если хочешь полировать в тишине.'}
        </p>
      </div>

      <button
        onClick={toggle}
        disabled={busy || isLoading}
        className={`flex-shrink-0 rounded-lg px-4 py-2 text-sm font-medium transition disabled:opacity-50 ${
          enabled
            ? 'bg-good/20 text-fg hover:bg-good/10'
            : 'bg-warning/20 text-fg hover:bg-warning/10'
        }`}
      >
        {busy
          ? '…'
          : enabled
            ? 'Открыть для всех'
            : 'Включить режим тестов'}
      </button>

      {error && (
        <div className="absolute mt-16 text-xs text-danger">{error}</div>
      )}
    </motion.div>
  )
}
