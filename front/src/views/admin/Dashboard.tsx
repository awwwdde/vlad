'use client'

import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { api, ApiError } from '@/admin/api'
import type { MetricsOverview, Project } from '@/admin/types'
import { bytes, percent } from '@/admin/charts/format'
import { ErrorNote, PageHeader, Stat, StatusBadge } from '@/admin/ui'
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

  useEffect(() => {
    api<Project[]>('/api/projects')
      .then(setProjects)
      .catch(e => setError(String(e.message ?? e)))
    // Сводка нагрузки живёт отдельным запросом: если сборщик метрик ещё не
    // накопил данных, дашборд всё равно должен показать список стендов.
    api<MetricsOverview>('/api/metrics/overview')
      .then(setLoad)
      .catch(() => setLoad(null))
  }, [])

  const attention = (load?.projects ?? []).filter(p => p.attention)

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Дашборд" subtitle="Сводка по стендам: сколько их и сколько они едят." />

      {error && <ErrorNote>{error}</ErrorNote>}

      <ComingSoonToggle />

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
                  to="/projects"
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
                <span className="text-[16px] font-medium tracking-tight text-fg">{p.slug}</span>
                <span className="ml-3 font-ui text-[13px] text-muted">{p.domain}</span>
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
