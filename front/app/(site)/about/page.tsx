import type { Metadata } from 'next'
import About from '@/views/About'

export const metadata: Metadata = {
  title: 'Обо мне',
  description: 'Веб-разработчик полного цикла: от макета до сервера, на котором это крутится.',
}

export default function AboutPage() {
  return <About />
}
