import Home from '@/views/Home'
import { getPortfolio } from '@/lib/portfolio-server'

export default async function HomePage() {
  const items = await getPortfolio()
  return <Home initialItems={items} />
}
