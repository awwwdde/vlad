# Multi-stage сборка фронта.
# Финальный stage — пустой alpine, который копирует dist/ в shared volume и засыпает,
# чтобы Caddy в соседнем контейнере отдавал статику. Это проще, чем держать второй
# веб-сервер только ради статики.

FROM node:20-alpine AS builder
WORKDIR /app

# package.json первым — кеш слоёв сохраняется при изменении исходников.
COPY package.json package-lock.json* ./
RUN npm ci

COPY . .
RUN npm run build

# Минималистичный «sidecar», который кладёт build в общий volume и держится живым.
# Это удобнее, чем init-контейнер: на каждый перезапуск front-сервиса dist обновляется.
FROM alpine:3.20
RUN apk add --no-cache rsync
COPY --from=builder /app/dist /app/dist
CMD sh -c "rsync -a --delete /app/dist/ /shared/ && tail -f /dev/null"
