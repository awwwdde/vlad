'use client'

import { useTranslation } from 'react-i18next'
import { RevealWords } from '@/components/hero/RevealText'
import { Reveal } from '@/components/Reveal'
import { FlowerField } from '@/components/FlowerField'
import { cn } from '@/lib/cn'

/**
 * Секция сразу после героя: как я работаю и на чём.
 *
 * Композиция намеренно разбросана: блоки стоят на разных колонках и на разной
 * высоте, ни один не выравнен с соседом по верхнему краю. Но хаос здесь
 * управляемый - каждый блок всё равно сидит на общей 12-колоночной сетке и
 * набран одним и тем же кеглем, разъезжаются только позиции. Иначе получилась
 * бы не композиция, а свалка.
 *
 * Содержимое прижато к верху, а не отцентровано по экрану: разброс должен
 * начинаться сразу под героем, иначе первый блок уезжает в середину страницы
 * и разворот распадается.
 *
 * Цвета нет. Акцент спорил бы с первым экраном: там цвет несёт сцена, здесь
 * работают только типографика, воздух и волосяные линии.
 *
 * Разделительной линии сверху тоже нет: от героя и от секции работ блок
 * отделяют воздух и смена ритма, а не правило поперёк страницы.
 */

/** Позиция блока на сетке. Колонки и отступ сверху заданы поштучно: это
 *  раскладка-композиция, и вывести её формулой означало бы вернуть регулярность,
 *  от которой мы уходим. */
interface Slot {
  /** Классы колонок и строки для >= md. */
  grid: string
  /** Сдвиг вниз внутри своей строки. */
  offset: string
}

const STEP_SLOTS: Slot[] = [
  { grid: 'md:col-start-1 md:col-span-4 md:row-start-2', offset: 'md:mt-0' },
  { grid: 'md:col-start-3 md:col-span-4 md:row-start-3', offset: 'md:mt-14' },
  { grid: 'md:col-start-1 md:col-span-4 md:row-start-4', offset: 'md:mt-6' },
]

const STACK: Array<{ labelKey: string; items: string[]; slot: Slot }> = [
  {
    labelKey: 'home.stack_ui',
    items: ['TypeScript', 'React', 'Next.js', 'Tailwind CSS', 'Motion', 'Three.js'],
    slot: { grid: 'md:col-start-7 md:col-span-5 md:row-start-2', offset: 'md:mt-24' },
  },
  {
    labelKey: 'home.stack_server',
    items: ['Python', 'FastAPI', 'Node.js', 'PostgreSQL'],
    slot: { grid: 'md:col-start-9 md:col-span-4 md:row-start-3', offset: 'md:mt-32' },
  },
  {
    labelKey: 'home.stack_infra',
    items: ['Docker', 'Caddy', 'Linux', 'CI'],
    slot: { grid: 'md:col-start-6 md:col-span-4 md:row-start-4', offset: 'md:mt-16' },
  },
]

const STEPS = [1, 2, 3] as const

export function Craft() {
  const { t } = useTranslation()

  return (
    <section className="relative overflow-hidden bg-bg">
      <FlowerField seed={4101} count={16} />

      <div className="relative mx-auto w-full max-w-[1920px] px-5 pb-24 pt-16 md:px-[100px] md:pb-32 md:pt-20">
        {/* Ниже md вся раскладка складывается в одну колонку без сдвигов:
            на узком экране разброс превращается в дыры. */}
        <div className="grid grid-cols-1 gap-y-12 md:grid-cols-12 md:gap-x-8 md:gap-y-0">
          <header className="md:col-span-6 md:col-start-1 md:row-start-1">
            <h2 className="max-w-[16ch] text-[clamp(34px,5vw,72px)] font-semibold leading-[1.02] tracking-[-0.035em]">
              <RevealWords inView text={t('home.craft_title')} />
            </h2>
          </header>

          {/* Подводка уходит вправо и вниз - она не подпись под заголовком,
              а самостоятельный блок разворота. */}
          <Reveal
            delay={0.1}
            className="md:col-span-4 md:col-start-9 md:row-start-1 md:mt-[7.5rem]"
          >
            <p className="max-w-prose text-[16px] leading-relaxed text-muted md:text-[17px]">
              {t('home.craft_lead')}
            </p>
          </Reveal>

          {STEPS.map((n, i) => (
            <Reveal
              key={n}
              delay={0.06 + i * 0.06}
              className={cn(STEP_SLOTS[i].grid, STEP_SLOTS[i].offset)}
            >
              <div className="border-t border-line pt-6">
                <div className="flex items-baseline gap-4">
                  <span className="font-ui text-[13px] font-medium tabular-nums text-muted">
                    {`0${n}`}
                  </span>
                  <h3 className="text-[20px] font-medium tracking-tight md:text-[24px]">
                    {t(`home.step${n}_title`)}
                  </h3>
                </div>
                <p className="mt-3 max-w-prose text-[15px] leading-relaxed text-muted md:text-[16px]">
                  {t(`home.step${n}_body`)}
                </p>
              </div>
            </Reveal>
          ))}

          {STACK.map((group, i) => (
            <Reveal
              key={group.labelKey}
              delay={0.08 + i * 0.06}
              className={cn(group.slot.grid, group.slot.offset)}
            >
              <div className="border-t border-line pt-6">
                <h3 className="font-ui text-[13px] font-medium tracking-tight text-muted">
                  {t(group.labelKey)}
                </h3>
                {/* Названия набраны обычным текстом, а не плашками: плашки на
                    сайте уже заняты тегами проектов, и второй раз тот же приём
                    читался бы копией. */}
                <ul className="mt-4 flex flex-wrap gap-x-7 gap-y-2">
                  {group.items.map(item => (
                    <li key={item} className="text-[18px] tracking-tight md:text-[21px]">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
