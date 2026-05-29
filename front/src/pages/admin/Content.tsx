import { useEffect, useMemo, useState } from 'react'
import { api, ApiError } from '@/admin/api'

// Универсальный редактор переводов: рендерит произвольный JSON-документ как
// форму, рекурсивно (string → input/textarea, string[] → comma-input,
// объект → fieldset, массив объектов → повторяющиеся подформы).
// Это компромисс: писать кастомные формы под каждую секцию долго; работать
// с raw-JSON неудобно. Автоформа покрывает 95% правок копирайта без правки
// схемы и без зоопарка контроллеров.

type Lang = 'ru' | 'en'
type JsonValue = string | number | boolean | null | JsonValue[] | { [k: string]: JsonValue }

interface Bundle {
  lang: string
  data: Record<string, JsonValue>
  updated_at: string
}

// Канал для оповещения публички и других вкладок админки.
const channel =
  typeof window !== 'undefined' && 'BroadcastChannel' in window
    ? new BroadcastChannel('awwwdde.translations')
    : null

export default function Content() {
  const [lang, setLang] = useState<Lang>('ru')
  const [section, setSection] = useState<string | null>(null)
  const [data, setData] = useState<Record<string, JsonValue> | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [savedAt, setSavedAt] = useState<string | null>(null)

  // Загрузка бандла при смене языка.
  useEffect(() => {
    setData(null)
    setError(null)
    api<Bundle>(`/api/content/translations/${lang}`)
      .then(b => {
        setData(b.data)
        setSavedAt(b.updated_at)
        // Выбрать первую секцию по умолчанию (или сохранить текущую, если
        // она есть в новом бандле).
        const keys = Object.keys(b.data)
        setSection(prev => (prev && keys.includes(prev) ? prev : keys[0] ?? null))
      })
      .catch(e => setError(e instanceof ApiError ? e.message : String(e)))
  }, [lang])

  const sections = useMemo(() => (data ? Object.keys(data) : []), [data])

  function patchSection(key: string, value: JsonValue) {
    setData(d => (d ? { ...d, [key]: value } : d))
  }

  async function save() {
    if (!data) return
    setBusy(true)
    setError(null)
    try {
      const r = await api<Bundle>(`/api/content/translations/${lang}`, {
        method: 'PUT',
        body: { data },
      })
      setSavedAt(r.updated_at)
      channel?.postMessage({ type: 'invalidate' })
    } catch (e) {
      setError(e instanceof ApiError ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-8">
      <header className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Контент</h1>
          <p className="text-sm text-neutral-500 mt-1">
            Тексты секций главного сайта, навигация, футер. Меняется на лету —
            публичка обновится без перезагрузки.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {savedAt && (
            <span className="text-xs text-neutral-500">
              обновлено {new Date(savedAt).toLocaleString('ru-RU')}
            </span>
          )}
          <button
            onClick={save}
            disabled={busy || !data}
            className="rounded-lg bg-neutral-100 px-4 py-2 text-sm font-medium text-neutral-950 hover:bg-white disabled:opacity-50"
          >
            {busy ? 'Сохраняем…' : 'Сохранить'}
          </button>
        </div>
      </header>

      {/* Язык */}
      <div className="flex items-center gap-1 rounded-lg border border-neutral-900 bg-neutral-950 p-1 w-fit">
        {(['ru', 'en'] as const).map(l => (
          <button
            key={l}
            onClick={() => setLang(l)}
            className={`rounded-md px-4 py-1.5 text-sm transition ${
              lang === l ? 'bg-neutral-100 text-neutral-950' : 'text-neutral-400 hover:text-neutral-100'
            }`}
          >
            {l.toUpperCase()}
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded-lg border border-red-900/50 bg-red-950/40 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="flex gap-6 min-h-[500px]">
        {/* Секции — сайдбар */}
        <nav className="w-48 flex-shrink-0 rounded-xl border border-neutral-900 bg-neutral-950 p-2 space-y-0.5 h-fit sticky top-6">
          {data === null && <div className="px-3 py-2 text-sm text-neutral-500">…</div>}
          {sections.map(key => (
            <button
              key={key}
              onClick={() => setSection(key)}
              className={`w-full text-left rounded-md px-3 py-2 text-sm transition ${
                section === key
                  ? 'bg-neutral-900 text-neutral-100'
                  : 'text-neutral-400 hover:bg-neutral-900/60 hover:text-neutral-100'
              }`}
            >
              <code className="font-mono">{key}</code>
            </button>
          ))}
        </nav>

        {/* Форма */}
        <div className="flex-1 rounded-xl border border-neutral-900 bg-neutral-950 p-6 min-w-0">
          {section && data && (
            <ValueEditor
              path={[section]}
              value={data[section]}
              onChange={v => patchSection(section, v)}
            />
          )}
          {data && !section && (
            <div className="text-sm text-neutral-500">Выбери секцию слева</div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Рекурсивный редактор значения ───────────────────────────────────────────

function ValueEditor({
  value,
  onChange,
  path,
  label,
}: {
  value: JsonValue
  onChange: (v: JsonValue) => void
  path: string[]
  label?: string
}) {
  // Строка → input/textarea (зависит от длины и наличия переноса).
  if (typeof value === 'string') {
    const isLong = value.length > 80 || value.includes('\n')
    return (
      <FieldShell label={label} path={path}>
        {isLong ? (
          <textarea
            value={value}
            onChange={e => onChange(e.target.value)}
            rows={Math.min(8, Math.max(2, value.split('\n').length + 1))}
            className="w-full rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm font-mono resize-y"
          />
        ) : (
          <input
            value={value}
            onChange={e => onChange(e.target.value)}
            className="w-full rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm"
          />
        )}
      </FieldShell>
    )
  }

  if (typeof value === 'number' || typeof value === 'boolean' || value === null) {
    return (
      <FieldShell label={label} path={path}>
        <input
          value={value === null ? '' : String(value)}
          onChange={e => {
            const v = e.target.value
            if (typeof value === 'number') onChange(v === '' ? 0 : Number(v))
            else if (typeof value === 'boolean') onChange(v === 'true')
            else onChange(v || null)
          }}
          className="w-full rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm"
        />
      </FieldShell>
    )
  }

  // Массив.
  if (Array.isArray(value)) {
    const allStrings = value.every(v => typeof v === 'string')
    if (allStrings) {
      // Массив строк → один input через запятую (компактно для тегов и т.п.).
      return (
        <FieldShell label={label} path={path} hint="через запятую">
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
            className="w-full rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm"
          />
        </FieldShell>
      )
    }
    // Массив объектов / смешанный → повторяющиеся карточки.
    return (
      <fieldset className="space-y-3 border-l-2 border-neutral-800 pl-4">
        <legend className="text-xs uppercase tracking-wider text-neutral-500">
          {label ?? path[path.length - 1]}{' '}
          <span className="text-neutral-600">[{value.length}]</span>
        </legend>
        {value.map((v, idx) => (
          <div
            key={idx}
            className="rounded-lg border border-neutral-900 bg-neutral-950/40 p-3 space-y-2 relative"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs text-neutral-600">#{idx}</span>
              <div className="flex gap-1">
                <ArrayBtn
                  disabled={idx === 0}
                  onClick={() => {
                    const next = [...value]
                    ;[next[idx - 1], next[idx]] = [next[idx], next[idx - 1]]
                    onChange(next)
                  }}
                >
                  ↑
                </ArrayBtn>
                <ArrayBtn
                  disabled={idx === value.length - 1}
                  onClick={() => {
                    const next = [...value]
                    ;[next[idx + 1], next[idx]] = [next[idx], next[idx + 1]]
                    onChange(next)
                  }}
                >
                  ↓
                </ArrayBtn>
                <ArrayBtn
                  onClick={() => onChange(value.filter((_, i) => i !== idx))}
                  danger
                >
                  ×
                </ArrayBtn>
              </div>
            </div>
            <ValueEditor
              value={v}
              path={[...path, String(idx)]}
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
            // Клонируем последний элемент для сохранения формы (если он есть).
            const template = value.length
              ? JSON.parse(JSON.stringify(value[value.length - 1]))
              : ''
            // Сбрасываем строковые поля у template (чтобы это был пустой элемент).
            const cleared = clearStrings(template)
            onChange([...value, cleared])
          }}
          className="text-xs text-neutral-400 hover:text-neutral-100 px-2 py-1"
        >
          + добавить
        </button>
      </fieldset>
    )
  }

  // Объект.
  if (typeof value === 'object' && value !== null) {
    const entries = Object.entries(value)
    return (
      <fieldset
        className={
          path.length === 1
            ? 'space-y-4'
            : 'space-y-3 border-l-2 border-neutral-800 pl-4'
        }
      >
        {label && (
          <legend className="text-xs uppercase tracking-wider text-neutral-500">
            {label}
          </legend>
        )}
        {entries.map(([k, v]) => (
          <ValueEditor
            key={k}
            label={k}
            value={v as JsonValue}
            path={[...path, k]}
            onChange={nv => onChange({ ...(value as Record<string, JsonValue>), [k]: nv })}
          />
        ))}
      </fieldset>
    )
  }

  return null
}

function FieldShell({
  label,
  path,
  hint,
  children,
}: {
  label?: string
  path: string[]
  hint?: string
  children: React.ReactNode
}) {
  const displayLabel = label ?? path[path.length - 1]
  return (
    <label className="block space-y-1.5">
      <span className="text-xs uppercase tracking-wider text-neutral-500 font-mono">
        {displayLabel}
        {hint && <span className="ml-2 normal-case tracking-normal text-neutral-600">— {hint}</span>}
      </span>
      {children}
    </label>
  )
}

function ArrayBtn(props: {
  children: React.ReactNode
  onClick: () => void
  disabled?: boolean
  danger?: boolean
}) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      disabled={props.disabled}
      className={`w-6 h-6 rounded text-xs hover:bg-neutral-900 disabled:opacity-30 ${
        props.danger ? 'text-red-400 hover:bg-red-950/40' : 'text-neutral-400'
      }`}
    >
      {props.children}
    </button>
  )
}

// Рекурсивно сбрасывает все строки в '' (для шаблона нового элемента массива).
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
