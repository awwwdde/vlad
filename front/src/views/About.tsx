'use client'

import Image from 'next/image'
import { useTranslation } from 'react-i18next'
import { ButtonLink } from '@/components/Button'
import { Reveal } from '@/components/Reveal'
import { FlowerField } from '@/components/FlowerField'

const TOOLS = [
  'TypeScript',
  'React',
  'Next.js',
  'Tailwind CSS',
  'Node.js',
  'Python / FastAPI',
  'PostgreSQL',
  'Docker',
  'Figma',
]

export default function About() {
  const { t } = useTranslation()

  return (
    <div className="relative mx-auto w-full max-w-[1920px] overflow-hidden px-5 pb-24 pt-16 md:px-[100px] md:pb-32 md:pt-24">
      <FlowerField seed={5505} count={12} />
      <div className="relative">
      {/* Портрет справа, текст слева. Единственная фотография на сайте стоит
          в том блоке, где она действительно отвечает на вопрос "кто это". */}
      <div className="grid grid-cols-1 gap-12 md:grid-cols-12 md:gap-8">
        <div className="md:col-span-7">
          <h1 className="text-[clamp(40px,6.4vw,88px)] font-semibold leading-[0.95] tracking-[-0.035em]">
            {t('about.title')}
          </h1>
          <p className="mt-6 max-w-prose text-[19px] leading-snug text-muted md:text-[22px]">
            {t('about.lead')}
          </p>
          <div className="mt-10 flex max-w-prose flex-col gap-5 text-[17px] leading-relaxed">
            <p>{t('about.body1')}</p>
            <p>{t('about.body2')}</p>
          </div>
          <div className="mt-10">
            <ButtonLink href="/contact">{t('common.cta_contact')}</ButtonLink>
          </div>
        </div>

        <div className="md:col-span-4 md:col-start-9">
          <div className="relative aspect-[3/4] w-full overflow-hidden bg-surface">
            <Image
              src="/vlad.png"
              alt={t('about.title')}
              fill
              priority
              sizes="(max-width: 768px) 100vw, 33vw"
              className="object-contain object-bottom"
            />
          </div>
        </div>
      </div>

      <div className="mt-20 grid grid-cols-1 gap-12 border-t border-line pt-12 md:mt-28 md:grid-cols-12 md:gap-8 md:pt-16">
        <Reveal className="md:col-span-5">
          <h2 className="text-[24px] font-medium tracking-tight">{t('about.now_title')}</h2>
          <p className="mt-4 max-w-prose text-[16px] leading-relaxed text-muted">
            {t('about.now_body')}
          </p>
        </Reveal>

        <Reveal delay={0.06} className="md:col-span-6 md:col-start-7">
          <h2 className="text-[24px] font-medium tracking-tight">{t('about.stack_title')}</h2>
          <ul className="mt-5 flex flex-wrap gap-2">
            {TOOLS.map(tool => (
              <li key={tool} className="border border-line px-3 py-1.5 text-[13px] text-muted">
                {tool}
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
      </div>
    </div>
  )
}
