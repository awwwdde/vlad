'use client'

import type { I18nBundle } from '@/admin/types'
import { AdminButton, Field, INPUT_CLASS } from '@/admin/ui'

export function CaseBundleFields({ bundle, onChange }: { bundle: I18nBundle; onChange: (patch: Partial<I18nBundle>) => void }) {
  const steps = bundle.steps ?? []
  return <div className="space-y-7 border-t border-line pt-7">
    <div><h3 className="text-xl font-medium">Полный кейс</h3><p className="mt-2 text-sm leading-relaxed text-muted">Пустые блоки не показываются на сайте. Описывай реальные задачи и результаты; цифры добавляй только при наличии подтверждения.</p></div>
    <div className="grid gap-5 sm:grid-cols-2">{([
      ['client', 'Клиент / контекст'], ['year', 'Год'], ['role', 'Моя роль'], ['duration', 'Срок работы'],
    ] as const).map(([key, label]) => <Field key={key} label={label}><input maxLength={key === 'year' ? 100 : key === 'role' ? 500 : 300} value={bundle[key] ?? ''} onChange={e => onChange({ [key]: e.target.value })} className={INPUT_CLASS} /></Field>)}</div>
    {([['challenge', 'Задача'], ['approach', 'Подход и решение'], ['outcome', 'Результат']] as const).map(([key, label]) => <Field key={key} label={label}><textarea rows={4} maxLength={20000} value={bundle[key] ?? ''} onChange={e => onChange({ [key]: e.target.value })} className={`${INPUT_CLASS} resize-y`} /></Field>)}
    <Field label="Что сделано" hint="Один пункт на строку, до 40 пунктов."><textarea rows={4} value={(bundle.deliverables ?? []).join('\n')} onChange={e => onChange({ deliverables: e.target.value.split('\n') })} className={`${INPUT_CLASS} resize-y`} /></Field>
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4"><h3 className="text-lg font-medium">Этапы работы</h3><AdminButton type="button" disabled={steps.length >= 20} onClick={() => onChange({ steps: [...steps, { title: '', body: '' }] })}>Добавить этап</AdminButton></div>
      {steps.map((step, index) => <fieldset key={index} className="space-y-4 rounded-xl border border-line p-4">
        <legend className="px-2 text-sm text-muted">Этап {index + 1}</legend>
        <Field label="Название этапа"><input maxLength={300} value={step.title} onChange={e => onChange({ steps: steps.map((s, i) => i === index ? { ...s, title: e.target.value } : s) })} className={INPUT_CLASS} /></Field>
        <Field label="Описание этапа"><textarea rows={3} maxLength={10000} value={step.body} onChange={e => onChange({ steps: steps.map((s, i) => i === index ? { ...s, body: e.target.value } : s) })} className={`${INPUT_CLASS} resize-y`} /></Field>
        <div className="flex flex-wrap gap-2"><AdminButton type="button" disabled={index === 0} onClick={() => { const copy = [...steps]; [copy[index - 1], copy[index]] = [copy[index], copy[index - 1]]; onChange({ steps: copy }) }}>Выше</AdminButton><AdminButton type="button" disabled={index === steps.length - 1} onClick={() => { const copy = [...steps]; [copy[index + 1], copy[index]] = [copy[index], copy[index + 1]]; onChange({ steps: copy }) }}>Ниже</AdminButton><AdminButton type="button" variant="danger" onClick={() => onChange({ steps: steps.filter((_, i) => i !== index) })}>Убрать этап</AdminButton></div>
      </fieldset>)}
    </div>
    <Field label="Подписи к изображениям" hint="Одна подпись на строку, в порядке галереи: первая — обложка. После перестановки изображений проверь порядок подписей."><textarea rows={4} value={(bundle.gallery_captions ?? []).join('\n')} onChange={e => onChange({ gallery_captions: e.target.value.split('\n') })} className={`${INPUT_CLASS} resize-y`} /></Field>
  </div>
}
