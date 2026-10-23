import type { Metadata } from 'next'
import { LegalDocument } from '@/views/LegalDocument'
import { getPrivacyDocument } from '@/lib/privacy-server'
export const metadata: Metadata = { title: 'Политика обработки персональных данных', robots: { index: false, follow: true } }
export const dynamic = 'force-dynamic'
export default async function PrivacyPage() { return <LegalDocument kind="policy" {...await getPrivacyDocument()} /> }
