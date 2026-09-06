/** Обход дерева переводов: поиск, адресация по пути, счёт пустых строк. */

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [k: string]: JsonValue }

export interface Leaf {
  /** Путь от корня бандла: ['home', 'cta_title']. */
  path: string[]
  value: string
}

/** Все строковые листья документа. Поиск и подсчёт пропусков работают только
 *  по строкам: числа и флаги в переводах не редактируются глазами. */
export function collectLeaves(value: JsonValue, path: string[] = []): Leaf[] {
  if (typeof value === 'string') return [{ path, value }]
  if (Array.isArray(value)) {
    return value.flatMap((v, i) => collectLeaves(v, [...path, String(i)]))
  }
  if (value && typeof value === 'object') {
    return Object.entries(value).flatMap(([k, v]) => collectLeaves(v as JsonValue, [...path, k]))
  }
  return []
}

export function getAt(root: JsonValue, path: string[]): JsonValue | undefined {
  let cur: JsonValue | undefined = root
  for (const step of path) {
    if (cur === null || cur === undefined) return undefined
    if (Array.isArray(cur)) cur = cur[Number(step)]
    else if (typeof cur === 'object') cur = (cur as Record<string, JsonValue>)[step]
    else return undefined
  }
  return cur
}

/** Копия документа с заменённым значением по пути. Мутировать нельзя:
 *  на исходном снимке держится определение несохранённых правок. */
export function setAt(root: JsonValue, path: string[], value: JsonValue): JsonValue {
  if (path.length === 0) return value
  const [head, ...rest] = path

  if (Array.isArray(root)) {
    const next = [...root]
    const i = Number(head)
    next[i] = setAt(next[i] ?? null, rest, value)
    return next
  }

  const obj = (root && typeof root === 'object' ? root : {}) as Record<string, JsonValue>
  return { ...obj, [head]: setAt(obj[head] ?? null, rest, value) }
}

/** Совпадение по ключу или по самому тексту. Искать по тексту важнее:
 *  редактор помнит фразу на сайте, а не имя ключа под ней. */
export function matches(leaf: Leaf, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return (
    leaf.value.toLowerCase().includes(q) ||
    leaf.path.join('.').toLowerCase().includes(q)
  )
}

/** Сколько строк раздела пустые - столько мест на сайте останутся без текста. */
export function countEmpty(section: JsonValue): number {
  return collectLeaves(section).filter(l => l.value.trim() === '').length
}
