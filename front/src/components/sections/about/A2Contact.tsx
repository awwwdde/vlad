/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { useSectionCtx } from '@/context/SectionContext'
import { useSplitReveal, SPRING } from '@/hooks/useSplitReveal'
import { sectionVariants } from '@/components/sections/sectionVariants'
import { useCursor } from '@/context/CursorContext'
import gsap from 'gsap'
import { submitContact } from '@/utils/contactApi'

export function A2Contact() {
  const { t } = useTranslation()
  const { dir } = useSectionCtx()
  const { set } = useCursor()
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', email: '', message: '' })
  const formRef = useRef<HTMLFormElement>(null)

  const r1 = useSplitReveal({ trigger: true, delay: 0.05, stagger: 0.25 })
  const r2 = useSplitReveal({ trigger: true, delay: 0.2, stagger: 0.25 })

  useEffect(() => {
    if (!formRef.current) return
    const els = formRef.current.querySelectorAll('input, button[type="submit"]')
    gsap.fromTo(els,
      {
        clipPath: 'polygon(0 0, 100% 0, 100% 0, 0 0)',
        y: 60,
        opacity: 0,
      },
      {
        clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)',
        y: 0,
        opacity: 1,
        duration: 0.8,
        ease: SPRING,
        stagger: 0.1,
        delay: 0.5,
      }
    )
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await submitContact({
        name: form.name,
        email: form.email,
        message: form.message,
        source: 'about',
      })
      // Анимация только после успешного ответа сервера.
      if (formRef.current) {
        gsap.to(formRef.current, {
          scaleX: 0,
          transformOrigin: 'right center',
          duration: 0.5,
          ease: 'power2.in',
          onComplete: () => setSent(true),
        })
      } else {
        setSent(true)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось отправить')
    } finally {
      setBusy(false)
    }
  }

  const inputClass = `
    w-full rounded-xl px-5 py-4 border-none outline-none
    bg-black/5 font-sans text-[clamp(13px,1vw,16px)] text-ink
    placeholder:text-ink/40 placeholder:uppercase placeholder:tracking-widest placeholder:font-mono
    focus:bg-lav/20 transition-colors
  `

  return (
    <motion.section
      className="fixed inset-0 flex flex-col items-center justify-center px-10 md:px-16"
      variants={sectionVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      custom={dir}
    >
      <div className="w-full max-w-2xl">
        <h2
          ref={r1 as any}
          className="font-sans font-black text-ink"
          style={{ fontSize: 'clamp(32px, 5vw, 80px)', lineHeight: 1.0 }}
        >
          {t('about_sections.a2.title1')}
        </h2>
        <h2
          ref={r2 as any}
          className="font-sans font-black text-lav-dark mb-10"
          style={{ fontSize: 'clamp(32px, 5vw, 80px)', lineHeight: 1.0 }}
        >
          {t('about_sections.a2.title2')}
        </h2>

        <AnimatePresence mode="wait">
          {!sent ? (
            <motion.form
              key="form"
              ref={formRef}
              onSubmit={handleSubmit}
              className="w-full"
              style={{ transformOrigin: 'right center' }}
              initial={{ opacity: 1 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 1 }}
            >
              <div
                className="grid gap-4 mb-4"
                style={{ gridTemplateAreas: '"a b" "c c"', gridTemplateColumns: '1fr 1fr' }}
              >
                <input
                  style={{ gridArea: 'a' }}
                  className={inputClass}
                  type="text"
                  placeholder={t('about_sections.a2.name')}
                  required
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  onMouseEnter={() => set('text')}
                  onMouseLeave={() => set('default')}
                />
                <input
                  style={{ gridArea: 'b' }}
                  className={inputClass}
                  type="email"
                  placeholder={t('s6.email')}
                  required
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  onMouseEnter={() => set('text')}
                  onMouseLeave={() => set('default')}
                />
                <input
                  style={{ gridArea: 'c' }}
                  className={inputClass}
                  type="text"
                  placeholder={t('about_sections.a2.message')}
                  required
                  value={form.message}
                  onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                  onMouseEnter={() => set('text')}
                  onMouseLeave={() => set('default')}
                />
              </div>

              {error && (
                <p className="font-mono text-[11px] text-red-500 uppercase tracking-widest mb-2">
                  {error}
                </p>
              )}
              <div className="flex items-center justify-between mt-2">
                <button
                  type="submit"
                  disabled={busy}
                  className="bg-lav text-ink font-sans font-bold px-8 py-3 rounded-full hover:bg-lav-dark transition-colors disabled:opacity-50"
                  onMouseEnter={() => set('pointer')}
                  onMouseLeave={() => set('default')}
                  style={{
                    clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)',
                  }}
                >
                  {busy ? '…' : t('about_sections.a2.submit')}
                </button>

                <div className="text-right">
                  <span className="font-mono text-[10px] uppercase tracking-widest text-muted block mb-1">
                    {t('about_sections.a2.or')}
                  </span>
                  <a
                    href="mailto:vlad@awwwdde.com"
                    className="font-sans font-semibold text-ink hover:text-lav-dark transition-colors"
                    style={{ fontSize: 'clamp(13px, 1vw, 17px)' }}
                    onMouseEnter={() => set('pointer')}
                    onMouseLeave={() => set('default')}
                  >
                    vlad@awwwdde.com
                  </a>
                </div>
              </div>
            </motion.form>
          ) : (
            <motion.div
              key="thanks"
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="py-12"
            >
              <p
                className="font-sans font-black text-lav-dark"
                style={{ fontSize: 'clamp(24px, 3vw, 48px)' }}
              >
                {t('s6.success')}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.section>
  )
}
