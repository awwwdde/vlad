import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import ProjectDetail from '@/views/ProjectDetail'
import { getPortfolio, getPortfolioItem } from '@/lib/portfolio-server'
import { projectImage } from '@/lib/projectImage'

interface Params {
  params: Promise<{ slug: string }>
}

// Слаги известны на сборке, остальное доедет через ISR (dynamicParams по
// умолчанию включён).
export async function generateStaticParams() {
  const items = await getPortfolio()
  return items.map(i => ({ slug: i.slug }))
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params
  const item = await getPortfolioItem(slug)
  if (!item) return { title: 'Проект' }

  // Метатеги из ru-бандла с откатом на en: у части карточек заполнен только
  // один язык. Та же логика, что в useBundle на клиенте.
  const b = item.ru.title ? item.ru : item.en
  const description = b.desc || b.tagline || undefined

  return {
    title: b.title,
    description,
    openGraph: {
      title: b.title,
      description,
      images: [projectImage(item, 1200, 630)],
    },
  }
}

export default async function ProjectPage({ params }: Params) {
  const { slug } = await params
  const items = await getPortfolio()
  if (!items.some(i => i.slug === slug)) notFound()

  return <ProjectDetail slug={slug} initialItems={items} />
}
