/** Форматирование величин на графиках и плитках. */

/** Байты в человекочитаемый вид. Один знак после запятой: на осях и в плитках
 *  второй знак ничего не уточняет, а ширину колонки ломает. */
export function bytes(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—'
  if (value < 1024) return `${Math.round(value)} Б`
  const units = ['КБ', 'МБ', 'ГБ', 'ТБ']
  let v = value / 1024
  let i = 0
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024
    i++
  }
  return `${v < 10 ? v.toFixed(1) : Math.round(v)} ${units[i]}`
}

/** Скорость: байты за интервал делим на его длину. */
export function bytesPerSecond(total: number, stepSeconds: number): string {
  if (!stepSeconds) return '—'
  return `${bytes(total / stepSeconds)}/с`
}

export function percent(value: number | null | undefined, digits = 1): string {
  if (value === null || value === undefined) return '—'
  return `${value.toFixed(digits)}%`
}

/** Подпись времени под шаг сетки: на часе нужны минуты, на месяце - дата. */
export function timeLabel(iso: string, stepSeconds: number): string {
  const d = new Date(iso)
  if (stepSeconds <= 3600) {
    return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
  }
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })
}

/** Полная отметка для подсказки под курсором. */
export function timeFull(iso: string): string {
  return new Date(iso).toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** «5 минут назад» - для строки последнего события. */
export function ago(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000
  if (diff < 60) return 'только что'
  if (diff < 3600) return `${Math.floor(diff / 60)} мин назад`
  if (diff < 86400) return `${Math.floor(diff / 3600)} ч назад`
  return `${Math.floor(diff / 86400)} дн назад`
}
