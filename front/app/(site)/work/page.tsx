import type { Metadata } from 'next'
import Work from '@/views/Work'
import { getPortfolio } from '@/lib/portfolio-server'

export const metadata: Metadata = {
  title: 'Работы',
  description: 'Коммерческие сайты, сервисы и внутренние панели за последние годы.',
}

// Список рендерится на сервере: карточки уходят в HTML, а не появляются после
// гидратации. Клиент поверх этого делает stale-while-revalidate.
export default async function WorkPage() {
  const items = await getPortfolio()
  return <Work initialItems={items} />
}
