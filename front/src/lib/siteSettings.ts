export const SITE_DEFAULTS: Record<string, string> = {
  contact_email: 'message@awwwdde.art',
  social_telegram: 'https://t.me/awwwdde',
  social_github: 'https://github.com/awwwdde',
  social_instagram: 'https://instagram.com/awwwdde',
  calculator_url: '/contact',
  sky_animated: 'true',
  work_background: 'true',
  about_model_animated: 'true',
  contact_model_animated: 'true',
  case_model_animated: 'true',
  about_cat_enabled: 'true',
  coming_soon: 'false',
  privacy_operator: '', privacy_address: '', privacy_hosting: '',
  privacy_recipients: '', privacy_retention: '', privacy_security: '', privacy_approved: 'false',
}

export function publicLink(value: string | undefined, fallback = ''): string {
  if (value === undefined) return fallback
  if (value === '') return ''
  if (/^https?:\/\/[^\s]+$/i.test(value) || /^\/(?![\/\\])[^\s\\]*$/.test(value)) return value
  return fallback
}

export function contactEmail(settings: Record<string, string> | null): string {
  const value = settings?.contact_email
  return value && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? value : SITE_DEFAULTS.contact_email
}
