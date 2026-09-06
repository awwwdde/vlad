import { rng } from '@/components/immersive-scene/config'

/**
 * Ромашки, разбросанные по секции.
 *
 * Тот же цветок, что растёт на поляне в герое (blade:b в сцене): пять
 * лепестков и точка сердцевины. Здесь он нарисован не на канвасе, а обычным
 * SVG - секции ниже героя это просто HTML, тащить в них WebGL ради восьми
 * значков не за чем.
 *
 * Рассев детерминированный: позиции берутся из сеяного генератора, а не из
 * Math.random. Иначе сервер и клиент разложили бы цветы по-разному и React
 * поймал бы расхождение при гидратации.
 *
 * Слой чисто декоративный - скрыт от скринридера и не ловит указатель. Лежит
 * под контентом, а лепестки выкрашены акцентной зеленью на 28% прозрачности:
 * на белом это мягкая шалфейная заливка, различимая, но настолько лёгкая, что
 * текст поверх неё контраст не теряет. Цвет тот же, что у поляны в герое, -
 * секции читаются продолжением первого экрана, а не отдельной страницей.
 */
interface Flower {
  left: number
  top: number
  rot: number
  size: number
  opacity: number
}

function scatter(count: number, seed: number): Flower[] {
  const rand = rng(seed)
  return Array.from({ length: count }, () => ({
    left: rand() * 100,
    top: rand() * 100,
    rot: rand() * 360,
    // Разброс размеров важнее количества: одинаковые цветы читаются
    // орнаментом, разные - живым лугом.
    size: 11 + rand() * 13,
    // Нижняя граница высокая: цветок и так почти прозрачный, и при 0.4 он
    // окончательно пропадал на светлом фоне.
    opacity: 0.65 + rand() * 0.35,
  }))
}

export function FlowerField({
  count = 14,
  seed,
  className,
}: {
  count?: number
  /** Свой сид на секцию: иначе один и тот же рисунок повторится страницей ниже. */
  seed: number
  className?: string
}) {
  const flowers = scatter(count, seed)

  return (
    <div className={`pointer-events-none absolute inset-0 -z-0 ${className ?? ''}`} aria-hidden>
      {flowers.map((f, i) => (
        <svg
          key={i}
          viewBox="0 0 24 24"
          className="absolute"
          style={{
            left: `${f.left}%`,
            top: `${f.top}%`,
            width: f.size,
            height: f.size,
            opacity: f.opacity,
            transform: `translate(-50%, -50%) rotate(${f.rot}deg)`,
          }}
        >
          {[0, 1, 2, 3, 4].map(p => (
            <ellipse
              key={p}
              cx="12"
              cy="6.4"
              rx="2.5"
              ry="4.3"
              transform={`rotate(${p * 72} 12 12)`}
              className="fill-accent"
              fillOpacity={0.28}
            />
          ))}
          {/* Сердцевина взята из палитры сцены. Точка маленькая и приглушённая:
              на этом масштабе она читается серединкой цветка, а не цветным
              пятном в наборе. */}
          <circle cx="12" cy="12" r="2.3" fill="#E6B23C" opacity="0.55" />
        </svg>
      ))}
    </div>
  )
}
