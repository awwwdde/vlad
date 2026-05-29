/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { useSectionCtx } from '@/context/SectionContext'
import { useSplitReveal } from '@/hooks/useSplitReveal'
import { MagneticButton } from '@/components/ui/MagneticButton'
import { sectionVariants } from './sectionVariants'
import { useCursor } from '@/context/CursorContext'
import { submitContact } from '@/utils/contactApi'

export function S6Contact() {
  const { t } = useTranslation()
  const { dir } = useSectionCtx()
  const { set } = useCursor()
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', email: '', budget: '' })

  const rT1 = useSplitReveal({ trigger: true, delay: 0.05, stagger: 0.25 })
  const rT2 = useSplitReveal({ trigger: true, delay: 0.2,  stagger: 0.25 })

  const inp = `bg-white rounded-xl px-5 py-4 text-ink font-mono text-[13px]
    placeholder:text-ink/35 placeholder:uppercase placeholder:tracking-widest
    outline-none w-full focus:bg-white transition-colors border border-ink/10`

  return (
    <motion.section
      className="fixed inset-0 flex flex-col items-center justify-center px-[8vw]"
      variants={sectionVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      custom={dir}
    >
      <h2 ref={rT1 as any} className="font-sans font-black text-ink self-start"
        style={{ fontSize: 'clamp(28px, 5vw, 80px)', lineHeight: 1.05 }}>
        {t('s6.title1')}
      </h2>
      <h2 ref={rT2 as any} className="font-sans font-black text-lav self-start mb-[4vh]"
        style={{ fontSize: 'clamp(28px, 5vw, 80px)', lineHeight: 1.05 }}>
        {t('s6.title2')}
      </h2>

      <AnimatePresence mode="wait">
        {!sent ? (
          <motion.form
            key="form"
            className="w-full max-w-2xl flex flex-col gap-4"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scaleX: 0, transformOrigin: 'right' }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: 0.35 }}
            onSubmit={async (e) => {
              e.preventDefault()
              setBusy(true); setError(null)
              try {
                await submitContact({
                  name: form.name,
                  email: form.email,
                  budget: form.budget || undefined,
                  source: 'home',
                })
                setSent(true)
              } catch (err) {
                setError(err instanceof Error ? err.message : 'Не удалось отправить')
              } finally {
                setBusy(false)
              }
            }}
          >
            <div className="grid grid-cols-2 gap-4">
              <input className={inp} type="text" placeholder={t('s6.name')} required
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                onMouseEnter={() => set('text')} onMouseLeave={() => set('default')} />
              <input className={inp} type="email" placeholder={t('s6.email')} required
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                onMouseEnter={() => set('text')} onMouseLeave={() => set('default')} />
              <input className={`${inp} col-span-2`} type="text" placeholder={t('s6.budget')}
                value={form.budget}
                onChange={e => setForm(f => ({ ...f, budget: e.target.value }))}
                onMouseEnter={() => set('text')} onMouseLeave={() => set('default')} />
            </div>
            {error && (
              <p className="font-mono text-[11px] text-red-500 uppercase tracking-widest -mt-1">
                {error}
              </p>
            )}
            <div className="flex items-center justify-between mt-2">
              <MagneticButton type="submit" variant="lav">
                {busy ? '…' : t('s6.submit')}
              </MagneticButton>
              <div className="text-right">
                <span className="font-mono text-[10px] text-ink/35 uppercase tracking-widest block mb-1">
                  {t('s6.or')}
                </span>
                <a href="mailto:vlad@awwwdde.com"
                  className="font-sans font-semibold text-lav-dark hover:text-ink transition-colors text-[clamp(13px,1vw,16px)]"
                  onMouseEnter={() => set('pointer')} onMouseLeave={() => set('default')}>
                  vlad@awwwdde.com
                </a>
              </div>
            </div>
          </motion.form>
        ) : (
          <motion.p
            key="thanks"
            className="font-sans font-black text-lav"
            style={{ fontSize: 'clamp(24px, 3vw, 48px)' }}
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          >
            {t('s6.success')}
          </motion.p>
        )}
      </AnimatePresence>
    </motion.section>
  )
}
