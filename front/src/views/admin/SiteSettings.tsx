'use client'

import { useEffect, useState, type FormEvent } from 'react'
import { api } from '@/admin/api'
import { AdminButton, ErrorNote, Field, INPUT_CLASS, PageHeader } from '@/admin/ui'
import { useUnsavedChanges } from '@/admin/useUnsavedChanges'
import { invalidateSiteSettings } from '@/hooks/useSiteSettings'
import { SITE_DEFAULTS } from '@/lib/siteSettings'

const CONTACTS = [
  ['contact_email', 'Почта для обращений', 'email'],
  ['social_telegram', 'Telegram', 'url'], ['social_github', 'GitHub', 'url'],
  ['social_instagram', 'Instagram', 'url'], ['calculator_url', 'Ссылка кнопки калькулятора', 'text'],
] as const
const PRIVACY = [
  ['operator', 'Оператор', 'Имя / наименование оператора'],
  ['address', 'Адрес для обращений', 'Публичные сведения для документов'],
  ['hosting', 'Размещение сайта и базы', 'Хостинг и место хранения данных'],
  ['recipients', 'Доступ и обработчики', 'Кто имеет доступ и обрабатывает обращения'],
  ['retention', 'Хранение и удаление', 'Сроки, журналы и резервные копии'],
  ['security', 'Меры защиты', 'Фактические меры и порядок реагирования'],
] as const

export default function SiteSettings() {
  const [values, setValues] = useState<Record<string, string> | null>(null)
  const [saved, setSaved] = useState<Record<string, string>>({})
  const [error, setError] = useState(''), [busy, setBusy] = useState(false), [notice, setNotice] = useState('')
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let cancelled = false
    api<Record<string, string>>('/api/site/settings').then(data => {
      if (!cancelled) { const merged = { ...SITE_DEFAULTS, ...data }; setValues(merged); setSaved(merged); setError('') }
    }).catch(error => { if (!cancelled) setError(error.message) })
    return () => { cancelled = true }
  }, [attempt])
  const changed = values ? Object.keys(SITE_DEFAULTS).filter(key => values[key] !== saved[key]) : []
  useUnsavedChanges(changed.length > 0)
  const patch = (key: string, value: string) => {
    setNotice('')
    setValues(current => current ? { ...current, [key]: value, ...((key.startsWith('privacy_') && key !== 'privacy_approved') || key === 'contact_email' ? { privacy_approved: 'false' } : {}) } : current)
  }
  async function save(event: FormEvent) {
    event.preventDefault()
    if (!values || busy || !changed.length) return
    setError(''); setNotice(''); setBusy(true)
    try {
      const data = await api<Record<string, string>>('/api/site/settings', { method: 'PUT', body: { values: Object.fromEntries(changed.map(key => [key, values[key]])) } })
      const merged = { ...SITE_DEFAULTS, ...data }
      setValues(merged); setSaved(merged); invalidateSiteSettings(); setNotice('Настройки опубликованы. Открытые страницы сайта обновятся автоматически.')
    } catch (error) { setError(error instanceof Error ? error.message : String(error)) }
    finally { setBusy(false) }
  }
  return <form onSubmit={save} className="space-y-10">
    <PageHeader title="Настройки сайта" subtitle="Контакты, ссылки, ASCII-фон и сведения для документов. Все значения в этом разделе публичные — не добавляй сюда пароли и токены."
      action={<AdminButton type="submit" variant="primary" busy={busy} disabled={!changed.length}>Опубликовать{changed.length ? ` · ${changed.length}` : ''}</AdminButton>} />
    {error && <ErrorNote>{error}</ErrorNote>}
    {!values ? <div className="flex items-center gap-4 text-muted"><span>{error ? 'Настройки не загружены.' : 'Загрузка…'}</span>{error && <AdminButton type="button" onClick={() => setAttempt(n => n + 1)}>Повторить</AdminButton>}</div> : <fieldset disabled={busy} className="min-w-0 space-y-12">
      {notice && <p role="status" className="rounded-xl border border-good/30 bg-good/5 p-4 text-good">{notice}</p>}
      <SettingsSection title="Контакты и переходы" hint="Почта единая для контактов, футера, главной и документов. Пустая ссылка скрывает соответствующую соцсеть.">
        <div className="grid gap-6 xl:grid-cols-2">{CONTACTS.map(([key, label, type]) => <Field key={key} label={label} hint={key === 'calculator_url' ? 'Внутренний путь /contact или полная http(s)-ссылка' : undefined}><input type={type} required={key === 'contact_email' || key === 'calculator_url'} value={values[key]} onChange={event => patch(key, event.target.value)} className={INPUT_CLASS} /></Field>)}</div>
      </SettingsSection>
      <SettingsSection title="Сцены и доступность" hint="Эффекты сохраняют системную настройку уменьшения движения. Изменения не затрагивают содержимое страниц.">
        <Toggle label="Движение облаков" hint="Небо на главной. Если выключено, остаётся статичный кадр." value={values.sky_animated} onChange={value => patch('sky_animated', value)} />
        <Toggle label="Вращение и переливы модели About" hint="Объёмная лента остаётся видимой и при выключенной анимации." value={values.about_model_animated} onChange={value => patch('about_model_animated', value)} />
        <Toggle label="Движение ASCII-сцены контактов" hint="Символ @ и орбиты. Выключение оставляет статичную сцену." value={values.contact_model_animated} onChange={value => patch('contact_model_animated', value)} />
        <Toggle label="ASCII-модель в результате кейса" hint="Вращение и переливы скульптуры в тёмном блоке результата." value={values.case_model_animated} onChange={value => patch('case_model_animated', value)} />
        <Toggle label="Пасхалка с котом в About" hint="Три быстрых нажатия на блок «Сейчас». Текст блока редактируется в разделе «Контент»." value={values.about_cat_enabled} onChange={value => patch('about_cat_enabled', value)} />
        <Toggle label="ASCII-фон страницы проектов" hint="Объёмная поверхность за заголовком проектов." value={values.work_background} onChange={value => patch('work_background', value)} />
        <Toggle label="Режим «Скоро»" hint="Публичный сайт показывает заглушку. Владелец с административной сессией сохраняет предпросмотр." value={values.coming_soon} onChange={value => patch('coming_soon', value)} />
      </SettingsSection>
      <SettingsSection title="Документы и форма обращений" hint="Заполни фактические сведения, проверь документы и отдельно подтверди их готовность. Изменение сведений снимает прежнее утверждение.">
        <div className="grid gap-6 xl:grid-cols-2">{PRIVACY.map(([key, label, hint]) => <Field key={key} label={label} hint={hint}><textarea rows={3} value={values[`privacy_${key}`]} onChange={event => patch(`privacy_${key}`, event.target.value)} className={`${INPUT_CLASS} resize-y`} /></Field>)}</div>
        <div className="my-6 flex flex-wrap gap-5 text-sm underline underline-offset-4"><a href="/privacy" target="_blank" rel="noopener noreferrer">Открыть опубликованную политику ↗</a><a href="/consent" target="_blank" rel="noopener noreferrer">Открыть опубликованное согласие ↗</a></div>
        <Toggle label="Сведения проверены, документы утверждены" hint="Форма принимает обращения только при заполненных сведениях и явном утверждении. До публикации ссылки выше показывают сохранённую версию." value={values.privacy_approved} onChange={value => patch('privacy_approved', value)} />
      </SettingsSection>
    </fieldset>}
  </form>
}

function SettingsSection({ title, hint, children }: { title: string; hint: string; children: React.ReactNode }) {
  return <section className="grid gap-7 border-t border-line pt-7 xl:grid-cols-[.7fr_1.3fr] xl:gap-12"><div><h2 className="text-2xl font-medium tracking-tight">{title}</h2><p className="mt-3 max-w-[38ch] text-sm leading-relaxed text-muted">{hint}</p></div><div className="min-w-0">{children}</div></section>
}
function Toggle({ label, hint, value, onChange }: { label: string; hint: string; value: string; onChange: (value: string) => void }) {
  return <label className="flex cursor-pointer items-start justify-between gap-5 border-b border-line py-5"><span><span className="block text-base font-medium">{label}</span><span className="mt-1 block text-sm leading-relaxed text-muted">{hint}</span></span><input type="checkbox" checked={value === 'true'} onChange={event => onChange(String(event.target.checked))} className="mt-1 size-5 shrink-0 accent-accent" /></label>
}
