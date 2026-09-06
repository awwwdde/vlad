# front

Публичный сайт и админка на Next.js 16 (App Router).

```
app/
  (site)/          публичные маршруты: /, /work, /work/[slug], /about, /contact
  admin/[[...slug]]  админка: одна страница, внутри react-router с basename="/admin"
  layout.tsx       шрифты (next/font), метаданные, тема
src/
  components/      шапка, подвал, кнопки, карточка проекта
  views/           тела страниц (клиентские компоненты)
  views/admin/     экраны панели
  hooks/           usePortfolio, useSiteSettings
  lib/             серверный фетч портфолио, утилиты
  locales/         ru.json, en.json (бандленные дефолты для i18next)
  index.css        токены темы + база Tailwind
```

## Запуск

```bash
npm install
npm run dev
```

Панель (FastAPI) поднимается отдельно на :8000. Без неё сайт работает:
портфолио падает на бандленный фолбэк, переводы на локальные json.

## Скрипты

| Команда | Что делает |
|---|---|
| `npm run dev` | дев-сервер на :3000, `/api` и `/healthz` проксируются в панель |
| `npm run build` | продакшен-сборка, `output: 'standalone'` |
| `npm start` | запуск собранного приложения |
| `npm run lint` | ESLint (`eslint-config-next`) |
| `npm run type-check` | `tsc --noEmit` |

## Переменные окружения

| Переменная | Где нужна | По умолчанию |
|---|---|---|
| `PANEL_ORIGIN` | dev-прокси `/api` | `http://localhost:8000` |
| `INTERNAL_API_BASE` | серверный рендер, адрес панели изнутри сети | `http://localhost:8000` |
| `NEXT_PUBLIC_API_BASE` | базовый URL API для браузера | пусто (same-origin) |
| `NEXT_PUBLIC_SITE_URL` | канонический адрес для метатегов | `https://awwwdde.art` |

## Тема и токены

Одна тема на весь сайт, переключается по `prefers-color-scheme`. Цвета живут
в CSS-переменных в `src/index.css`, Tailwind ссылается на них через
`rgb(var(--x) / <alpha-value>)`. Радиусы: всё прямоугольное, кнопки-пилюли.

## Превью проектов

Пока в `image_url` карточки не лежит http-ссылка, `src/lib/projectImage.ts`
отдаёт плейсхолдер с сидом по слагу. Реальные скриншоты нужно положить
в `public/images/` и прописать пути в админке.
