import type { PortfolioItem } from '@/admin/types'

/** Превью проекта.
 *
 *  В БД у части карточек лежат пути вида `/images/<slug>.jpg`, а самих файлов
 *  в public/ нет. Пока реальные скриншоты не загружены, отдаём осмысленный
 *  плейсхолдер с сидом по слагу: у каждого проекта своя стабильная картинка,
 *  и она не прыгает между рендерами. Как только в image_url появится
 *  http-ссылка (или файл реально ляжет в public/images), вернётся она. */
export function projectImage(item: PortfolioItem, w: number, h: number): string {
  const url = item.image_url?.trim()
  if (url && /^https?:\/\//.test(url)) return url
  return `https://picsum.photos/seed/awwwdde-${item.slug}/${w}/${h}`
}
