'use client'

import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowUpRight, CheckCircle } from '@phosphor-icons/react'
import { Button } from '@/components/Button'
import { ContactHero } from '@/components/contact/ContactHero'
import { submitContact } from '@/utils/contactApi'
import Link from 'next/link'
import { usePrivacy } from '@/hooks/usePrivacy'
import { useSiteSettings } from '@/hooks/useSiteSettings'
import { publicLink, SITE_DEFAULTS } from '@/lib/siteSettings'

type Field = 'name' | 'email' | 'message'
type Errors = Partial<Record<Field, string>>

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

const FIELD_CLS =
  'w-full rounded-none border-0 border-b border-fg/25 bg-transparent px-0 py-4 text-[18px] text-fg placeholder:text-muted/70 ' +
  'transition-colors duration-200 hover:border-muted/60 focus:border-fg focus:outline-none ' +
  'aria-[invalid=true]:border-accent'

export default function Contact() {
  const { t, i18n } = useTranslation()
  const en = i18n.language.startsWith('en')
  const settings = useSiteSettings()
  const telegram = publicLink(settings?.social_telegram, SITE_DEFAULTS.social_telegram)
  const { document: privacy, failed: privacyFailed } = usePrivacy()
  const [consent, setConsent] = useState(false)
  const [consentError, setConsentError] = useState(false)

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
    if (!privacy?.ready) return
    setConsentError(!consent)

    const found = validate()
    setErrors(found)
    if (Object.keys(found).length || !consent) return

    setBusy(true)
    try {
      await submitContact({
        name: values.name.trim(),
        email: values.email.trim(),
        message: values.message.trim(),
        source: 'contact',
        consent: true,
        consent_version: privacy.version,
      })
      setSent(true)
    } catch (err) {
      setFailure(err instanceof Error && err.message ? err.message : t('contact.error'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="relative overflow-hidden pb-20 md:pb-28">
      <ContactHero />
      <div id="contact-form" className="relative mx-auto max-w-[1920px] scroll-mt-24 px-[6%] pt-16 md:px-[6.8%] md:pt-28">
      <div className="grid grid-cols-1 gap-14 md:grid-cols-12 md:gap-8">
        <div className="md:col-span-5">
          <div>
            <h2 className="max-w-[12ch] text-[clamp(38px,4.5vw,68px)] font-medium leading-[1.05] tracking-[-.045em]">{t('contact.form_title')}</h2>
            <p className="mt-7 max-w-[32ch] text-lg leading-relaxed text-muted">{t('contact.brief')}</p>
            {telegram && <a href={telegram} target="_blank" rel="noreferrer" className="mt-7 inline-flex min-h-12 items-center gap-4 rounded-full border border-fg/25 px-5 text-base">Telegram<ArrowUpRight size={19} aria-hidden /></a>}
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
                <label htmlFor="message" className="text-base font-medium text-fg">
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

              <div className="space-y-3 text-[13px] leading-relaxed text-muted">
                <p><Link href="/privacy" target="_blank" className="underline underline-offset-4">{en ? 'Personal data policy' : 'Политика обработки персональных данных'}</Link></p>
                <div className="flex items-start gap-3">
                  <input id="data-consent" type="checkbox" checked={consent} disabled={!privacy?.ready || busy} onChange={e => { setConsent(e.target.checked); setConsentError(false) }} aria-invalid={consentError} aria-describedby={consentError ? 'consent-error' : undefined} className="mt-1 h-4 w-4 shrink-0 accent-accent" />
                  <label htmlFor="data-consent">{en ? 'I give ' : 'Даю '}<Link href="/consent" target="_blank" className="text-fg underline underline-offset-4">{en ? 'consent to personal data processing' : 'согласие на обработку персональных данных'}</Link>{en ? ' to receive a reply to my enquiry.' : ' для рассмотрения моего обращения и ответа на него.'}</label>
                </div>
                {consentError && <p id="consent-error" role="alert" className="text-danger">{en ? 'Please give consent before sending.' : 'Для отправки необходимо отдельное согласие.'}</p>}
                {!privacy?.ready && <p role="status" className="border border-line p-4">{privacyFailed ? (en ? 'The data policy is unavailable. The form is temporarily paused.' : 'Документы об обработке данных недоступны. Отправка формы временно приостановлена.') : privacy ? (en ? 'The operator has not approved the data documents yet. The form is temporarily paused.' : 'Документы об обработке данных ещё не утверждены оператором. Отправка формы временно приостановлена.') : (en ? 'Loading data documents…' : 'Загрузка документов об обработке данных…')}</p>}
              </div>

              {failure && (
                <p role="alert" className="border border-accent px-4 py-3 text-[14px] text-accent">
                  {failure}
                </p>
              )}

              <Button type="submit" disabled={busy || !privacy?.ready} className="self-start">
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
      <label htmlFor={id} className="text-base font-medium text-fg">
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
