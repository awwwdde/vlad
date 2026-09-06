'use client'

import { useEffect, useState, type FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import dynamic from 'next/dynamic'
import { motion } from 'framer-motion'
import { useAuth } from '@/admin/AuthContext'
import { ApiError } from '@/admin/api'
import { AdminButton, ErrorNote, Field, INPUT_CLASS } from '@/admin/ui'
import { Logo } from '@/components/Logo'
import { HERO_VEIL } from '@/components/hero/tokens'
import { PALETTE } from '@/components/immersive-scene/config'

// Та же сцена, что в герое сайта. Грузится отдельным чанком и только в
// браузере: Three.js не умеет в SSR, а форма входа не должна ждать сцену -
// до её загрузки справа стоит ровная заливка цветом поляны.
const ImmersiveScene = dynamic(
  () => import('@/components/immersive-scene/ImmersiveScene').then(m => m.ImmersiveScene),
  {
    ssr: false,
    loading: () => (
      <div className="absolute inset-0" style={{ backgroundColor: PALETTE.grass }} />
    ),
  },
)

const EASE = [0.16, 1, 0.3, 1] as const

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
    <div className="admin-root grid min-h-[100dvh] bg-bg text-fg lg:grid-cols-2">
      {/* ── Форма ───────────────────────────────────────────────────────── */}
      <div className="flex items-center px-6 py-16 sm:px-12 lg:px-16 xl:px-24">
        <motion.form
          onSubmit={onSubmit}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EASE }}
          className="flex w-full max-w-sm flex-col gap-7"
        >
          <div>
            <Logo className="h-6 text-fg" />
            <h1 className="mt-6 text-[28px] font-semibold tracking-[-0.03em]">
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
        </motion.form>
      </div>

      {/* ── Сцена ───────────────────────────────────────────────────────── */}
      {/* Ниже lg половина со сценой убирается совсем, а не сжимается в полоску:
          на узком экране от кадра остались бы одни поля, а форма уехала бы
          под сгиб. */}
      <div className="relative hidden overflow-hidden lg:block">
        <ImmersiveScene className="absolute inset-0" />

        {/* Та же заливка, что в герое: под ней белый текст читается одинаково
            и над светлой поляной, и над тенью кроны. */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{ backgroundColor: `rgba(10, 16, 6, ${HERO_VEIL})` }}
        />

        <div className="pointer-events-none absolute inset-x-0 bottom-0 p-10">
          <p className="font-ui text-[14px] font-medium tracking-tight text-white">
            awwwdde
          </p>
          <p className="mt-1 font-ui text-[13px] text-white/70">
            Fullstack developer
          </p>
        </div>
      </div>
    </div>
  )
}
