import type { PortfolioItem } from '@/admin/types'

/**
 * Картинки проекта, по порядку показа.
 *
 * Источников три, и порядок между ними не случайный: загруженная галерея,
 * затем старое одиночное поле (карточки, заведённые до галереи), и только
 * потом плейсхолдер. Плейсхолдер с сидом по слагу, а не случайный: иначе
 * картинка прыгала бы между рендерами и на каждой перезагрузке страницы.
 */
export function projectImages(item: PortfolioItem): string[] {
  const gallery = (item.images ?? []).filter(Boolean)
  if (gallery.length) return gallery

  const legacy = item.image_url?.trim()
  if (legacy && /^https?:\/\//.test(legacy)) return [legacy]

  return []
}

/** Одна картинка для карточки. Плейсхолдер, если своих нет. */
export function projectImage(item: PortfolioItem, w: number, h: number): string {
  return projectImages(item)[0] ?? placeholder(item.slug, w, h)
}

export function placeholder(slug: string, w: number, h: number): string {
  return `https://picsum.photos/seed/awwwdde-${slug}/${w}/${h}`
}
