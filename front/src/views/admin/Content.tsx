'use client'

import { useEffect, useMemo, useState } from 'react'
import { api, ApiError } from '@/admin/api'
import { AdminButton, ErrorNote, INPUT_CLASS, PageHeader } from '@/admin/ui'
import { cn } from '@/lib/cn'
import { SECTION_LABELS, humanizeKey } from './contentLabels'
import {
  collectLeaves,
  countEmpty,
  getAt,
  matches,
  setAt,
  type JsonValue,
} from './contentTree'

/**
 * Редактор текстов сайта.
 *
 * Документ переводов - произвольный JSON, поэтому форма собирается по нему
 * рекурсивно: строка становится полем, объект - группой, массив - списком.
 * Писать руками форму под каждую секцию долго, а править сырой JSON неудобно;
 * автоформа закрывает почти любую правку копирайта без изменений схемы.
 *
 * Что здесь сверх автоформы и зачем:
 *
 *   - Оба языка грузятся сразу. Перевод вслепую - это угадывание, поэтому под
 *     каждым полем видно, что написано на втором языке, а в списке разделов
 *     сразу считается, сколько строк осталось пустыми.
 *   - Поиск по тексту, а не только по ключу. Редактор помнит фразу с сайта,
 *     а не имя ключа под ней.
 *   - Несохранённое помечено. Раньше можно было поправить три раздела, уйти со
 *     страницы и не узнать, что ничего не сохранилось.
 */
type Lang = 'ru' | 'en'
const LANGS: Lang[] = ['ru', 'en']

interface Bundle {
  lang: string
  data: Record<string, JsonValue>
  updated_at: string
}

type Bundles = Record<Lang, Record<string, JsonValue>>

// Канал оповещения публички и соседних вкладок админки.
const channel =
  typeof window !== 'undefined' && 'BroadcastChannel' in window
    ? new BroadcastChannel('awwwdde.translations')
    : null

export default function Content() {
  const [lang, setLang] = useState<Lang>('ru')
  const [section, setSection] = useState<string | null>(null)
  const [query, setQuery] = useState('')

  const [data, setData] = useState<Bundles | null>(null)
  /** Снимок с сервера. По нему определяется, что именно не сохранено. */
  const [saved, setSaved] = useState<Bundles | null>(null)
  const [updatedAt, setUpdatedAt] = useState<string | null>(null)

  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let cancelled = false
    Promise.all(LANGS.map(l => api<Bundle>(`/api/content/translations/${l}`)))
      .then(([ru, en]) => {
        if (cancelled) return
        const loaded: Bundles = { ru: ru.data, en: en.data }
        setData(loaded)
        // Глубокая копия: снимок не должен меняться вместе с правками.
        setSaved(JSON.parse(JSON.stringify(loaded)))
        setUpdatedAt(ru.updated_at)
        setSection(prev => prev ?? Object.keys(ru.data)[0] ?? null)
      })
      .catch(e => {
        if (!cancelled) setError(e instanceof ApiError ? e.message : String(e))
      })
    return () => {
      cancelled = true
    }
  }, [])

  const sections = useMemo(() => (data ? Object.keys(data[lang]) : []), [data, lang])
  const other: Lang = lang === 'ru' ? 'en' : 'ru'

  /** Разделы с несохранёнными правками, по обоим языкам. */
  const dirty = useMemo(() => {
    if (!data || !saved) return new Set<string>()
    const out = new Set<string>()
    for (const l of LANGS) {
      for (const key of Object.keys(data[l])) {
        if (JSON.stringify(data[l][key]) !== JSON.stringify(saved[l]?.[key])) out.add(key)
      }
    }
    return out
  }, [data, saved])

  const dirtyLangs = useMemo(() => {
    if (!data || !saved) return [] as Lang[]
    return LANGS.filter(l => JSON.stringify(data[l]) !== JSON.stringify(saved[l]))
  }, [data, saved])

  // Предупреждение при закрытии вкладки. Уход по внутренней ссылке этим не
  // ловится, поэтому несохранённое дополнительно помечено в списке разделов.
  useEffect(() => {
    if (dirtyLangs.length === 0) return
    const warn = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirtyLangs.length])

  function patch(path: string[], value: JsonValue) {
    setData(d =>
      d ? { ...d, [lang]: setAt(d[lang], path, value) as Record<string, JsonValue> } : d,
    )
  }

  async function save() {
    if (!data || dirtyLangs.length === 0) return
    setBusy(true)
    setError(null)
    try {
      // Сохраняем оба языка, если правились оба: иначе переключение языка
      // между правкой и нажатием «Сохранить» тихо теряло бы половину работы.
      for (const l of dirtyLangs) {
        const r = await api<Bundle>(`/api/content/translations/${l}`, {
          method: 'PUT',
          body: { data: data[l] },
        })
        setUpdatedAt(r.updated_at)
      }
      setSaved(JSON.parse(JSON.stringify(data)))
      channel?.postMessage({ type: 'invalidate' })
    } catch (e) {
      setError(e instanceof ApiError ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  const results = useMemo(() => {
    if (!data || !query.trim()) return null
    return collectLeaves(data[lang]).filter(l => matches(l, query))
  }, [data, lang, query])

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Контент"
        subtitle="Тексты сайта: заголовки, кнопки, подписи. Сохранение применяется сразу, без пересборки."
        action={
          <div className="flex items-center gap-4">
            <span className="font-ui text-[12px] text-muted">
              {dirtyLangs.length > 0
                ? `не сохранено: ${dirty.size} ${plural(dirty.size, 'раздел', 'раздела', 'разделов')}`
                : updatedAt
                  ? `сохранено ${new Date(updatedAt).toLocaleString('ru-RU')}`
                  : ''}
            </span>
            <AdminButton
              variant="primary"
              onClick={save}
              busy={busy}
              disabled={dirtyLangs.length === 0}
            >
              Сохранить
            </AdminButton>
          </div>
        }
      />

      {error && <ErrorNote>{error}</ErrorNote>}

      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          {LANGS.map(l => (
            <button
              key={l}
              type="button"
              onClick={() => setLang(l)}
              aria-pressed={lang === l}
              className={cn(
                'rounded-full px-4 py-1.5 font-ui text-[13px] font-medium transition-colors duration-200',
                lang === l ? 'bg-fg text-bg' : 'border border-line text-muted hover:text-fg',
              )}
            >
              {l === 'ru' ? 'Русский' : 'English'}
            </button>
          ))}
        </div>

        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Поиск по тексту или ключу"
          className={cn(INPUT_CLASS, 'max-w-md flex-1')}
        />
      </div>

      {data === null && !error && (
        <p className="font-ui text-[13px] text-muted">Загрузка…</p>
      )}

      {data && results && (
        <SearchResults
          results={results}
          data={data}
          other={other}
          query={query}
          onPatch={patch}
          onOpenSection={key => {
            setQuery('')
            setSection(key)
          }}
        />
      )}

      {data && !results && (
        <div className="flex flex-col gap-8 lg:flex-row lg:gap-10">
          <nav className="flex shrink-0 flex-col lg:sticky lg:top-10 lg:h-fit lg:w-64">
            {sections.map(key => {
              const meta = SECTION_LABELS[key]
              const empty = countEmpty(data[lang][key])
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSection(key)}
                  className={cn(
                    'flex items-baseline justify-between gap-3 border-t border-line py-3 text-left transition-colors duration-200',
                    section === key ? 'text-fg' : 'text-muted hover:text-fg',
                  )}
                >
                  <span>
                    <span className="block text-[15px] font-medium tracking-tight">
                      {meta?.title ?? key}
                    </span>
                    <span className="mt-0.5 block font-ui text-[12px] text-muted">
                      {meta?.hint ?? key}
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    {empty > 0 && (
                      <span
                        className="font-ui text-[12px] text-warning"
                        title={`пустых строк: ${empty}`}
                      >
                        {empty}
                      </span>
                    )}
                    {dirty.has(key) && (
                      <span
                        aria-label="есть несохранённые правки"
                        className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent"
                      />
                    )}
                  </span>
                </button>
              )
            })}
          </nav>

          <div className="min-w-0 flex-1">
            {section && (
              <>
                <div className="border-t border-line pt-5">
                  <h2 className="text-[22px] font-semibold tracking-[-0.02em]">
                    {SECTION_LABELS[section]?.title ?? section}
                  </h2>
                  <p className="mt-1 font-ui text-[13px] text-muted">
                    {SECTION_LABELS[section]?.hint ?? `Раздел «${section}»`}
                  </p>
                </div>

                <div className="mt-7 flex flex-col gap-6">
                  <ValueEditor
                    value={data[lang][section]}
                    path={[section]}
                    otherRoot={data[other]}
                    otherLang={other}
                    onChange={v => patch([section], v)}
                  />
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Результаты поиска ────────────────────────────────────────────────────────

function SearchResults({
  results,
  data,
  other,
  query,
  onPatch,
  onOpenSection,
}: {
  results: ReturnType<typeof collectLeaves>
  data: Bundles
  other: Lang
  query: string
  onPatch: (path: string[], value: JsonValue) => void
  onOpenSection: (key: string) => void
}) {
  if (results.length === 0) {
    return (
      <p className="border-t border-line pt-5 font-ui text-[13px] text-muted">
        По запросу «{query}» ничего не нашлось.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      <p className="font-ui text-[13px] text-muted">
        Найдено: {results.length} {plural(results.length, 'строка', 'строки', 'строк')}
      </p>
      {results.slice(0, 60).map(leaf => (
        <div key={leaf.path.join('.')} className="border-t border-line pt-4">
          <button
            type="button"
            onClick={() => onOpenSection(leaf.path[0])}
            className="font-ui text-[12px] text-muted underline decoration-line underline-offset-4 transition-colors duration-200 hover:text-fg"
          >
            {SECTION_LABELS[leaf.path[0]]?.title ?? leaf.path[0]}
          </button>
          <div className="mt-2">
            <StringField
              label={humanizeKey(leaf.path[leaf.path.length - 1])}
              rawKey={leaf.path.join('.')}
              value={leaf.value}
              otherValue={asString(getAt(data[other], leaf.path))}
              otherLang={other}
              onChange={v => onPatch(leaf.path, v)}
            />
          </div>
        </div>
      ))}
      {results.length > 60 && (
        <p className="font-ui text-[13px] text-muted">
          Показаны первые 60. Уточни запрос, чтобы увидеть остальные.
        </p>
      )}
    </div>
  )
}

// ── Рекурсивный редактор значения ────────────────────────────────────────────

function ValueEditor({
  value,
  onChange,
  path,
  otherRoot,
  otherLang,
  label,
}: {
  value: JsonValue
  onChange: (v: JsonValue) => void
  path: string[]
  otherRoot: Record<string, JsonValue>
  otherLang: Lang
  label?: string
}) {
  const key = path[path.length - 1]

  if (typeof value === 'string') {
    return (
      <StringField
        label={label ?? humanizeKey(key)}
        rawKey={path.join('.')}
        value={value}
        otherValue={asString(getAt(otherRoot, path))}
        otherLang={otherLang}
        onChange={onChange}
      />
    )
  }

  if (typeof value === 'number' || typeof value === 'boolean' || value === null) {
    return (
      <Shell label={label ?? humanizeKey(key)} rawKey={path.join('.')}>
        <input
          value={value === null ? '' : String(value)}
          onChange={e => {
            const v = e.target.value
            if (typeof value === 'number') onChange(v === '' ? 0 : Number(v))
            else if (typeof value === 'boolean') onChange(v === 'true')
            else onChange(v || null)
          }}
          className={INPUT_CLASS}
        />
      </Shell>
    )
  }

  if (Array.isArray(value)) {
    const allStrings = value.every(v => typeof v === 'string')
    if (allStrings) {
      return (
        <Shell
          label={label ?? humanizeKey(key)}
          rawKey={path.join('.')}
          hint="несколько значений через запятую"
        >
          <input
            value={(value as string[]).join(', ')}
            onChange={e =>
              onChange(
                e.target.value
                  .split(',')
                  .map(s => s.trim())
                  .filter(Boolean),
              )
            }
            className={INPUT_CLASS}
          />
        </Shell>
      )
    }

    return (
      <fieldset className="flex flex-col gap-4 border-l border-line pl-5">
        <legend className="font-ui text-[13px] font-medium text-fg">
          {label ?? humanizeKey(key)}{' '}
          <span className="font-normal text-muted">— {value.length} шт.</span>
        </legend>
        {value.map((v, idx) => (
          <div key={idx} className="flex flex-col gap-3 border-t border-line pt-4">
            <div className="flex items-center justify-between">
              <span className="font-ui text-[12px] text-muted">№ {idx + 1}</span>
              <div className="flex gap-1">
                <SmallBtn
                  disabled={idx === 0}
                  label="выше"
                  onClick={() => {
                    const next = [...value]
                    ;[next[idx - 1], next[idx]] = [next[idx], next[idx - 1]]
                    onChange(next)
                  }}
                >
                  ↑
                </SmallBtn>
                <SmallBtn
                  disabled={idx === value.length - 1}
                  label="ниже"
                  onClick={() => {
                    const next = [...value]
                    ;[next[idx + 1], next[idx]] = [next[idx], next[idx + 1]]
                    onChange(next)
                  }}
                >
                  ↓
                </SmallBtn>
                <SmallBtn
                  danger
                  label="удалить"
                  onClick={() => onChange(value.filter((_, i) => i !== idx))}
                >
                  ×
                </SmallBtn>
              </div>
            </div>
            <ValueEditor
              value={v}
              path={[...path, String(idx)]}
              otherRoot={otherRoot}
              otherLang={otherLang}
              onChange={nv => {
                const next = [...value]
                next[idx] = nv
                onChange(next)
              }}
            />
          </div>
        ))}
        <button
          type="button"
          onClick={() => {
            // Клонируем последний элемент, чтобы новый имел ту же форму,
            // и очищаем в нём строки.
            const template = value.length
              ? JSON.parse(JSON.stringify(value[value.length - 1]))
              : ''
            onChange([...value, clearStrings(template)])
          }}
          className="self-start font-ui text-[13px] text-muted transition-colors duration-200 hover:text-fg"
        >
          + добавить
        </button>
      </fieldset>
    )
  }

  if (typeof value === 'object' && value !== null) {
    const entries = Object.entries(value)
    const nested = path.length > 1
    return (
      <fieldset
        className={cn('flex flex-col gap-6', nested && 'border-l border-line pl-5')}
      >
        {nested && (
          <legend className="font-ui text-[13px] font-medium text-fg">
            {label ?? humanizeKey(key)}
          </legend>
        )}
        {entries.map(([k, v]) => (
          <ValueEditor
            key={k}
            value={v as JsonValue}
            path={[...path, k]}
            otherRoot={otherRoot}
            otherLang={otherLang}
            onChange={nv =>
              onChange({ ...(value as Record<string, JsonValue>), [k]: nv })
            }
          />
        ))}
      </fieldset>
    )
  }

  return null
}

// ── Поле строки ──────────────────────────────────────────────────────────────

function StringField({
  label,
  rawKey,
  value,
  otherValue,
  otherLang,
  onChange,
}: {
  label: string
  rawKey: string
  value: string
  otherValue: string | null
  otherLang: Lang
  onChange: (v: string) => void
}) {
  // Многострочное поле для длинного текста: абзац в однострочном input
  // редактируется вслепую, видно три слова из тридцати.
  const long = value.length > 80 || value.includes('\n')

  return (
    <Shell label={label} rawKey={rawKey} empty={value.trim() === ''}>
      {long ? (
        <textarea
          value={value}
          onChange={e => onChange(e.target.value)}
          rows={Math.min(8, Math.max(3, value.split('\n').length + 1))}
          className={cn(INPUT_CLASS, 'resize-y leading-relaxed')}
        />
      ) : (
        <input value={value} onChange={e => onChange(e.target.value)} className={INPUT_CLASS} />
      )}

      {/* Что стоит на втором языке. Без этого перевод делается вслепую,
          а пропущенная строка ничем себя не выдаёт. */}
      {otherValue !== null && (
        <p className="font-ui text-[12px] leading-relaxed text-muted">
          <span className="uppercase">{otherLang}</span>
          {': '}
          {otherValue.trim() === '' ? (
            <span className="text-warning">пусто</span>
          ) : (
            otherValue
          )}
        </p>
      )}
    </Shell>
  )
}

function Shell({
  label,
  rawKey,
  hint,
  empty,
  children,
}: {
  label: string
  rawKey: string
  hint?: string
  empty?: boolean
  children: React.ReactNode
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
        <span className="font-ui text-[13px] font-medium text-fg">{label}</span>
        {/* Сырой ключ оставлен: по нему ищут в коде, когда правка касается
            не текста, а того, где он выводится. */}
        <span className="font-mono text-[11px] text-muted">{rawKey}</span>
        {empty && <span className="font-ui text-[12px] text-warning">не заполнено</span>}
        {hint && <span className="font-ui text-[12px] text-muted">{hint}</span>}
      </span>
      {children}
    </label>
  )
}

function SmallBtn({
  children,
  onClick,
  disabled,
  danger,
  label,
}: {
  children: React.ReactNode
  onClick: () => void
  disabled?: boolean
  danger?: boolean
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={cn(
        'flex h-7 w-7 items-center justify-center rounded-full border border-line text-[13px] transition-colors duration-200 disabled:opacity-30',
        danger ? 'text-danger hover:border-danger/50' : 'text-muted hover:text-fg',
      )}
    >
      {children}
    </button>
  )
}

// ── Мелочи ───────────────────────────────────────────────────────────────────

function asString(v: JsonValue | undefined): string | null {
  return typeof v === 'string' ? v : null
}

/** Рекурсивно очищает строки — шаблон нового элемента массива. */
function clearStrings(v: JsonValue): JsonValue {
  if (typeof v === 'string') return ''
  if (Array.isArray(v)) return v.map(clearStrings)
  if (v && typeof v === 'object') {
    const out: Record<string, JsonValue> = {}
    for (const [k, val] of Object.entries(v)) out[k] = clearStrings(val as JsonValue)
    return out
  }
  return v
}

function plural(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return one
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few
  return many
}
