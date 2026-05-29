import type { ProjectStatus } from '@/admin/types'

interface Meta {
  label: string
  text: string  // классы цвета для бейджа
  dim: string   // приглушённый вариант (для дашборда)
}

export const STATUS_META: Record<ProjectStatus, Meta> = {
  created:   { label: 'создан',     text: 'text-neutral-400', dim: 'text-neutral-500' },
  building:  { label: 'сборка',     text: 'text-amber-400',   dim: 'text-amber-500/70' },
  deploying: { label: 'развёртывание', text: 'text-amber-400', dim: 'text-amber-500/70' },
  running:   { label: 'работает',   text: 'text-emerald-400', dim: 'text-emerald-500/70' },
  stopped:   { label: 'остановлен', text: 'text-neutral-400', dim: 'text-neutral-500' },
  failed:    { label: 'ошибка',     text: 'text-red-400',     dim: 'text-red-500/70' },
}
