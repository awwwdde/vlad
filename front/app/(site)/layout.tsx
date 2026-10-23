import { SiteShell } from '@/components/SiteShell'
import { getPortfolio } from '@/lib/portfolio-server'

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const items = await getPortfolio()
  return <SiteShell initialItems={items}>{children}</SiteShell>
}
