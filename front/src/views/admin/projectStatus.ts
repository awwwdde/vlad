import type { ProjectStatus } from '@/admin/types'

/**
 * Расшифровка статуса проекта.
 *
 * Цвет здесь - не оформление, а семантика состояния, поэтому берётся из
 * статусной группы токенов (--good / --warning / --danger), отдельной от
 * акцента и от палитры графиков. Подпись обязательна: состояние не должно
 * читаться по одному цвету.
 */
export type StatusTone = 'neutral' | 'good' | 'warning' | 'critical'

interface Meta {
  label: string
  tone: StatusTone
}

export const STATUS_META: Record<ProjectStatus, Meta> = {
  created: { label: 'создан', tone: 'neutral' },
  building: { label: 'сборка', tone: 'warning' },
  deploying: { label: 'развёртывание', tone: 'warning' },
  running: { label: 'работает', tone: 'good' },
  stopped: { label: 'остановлен', tone: 'neutral' },
  failed: { label: 'ошибка', tone: 'critical' },
}
