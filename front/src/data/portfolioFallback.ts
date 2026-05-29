// Бейкнутая копия портфолио — то же, что заливается сидингом в БД.
// Используется как мгновенный fallback, пока сетевой запрос /api/content/portfolio
// не вернулся (или если бек упал). Гарантирует, что первый рендер сайта не пустой.
//
// Когда поправите карточку в админке — БД обновится, но этот файл нет; это
// нормально, потому что хук usePortfolio() сразу же перезаписывает данные
// серверным ответом.

import type { PortfolioItem } from '@/admin/types'

const NOW = new Date().toISOString()

export const FALLBACK_PORTFOLIO: PortfolioItem[] = [
  {
    id: 1, slug: 'pickupservice', order_index: 0,
    link: 'https://pickupservice.moscow/', image_url: '/images/pickupservice.jpg', accent: '#1a1a1a',
    ru: {
      title: 'Pickup Service',
      tagline: 'Здесь начинается серьёзный внедорожник.',
      desc: 'Сайт-визитка для московского сервиса тюнинга внедорожников. Тёмный, жёсткий, механический.',
      tags: ['UI Дизайн', 'Разработка', 'Брендинг'],
    },
    en: {
      title: 'Pickup Service',
      tagline: 'Where serious off-road begins.',
      desc: 'Business card site for a Moscow SUV tuning garage. Dark, bold, mechanical.',
      tags: ['UI Design', 'Development', 'Branding'],
    },
    created_at: NOW, updated_at: NOW,
  },
  {
    id: 2, slug: 'kitluna', order_index: 1,
    link: null, image_url: '/images/kitluna.jpg', accent: '#C4B5FD',
    ru: {
      title: 'KitLuna',
      tagline: 'Студия, которая строит студии.',
      desc: 'Сайт для агентства веб-разработки. Чистая система, чёткая иерархия - заточено под конверсию.',
      tags: ['UI Дизайн', 'React', 'Motion'],
    },
    en: {
      title: 'KitLuna',
      tagline: 'A studio that builds studios.',
      desc: 'Website for a web and software development agency. Clean system, clear hierarchy — built to convert.',
      tags: ['UI Design', 'React', 'Motion'],
    },
    created_at: NOW, updated_at: NOW,
  },
  {
    id: 3, slug: 'linkavto', order_index: 2,
    link: 'https://linkavto.ru/', image_url: '/images/linkavto.jpg', accent: '#2563EB',
    ru: {
      title: 'LinkAvto',
      tagline: 'Любая запчасть. Любой автомобиль.',
      desc: 'Маркетплейс автозапчастей. Сложный каталог, быстрый поиск, плавный UX по 50k+ позициям.',
      tags: ['React', 'TypeScript', 'UX Дизайн'],
    },
    en: {
      title: 'LinkAvto',
      tagline: 'Every part. Every car.',
      desc: 'Marketplace for auto parts. Complex catalog, fast search, smooth UX across 50k+ SKUs.',
      tags: ['React', 'TypeScript', 'UX Design'],
    },
    created_at: NOW, updated_at: NOW,
  },
  {
    id: 4, slug: 'awwwdde', order_index: 3,
    link: null, image_url: '/images/awwwdde.jpg', accent: '#C4B5FD',
    ru: {
      title: 'Этот сайт',
      tagline: 'Сапожник с сапогами.',
      desc: 'Моё портфолио — собрано с той же заботой что и клиентские проекты. Motion, минимализм, честность.',
      tags: ['GSAP', 'Framer Motion', 'Lenis'],
    },
    en: {
      title: 'This site',
      tagline: "The cobbler's children have shoes.",
      desc: 'My own portfolio — built with the same care I give every client project. Motion-heavy, minimal, honest.',
      tags: ['GSAP', 'Framer Motion', 'Lenis'],
    },
    created_at: NOW, updated_at: NOW,
  },
  {
    id: 5, slug: 'abrikosova', order_index: 4,
    link: 'https://www.abrikosova-elena.ru/', image_url: '/images/abrikosova.jpg', accent: '#FCA5A5',
    ru: {
      title: 'Елена Абрикосова',
      tagline: 'Сладкое заслуживает красивых страниц.',
      desc: 'Сайт для кондитера. Тёплый, мягкий, вкусный - каждый скролл как разворачивание подарка.',
      tags: ['UI Дизайн', 'Разработка'],
    },
    en: {
      title: 'Elena Abrikosova',
      tagline: 'Sweet things deserve beautiful pages.',
      desc: 'Website for a pastry chef. Warm, soft, delicious — every scroll feels like unwrapping something special.',
      tags: ['UI Design', 'Development'],
    },
    created_at: NOW, updated_at: NOW,
  },
]
