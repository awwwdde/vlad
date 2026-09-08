# Multi-stage сборка Next.js в standalone-режим.
# Итоговый образ — Node, который сам обслуживает apex-домен на :3000;
# Caddy проксирует его (см. deploy/Caddyfile). Прежний вариант «положить dist
# в общий volume» больше не годится: у сайта есть серверный рендер и ISR.

FROM node:20-alpine AS deps
WORKDIR /app
# package.json первым — слой кешируется, пока зависимости не менялись.
# npm install (а не ci): package-lock.json может содержать только
# Windows/macOS-варианты платформенных бинарников, npm ci на это падает
# с EUSAGE, install спокойно дозаписывает Linux-варианты внутри образа.
COPY package.json package-lock.json* ./
RUN npm install --no-audit --no-fund

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Публичные NEXT_PUBLIC_* инлайнятся на сборке, поэтому пробрасываем их сюда.
ARG NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
# Адрес панели нужен именно на сборке, а не в рантайме: при output:'standalone'
# next build вычисляет next.config.ts один раз и записывает готовые rewrite-
# правила в routes-manifest.json. Переменная, заданная контейнеру потом, на них
# уже не влияет - в манифест попадёт значение по умолчанию, и оптимизатор
# next/image будет ходить за картинками в несуществующий localhost:8000.
ARG PANEL_ORIGIN
ENV PANEL_ORIGIN=$PANEL_ORIGIN
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# standalone кладёт минимальный server.js и только реально нужные модули.
# static и public он не копирует — переносим руками.
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001 && chown -R nextjs:nodejs /app
USER nextjs

EXPOSE 3000
CMD ["node", "server.js"]
