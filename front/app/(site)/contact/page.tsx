import type { Metadata } from 'next'
import Contact from '@/views/Contact'

export const metadata: Metadata = {
  title: 'Контакт',
  description: 'Опишите задачу в двух-трёх предложениях. Отвечаю в течение суток.',
}

export default function ContactPage() {
  return <Contact />
}
