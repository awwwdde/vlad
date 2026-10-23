// Бейкнутая копия портфолио — то же, что заливается сидингом в БД.
// Используется как мгновенный fallback, пока сетевой запрос /api/content/portfolio
// не вернулся (или если бек упал). Гарантирует, что первый рендер сайта не пустой.
//
// Когда поправите карточку в админке — БД обновится, но этот файл нет; это
// нормально, потому что хук usePortfolio() сразу же перезаписывает данные
// серверным ответом.

import type { PortfolioItem } from '@/admin/types'

const NOW = new Date().toISOString()

const OWN_CASE = {
  "ru": {
    "client": "Личный проект / awwwdde",
    "role": "Дизайн и разработка",
    "challenge": "Собрать портфолио с собственным характером: показать работы, объяснить подход и сделать путь до обращения коротким. ASCII должен стать частью визуального языка, сохраняя читаемость и удобство сайта.",
    "approach": "Светлая типографическая основа и контрастные синие секции. Объёмные ASCII-сцены связывают главную, проекты, About и контакты. Движение дополняет содержание: вне экрана сцены останавливаются, а уменьшение движения учитывается автоматически.",
    "outcome": "Единый сайт от первого экрана до подробного кейса. Работы, тексты на двух языках и настройки сцен управляются через одну панель.",
    "deliverables": [
      "Главная с объёмным ASCII-небом",
      "Каталог работ и страницы кейсов",
      "About и контакты в общей системе",
      "Редактор RU / EN и галерей",
      "Управление сценами и пасхалками"
    ],
    "steps": [
      {
        "title": "Визуальный язык",
        "body": "Крупная типографика, свободное пространство, синий и тёплые световые акценты. ASCII-графика дополняет эту систему на каждой странице."
      },
      {
        "title": "Объём и движение",
        "body": "Процедурное небо, вращающиеся модели с освещением и редкие текстовые пасхалки. Для сцен предусмотрены паузы и статичный режим."
      },
      {
        "title": "Контент и управление",
        "body": "Отдельные переводы, редактируемая структура кейсов, загрузка обложек и управление эффектами через административную панель."
      }
    ]
  },
  "en": {
    "client": "Personal project / awwwdde",
    "role": "Design and development",
    "challenge": "Build a portfolio with a distinct character: show the work, explain the approach, and keep the path to an enquiry short. ASCII should become part of the visual language while keeping the website clear and usable.",
    "approach": "A light typographic foundation with contrasting blue sections. Volumetric ASCII scenes connect the home page, projects, About and Contact. Motion supports the content: scenes pause off screen and respect reduced motion preferences.",
    "outcome": "One consistent website, from the opening screen to a detailed case study. Work, bilingual content and scene settings are managed through a single control panel.",
    "deliverables": [
      "Home page with a volumetric ASCII sky",
      "Project index and case studies",
      "About and Contact in one visual system",
      "RU / EN content and gallery editor",
      "Scene and easter egg controls"
    ],
    "steps": [
      {
        "title": "Visual language",
        "body": "Large typography, open space, blue tones and warm highlights. ASCII imagery extends this system across the website."
      },
      {
        "title": "Depth and motion",
        "body": "A procedural sky, rotating lit sculptures and occasional text easter eggs. Scenes include off-screen pauses and static modes."
      },
      {
        "title": "Content and control",
        "body": "Separate translations, editable case studies, cover uploads and effect controls in the admin panel."
      }
    ]
  }
}

export const FALLBACK_PORTFOLIO: PortfolioItem[] = [
  {
    id: 1, slug: 'pickupservice', order_index: 0,
    link: 'https://pickupservice.moscow/', image_url: '/images/pickupservice.jpg', images: [], accent: '#1a1a1a',
    ru: {
      challenge: "Представить московский сервис тюнинга внедорожников и передать характер его работы через сайт.",
      approach: "В основе — тёмный, жёсткий и механический визуальный язык. Дизайн, разработка и брендинг собраны в одном направлении.",

      title: 'Pickup Service',
      tagline: 'Здесь начинается серьёзный внедорожник.',
      desc: 'Сайт-визитка для московского сервиса тюнинга внедорожников. Тёмный, жёсткий, механический.',
      tags: ['UI Дизайн', 'Разработка', 'Брендинг'],
    },
    en: {
      challenge: "Present a Moscow SUV tuning garage and express the character of its work through a website.",
      approach: "A dark, bold, mechanical visual language brings design, development and branding into one direction.",

      title: 'Pickup Service',
      tagline: 'Where serious off-road begins.',
      desc: 'Business card site for a Moscow SUV tuning garage. Dark, bold, mechanical.',
      tags: ['UI Design', 'Development', 'Branding'],
    },
    created_at: NOW, updated_at: NOW,
  },
  {
    id: 2, slug: 'kitluna', order_index: 1,
    link: null, image_url: '/images/kitluna.jpg', images: [], accent: '#C4B5FD',
    ru: {
      challenge: "Представить агентство веб-разработки через понятную структуру и чёткую визуальную иерархию.",
      approach: "Чистая система интерфейса, акцент на иерархии и движение как часть визуального языка. Основа реализации — React.",

      title: 'KitLuna',
      tagline: 'Студия, которая строит студии.',
      desc: 'Сайт для агентства веб-разработки. Чистая система, чёткая иерархия - заточено под конверсию.',
      tags: ['UI Дизайн', 'React', 'Motion'],
    },
    en: {
      challenge: "Present a web development agency through a clear structure and visual hierarchy.",
      approach: "A clean interface system, deliberate hierarchy and motion as part of the visual language, built with React.",

      title: 'KitLuna',
      tagline: 'A studio that builds studios.',
      desc: 'Website for a web and software development agency. Clean system, clear hierarchy — built to convert.',
      tags: ['UI Design', 'React', 'Motion'],
    },
    created_at: NOW, updated_at: NOW,
  },
  {
    id: 3, slug: 'linkavto', order_index: 2,
    link: 'https://linkavto.ru/', image_url: '/images/linkavto.jpg', images: [], accent: '#2563EB',
    ru: {
      challenge: "Сделать сложный каталог автозапчастей понятным и помочь пользователю быстро найти нужную позицию.",
      approach: "Фокус на быстром поиске и удобной работе с каталогом. Интерфейс реализован на React и TypeScript.",

      title: 'LinkAvto',
      tagline: 'Любая запчасть. Любой автомобиль.',
      desc: 'Маркетплейс автозапчастей. Сложный каталог, быстрый поиск, плавный UX по 50k+ позициям.',
      tags: ['React', 'TypeScript', 'UX Дизайн'],
    },
    en: {
      challenge: "Make a complex auto parts catalog understandable and help people find the right item quickly.",
      approach: "The focus is on fast search and a clear catalog experience, with an interface built in React and TypeScript.",

      title: 'LinkAvto',
      tagline: 'Every part. Every car.',
      desc: 'Marketplace for auto parts. Complex catalog, fast search, smooth UX across 50k+ SKUs.',
      tags: ['React', 'TypeScript', 'UX Design'],
    },
    created_at: NOW, updated_at: NOW,
  },
  {
    id: 4, slug: 'awwwdde', order_index: 3,
    link: null, image_url: '/images/awwwdde.jpg', images: [], accent: '#C4B5FD',
    ru: {
      title: 'Этот сайт',
      tagline: 'Сапожник с сапогами.',
      desc: 'Моё портфолио — собрано с той же заботой что и клиентские проекты. Motion, минимализм, честность.',
      tags: ['Next.js', 'React', 'Tailwind', 'ASCII / Canvas'],
      ...OWN_CASE.ru,
    },
    en: {
      title: 'This site',
      tagline: "The cobbler's children have shoes.",
      desc: 'My own portfolio — built with the same care I give every client project. Motion-heavy, minimal, honest.',
      tags: ['Next.js', 'React', 'Tailwind', 'ASCII / Canvas'],
      ...OWN_CASE.en,
    },
    created_at: NOW, updated_at: NOW,
  },
  {
    id: 5, slug: 'abrikosova', order_index: 4,
    link: 'https://www.abrikosova-elena.ru/', image_url: '/images/abrikosova.jpg', images: [], accent: '#FCA5A5',
    ru: {
      challenge: "Передать тёплый характер кондитерского проекта в цифровой среде.",
      approach: "Мягкий и тёплый визуальный язык. Дизайн и разработка поддерживают общее впечатление от проекта.",

      title: 'Елена Абрикосова',
      tagline: 'Сладкое заслуживает красивых страниц.',
      desc: 'Сайт для кондитера. Тёплый, мягкий, вкусный - каждый скролл как разворачивание подарка.',
      tags: ['UI Дизайн', 'Разработка'],
    },
    en: {
      challenge: "Bring the warm character of a pastry project into a digital experience.",
      approach: "A soft, warm visual language, with design and development supporting the same overall impression.",

      title: 'Elena Abrikosova',
      tagline: 'Sweet things deserve beautiful pages.',
      desc: 'Website for a pastry chef. Warm, soft, delicious — every scroll feels like unwrapping something special.',
      tags: ['UI Design', 'Development'],
    },
    created_at: NOW, updated_at: NOW,
  },
]
