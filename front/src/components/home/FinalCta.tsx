'use client'

import { useTranslation } from 'react-i18next'
import { ArrowUpRight } from '@phosphor-icons/react'
import { ButtonLink } from '@/components/Button'
import { FlowerField } from '@/components/FlowerField'
import { Reveal } from '@/components/Reveal'
import { RevealWords } from '@/components/hero/RevealText'
import { cn } from '@/lib/cn'

/**
 * Закрывающая секция страницы.
 *
 * Раньше это была плашка другого тона с парой строк и кнопкой. Тон убран -
 * секция идёт на общем фоне, встык с работами: страница читается одним
 * полотном, а не набором отсеков.
 *
 * Разброс тот же, что выше, но здесь у него своя задача. Человек, дочитавший
 * до конца, хочет знать не «напишите нам», а что писать, сколько это займёт и
 * что будет после письма. Три коротких блока отвечают ровно на это, и
 * разнесены они так, чтобы читались по одному, а не сливались в колонку
 * условий.
 */
const BLOCKS = [
  {
    labelKey: 'home.cta_brief_label',
    bodyKey: 'home.cta_brief_body',
    // Отступ снимает тесноту под заголовком: без него блок вставал в 25px
    // от его нижней строки и читался подписью к нему, а не отдельным блоком.
    slot: 'md:col-start-1 md:col-span-4 md:row-start-2 md:mt-12',
  },
  {
    labelKey: 'home.cta_terms_label',
    bodyKey: 'home.cta_terms_body',
    slot: 'md:col-start-6 md:col-span-4 md:row-start-2 md:mt-24',
  },
  {
    labelKey: 'home.cta_next_label',
    bodyKey: 'home.cta_next_body',
    slot: 'md:col-start-3 md:col-span-4 md:row-start-3 md:mt-12',
  },
]

export function FinalCta() {
  const { t } = useTranslation()

  return (
    <section className="relative overflow-hidden">
      <FlowerField seed={9903} count={12} />

      <div className="relative mx-auto w-full max-w-[1920px] px-5 pb-24 pt-16 md:px-[100px] md:pb-32 md:pt-20">
        <div className="grid grid-cols-1 gap-y-12 md:grid-cols-12 md:gap-x-8 md:gap-y-0">
          <h2 className="max-w-[14ch] text-[clamp(34px,5vw,72px)] font-semibold leading-[1.02] tracking-[-0.035em] md:col-span-6 md:col-start-1 md:row-start-1">
            <RevealWords inView text={t('home.cta_title')} />
          </h2>

          <Reveal
            delay={0.1}
            className="md:col-span-4 md:col-start-9 md:row-start-1 md:mt-[7.5rem]"
          >
            <p className="max-w-prose text-[16px] leading-relaxed text-muted md:text-[17px]">
              {t('home.cta_body')}
            </p>
          </Reveal>

          {BLOCKS.map((block, i) => (
            <Reveal key={block.labelKey} delay={0.06 + i * 0.06} className={cn(block.slot)}>
              <div className="border-t border-line pt-6">
                <h3 className="font-ui text-[13px] font-medium tracking-tight text-muted">
                  {t(block.labelKey)}
                </h3>
                <p className="mt-3 max-w-prose text-[15px] leading-relaxed md:text-[16px]">
                  {t(block.bodyKey)}
                </p>
              </div>
            </Reveal>
          ))}

          {/* Кнопка и почта стоят в пустом правом углу - там, где взгляд
              оказывается, дочитав последний блок. Почта рядом не дублирует
              кнопку: она для тех, кому форма лишняя. */}
          <Reveal
            delay={0.2}
            className="md:col-span-4 md:col-start-8 md:row-start-3 md:mt-36 md:justify-self-start"
          >
            <div className="flex flex-col items-start gap-5">
              <ButtonLink href="/contact">{t('common.cta_contact')}</ButtonLink>
              <div>
                <span className="block font-ui text-[13px] font-medium tracking-tight text-muted">
                  {t('home.cta_direct')}
                </span>
                <a
                  href={`mailto:${t('common.email')}`}
                  className="mt-1.5 inline-flex items-center gap-1.5 text-[17px] tracking-tight text-fg underline decoration-line underline-offset-4 transition-colors duration-200 hover:decoration-accent md:text-[19px]"
                >
                  {t('common.email')}
                  <ArrowUpRight size={16} weight="regular" />
                </a>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  )
}
