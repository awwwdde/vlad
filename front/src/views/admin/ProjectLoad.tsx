'use client'

import { useEffect, useState } from 'react'
import { api } from '@/admin/api'
import type { MetricRange, Metrics, ProjectHealth } from '@/admin/types'
import { TimeAreaChart } from '@/admin/charts/TimeAreaChart'
import { ago, bytes, bytesPerSecond, percent, timeFull } from '@/admin/charts/format'
import { Stat, StatusBadge } from '@/admin/ui'
import { cn } from '@/lib/cn'

/**
 * Вкладка «Нагрузка» в карточке стенда.
 *
 * Три величины - три графика на одной оси каждый. Свести память и CPU в один
 * кадр двумя шкалами было бы соблазнительно и неправильно: при двух шкалах
 * взаимное положение линий ничего не значит, его можно подогнать под любой
 * вывод.
 *
 * Сверху плитки с ответом на вопрос «всё ли в порядке», ниже графики с ответом
 * «что именно происходило». Порядок не случайный: на карточку заходят с первым
 * вопросом, а ко второму переходят, только если первый ответ не понравился.
 */
const RANGES: Array<{ id: MetricRange; label: string }> = [
  { id: '1h', label: 'час' },
  { id: '24h', label: 'сутки' },
  { id: '7d', label: 'неделя' },
  { id: '30d', label: 'месяц' },
]

export function ProjectLoad({ slug }: { slug: string }) {
  const [range, setRange] = useState<MetricRange>('24h')
  // Данные лежат вместе с ключом запроса, которому принадлежат. Так «идёт
  // загрузка» выводится сравнением ключей, а не отдельным флагом, который
  // пришлось бы взводить прямо в эффекте - и старые графики не мигают
  // пустотой, пока едут новые.
  const [data, setData] = useState<{
    key: string
    metrics: Metrics
    health: ProjectHealth
  } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const key = `${slug}|${range}`
  const loading = data?.key !== key

  useEffect(() => {
    let cancelled = false

    Promise.all([
      api<Metrics>(`/api/projects/${slug}/metrics`, { query: { range } }),
      api<ProjectHealth>(`/api/projects/${slug}/health`, { query: { range } }),
    ])
      .then(([m, h]) => {
        if (cancelled) return
        setData({ key: `${slug}|${range}`, metrics: m, health: h })
        setError(null)
      })
      .catch(e => {
        if (!cancelled) setError(e.message ?? String(e))
      })

    return () => {
      cancelled = true
    }
  }, [slug, range])

  const metrics = data?.metrics ?? null
  const health = data?.health ?? null
  const step = metrics?.step_seconds ?? 60
  const series = metrics?.series ?? []

  return (
    <div className="flex flex-col gap-8">
      {/* Переключатель периода один на все графики: разные периоды у соседних
          кадров сделали бы их несопоставимыми. */}
      <div className="flex flex-wrap items-center gap-2">
        {RANGES.map(r => (
          <button
            key={r.id}
            type="button"
            onClick={() => setRange(r.id)}
            aria-pressed={range === r.id}
            className={cn(
              'rounded-full px-3.5 py-1.5 font-ui text-[13px] font-medium transition-colors duration-200',
              range === r.id
                ? 'bg-fg text-bg'
                : 'border border-line text-muted hover:text-fg',
            )}
          >
            {r.label}
          </button>
        ))}
        {loading && <span className="font-ui text-[12px] text-muted">обновляю…</span>}
      </div>

      {error && (
        <p role="alert" className="font-ui text-[13px] text-danger">
          {error}
        </p>
      )}

      <div className="grid grid-cols-2 gap-x-8 gap-y-4 md:grid-cols-4">
        <Stat
          label="Состояние"
          value={
            <StatusBadge
              className="text-[20px]"
              label={health?.state ?? '—'}
              tone={health?.state === 'running' ? 'good' : health?.state ? 'critical' : 'neutral'}
            />
          }
        />
        <Stat
          label="Аптайм за период"
          value={percent(health?.uptime_percent)}
          tone={
            health?.uptime_percent == null
              ? 'neutral'
              : health.uptime_percent >= 99
                ? 'good'
                : health.uptime_percent >= 90
                  ? 'warning'
                  : 'critical'
          }
        />
        <Stat
          label="Рестартов"
          value={health?.restarts ?? 0}
          tone={(health?.restarts ?? 0) > 0 ? 'warning' : 'neutral'}
          hint={(health?.restarts ?? 0) > 0 ? 'циклический перезапуск?' : undefined}
        />
        <Stat label="Размер БД" value={bytes(health?.db_size_bytes)} />
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <TimeAreaChart
          title="Процессор"
          series={series}
          selector={p => p.cpu}
          format={v => `${v.toFixed(v < 10 ? 1 : 0)}%`}
          stepSeconds={step}
          hint={
            metrics?.resolution === 'hourly'
              ? 'среднее за час; пик виден в подсказке'
              : undefined
          }
        />
        <TimeAreaChart
          title="Память"
          series={series}
          selector={p => p.mem}
          format={bytes}
          stepSeconds={step}
        />
        <TimeAreaChart
          title="Сеть: приём"
          series={series}
          selector={p => p.net_rx}
          format={v => bytesPerSecond(v, step)}
          stepSeconds={step}
          hint="скорость, а не показание счётчика"
        />
        <TimeAreaChart
          title="Сеть: отдача"
          series={series}
          selector={p => p.net_tx}
          format={v => bytesPerSecond(v, step)}
          stepSeconds={step}
        />
      </div>

      <div>
        <h4 className="font-ui text-[13px] font-medium tracking-tight text-fg">События</h4>
        {health && health.events.length > 0 ? (
          <ul className="mt-3 flex flex-col">
            {health.events.slice(0, 8).map(e => (
              <li
                key={`${e.at}-${e.state}`}
                className="flex flex-wrap items-baseline gap-x-4 gap-y-1 border-t border-line py-2.5"
              >
                <StatusBadge
                  label={e.state}
                  tone={e.state === 'running' ? 'good' : 'critical'}
                />
                <span className="font-ui text-[13px] text-muted">{timeFull(e.at)}</span>
                <span className="font-ui text-[12px] text-muted">{ago(e.at)}</span>
                {e.restarts > 0 && (
                  <span className="font-ui text-[12px] text-warning">
                    рестартов: {e.restarts}
                  </span>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 border-t border-line pt-3 font-ui text-[13px] text-muted">
            За период состояние не менялось.
          </p>
        )}
      </div>
    </div>
  )
}
