'use client'

import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { CheckCircle } from '@phosphor-icons/react'
import { Button } from '@/components/Button'
import { FlowerField } from '@/components/FlowerField'
import { submitContact } from '@/utils/contactApi'

type Field = 'name' | 'email' | 'message'
type Errors = Partial<Record<Field, string>>

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

const FIELD_CLS =
  'w-full border border-line bg-bg px-4 py-3 text-[16px] text-fg placeholder:text-muted/70 ' +
  'transition-colors duration-200 hover:border-muted/60 focus:border-fg focus:outline-none ' +
  'aria-[invalid=true]:border-accent'

export default function Contact() {
  const { t } = useTranslation()

  const [values, setValues] = useState({ name: '', email: '', message: '' })
  const [errors, setErrors] = useState<Errors>({})
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)
  const [failure, setFailure] = useState<string | null>(null)

  function set(field: Field, value: string) {
    setValues(prev => ({ ...prev, [field]: value }))
    // Ошибку снимаем по мере правки, а не на следующем сабмите: иначе человек
    // исправил поле, а красная рамка висит и он не понимает, что не так.
    setErrors(prev => (prev[field] ? { ...prev, [field]: undefined } : prev))
  }

  function validate(): Errors {
    const next: Errors = {}
    if (!values.name.trim()) next.name = t('contact.err_name')
    if (!EMAIL_RE.test(values.email.trim())) next.email = t('contact.err_email')
    if (values.message.trim().length < 10) next.message = t('contact.err_message')
    return next
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setFailure(null)

    const found = validate()
    setErrors(found)
    if (Object.keys(found).length) return

    setBusy(true)
    try {
      await submitContact({
        name: values.name.trim(),
        email: values.email.trim(),
        message: values.message.trim(),
        source: 'contact',
      })
      setSent(true)
    } catch (err) {
      setFailure(err instanceof Error && err.message ? err.message : t('contact.error'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="relative mx-auto w-full max-w-[1920px] overflow-hidden px-5 pb-24 pt-16 md:px-[100px] md:pb-32 md:pt-24">
      <FlowerField seed={8806} count={10} />
      <div className="relative">
      <div className="grid grid-cols-1 gap-12 md:grid-cols-12 md:gap-8">
        <div className="md:col-span-5">
          <h1 className="text-[clamp(40px,6.4vw,88px)] font-semibold leading-[0.95] tracking-[-0.035em]">
            {t('contact.title')}
          </h1>
          <p className="mt-6 max-w-prose text-[17px] leading-relaxed text-muted md:text-[19px]">
            {t('contact.sub')}
          </p>

          <div className="mt-10 border-t border-line pt-6">
            <span className="font-mono text-[12px] uppercase tracking-[0.18em] text-muted">
              {t('contact.direct')}
            </span>
            <a
              href={'mailto:' + t('common.email')}
              className="mt-3 block text-[19px] text-fg underline decoration-line underline-offset-4 transition-colors duration-200 hover:decoration-accent"
            >
              {t('common.email')}
            </a>
          </div>
        </div>

        <div className="md:col-span-6 md:col-start-7">
          {sent ? (
            <div
              role="status"
              className="flex flex-col items-start gap-3 border border-line p-8"
            >
              <CheckCircle size={28} weight="regular" className="text-accent" />
              <h2 className="text-[24px] font-medium tracking-tight">
                {t('contact.sent_title')}
              </h2>
              <p className="max-w-prose text-[16px] leading-relaxed text-muted">
                {t('contact.sent_body')}
              </p>
            </div>
          ) : (
            <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
              <Field
                id="name"
                label={t('contact.name')}
                placeholder={t('contact.name_ph')}
                value={values.name}
                error={errors.name}
                onChange={v => set('name', v)}
                autoComplete="name"
              />
              <Field
                id="email"
                type="email"
                label={t('contact.email')}
                placeholder={t('contact.email_ph')}
                value={values.email}
                error={errors.email}
                onChange={v => set('email', v)}
                autoComplete="email"
              />

              <div className="flex flex-col gap-2">
                <label htmlFor="message" className="text-[14px] font-medium text-fg">
                  {t('contact.message')}
                </label>
                <textarea
                  id="message"
                  rows={6}
                  value={values.message}
                  placeholder={t('contact.message_ph')}
                  onChange={e => set('message', e.target.value)}
                  aria-invalid={Boolean(errors.message)}
                  aria-describedby={errors.message ? 'message-error' : undefined}
                  className={FIELD_CLS + ' resize-y'}
                />
                {errors.message && (
                  <p id="message-error" className="text-[13px] text-accent">
                    {errors.message}
                  </p>
                )}
              </div>

              {failure && (
                <p role="alert" className="border border-accent px-4 py-3 text-[14px] text-accent">
                  {failure}
                </p>
              )}

              <Button type="submit" disabled={busy} className="self-start">
                {busy ? t('contact.sending') : t('contact.send')}
              </Button>
            </form>
          )}
        </div>
      </div>
      </div>
    </div>
  )
}

function Field({
  id,
  label,
  placeholder,
  value,
  error,
  onChange,
  type = 'text',
  autoComplete,
}: {
  id: string
  label: string
  placeholder: string
  value: string
  error?: string
  onChange: (v: string) => void
  type?: string
  autoComplete?: string
}) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-[14px] font-medium text-fg">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        placeholder={placeholder}
        autoComplete={autoComplete}
        onChange={e => onChange(e.target.value)}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? id + '-error' : undefined}
        className={FIELD_CLS}
      />
      {error && (
        <p id={id + '-error'} className="text-[13px] text-accent">
          {error}
        </p>
      )}
    </div>
  )
}
