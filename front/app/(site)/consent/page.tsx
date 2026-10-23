import type { Metadata } from 'next'
import { LegalDocument } from '@/views/LegalDocument'
import { getPrivacyDocument } from '@/lib/privacy-server'
export const metadata: Metadata = { title: 'Согласие на обработку персональных данных', robots: { index: false, follow: true } }
export const dynamic = 'force-dynamic'
export default async function ConsentPage() { return <LegalDocument kind="consent" {...await getPrivacyDocument()} /> }
