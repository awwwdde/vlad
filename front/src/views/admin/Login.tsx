'use client'

import { useEffect, useState, type FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/admin/AuthContext'
import { ApiError } from '@/admin/api'
import { AdminButton, ErrorNote, Field, INPUT_CLASS } from '@/admin/ui'
import { Logo } from '@/components/Logo'
import { PORTFOLIO_THEME } from '@/lib/siteTheme'


export default function Login() {
  const { login, user } = useAuth()
  const nav = useNavigate()
  const location = useLocation() as { state: { from?: string } | null }

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Если уже залогинен и пришли на /login — отправим в админку.
  useEffect(() => {
    if (user) nav('/', { replace: true })
  }, [user, nav])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await login(email.trim(), password)
      // from приходит из ProtectedRoute уже без basename ('/projects', ...).
      nav(location.state?.from?.startsWith('/') ? location.state.from : '/', {
        replace: true,
      })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Не удалось войти')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={`admin-root grid min-h-[100dvh] lg:grid-cols-2 ${PORTFOLIO_THEME}`}>
      {/* ── Форма ───────────────────────────────────────────────────────── */}
      <div className="flex items-center px-6 py-16 sm:px-12 lg:px-16 xl:px-24">
        <form
          onSubmit={onSubmit}
          className="flex w-full max-w-sm flex-col gap-7"
        >
          <div>
            <Logo className="h-6 text-fg" />
            <h1 className="mt-9 text-[clamp(36px,4vw,60px)] font-medium leading-[1.05] tracking-[-0.05em]">
              Панель управления
            </h1>
            <p className="mt-2 font-ui text-[14px] text-muted">
              Стенды, нагрузка и контент сайта.
            </p>
          </div>

          <div className="flex flex-col gap-5">
            <Field label="Почта">
              <input
                type="email"
                required
                autoFocus
                autoComplete="username"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className={INPUT_CLASS}
              />
            </Field>

            <Field label="Пароль">
              <input
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className={INPUT_CLASS}
              />
            </Field>
          </div>

          {error && <ErrorNote>{error}</ErrorNote>}

          <AdminButton type="submit" variant="primary" busy={busy} className="self-start px-7">
            Войти
          </AdminButton>
        </form>
      </div>

      {/* ── Сцена ───────────────────────────────────────────────────────── */}
      {/* Ниже lg половина со сценой убирается совсем, а не сжимается в полоску:
          на узком экране от кадра остались бы одни поля, а форма уехала бы
          под сгиб. */}
      <div className="relative hidden overflow-hidden bg-[#3c5868] bg-[url('/sky-fallback.svg')] bg-cover bg-center lg:block">

        {/* Та же заливка, что в герое: под ней белый текст читается одинаково
            и над светлой поляной, и над тенью кроны. */}
        <div
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,transparent,rgb(27_46_58_/_65%))]"
        />

        <div className="pointer-events-none absolute inset-x-0 bottom-0 p-10">
          <p className="text-[clamp(40px,6vw,96px)] font-medium tracking-[-.065em] text-white">
            awwwdde
          </p>
          <p className="mt-1 font-ui text-[13px] text-white/70">
            [ control room ]
          </p>
        </div>
      </div>
    </div>
  )
}
