# awwwdde — мини-PaaS для портфолио

Платформа, которая разворачивает сайты-кейсы (как `npure`) одной командой,
каждый на своём поддомене с собственной БД, и управляет ими из единой
веб-админки + CLI.

```
awwwdde deploy npure --source ../npure
→ https://npure.awwwdde.art   (свой контейнер app + свой Postgres)
```

## Архитектура

```
                 *.awwwdde.art  (wildcard DNS → один VPS)
                          │
                     ┌──────────┐
                     │  Caddy   │  apex SPA + /api proxy + wildcard-TLS
                     └────┬─────┘                        + Admin API :2019
        ┌─────────────────┼──────────────────┐
        ▼                 ▼                    ▼
   front (SPA)       npure_app:8080      panel (FastAPI)  ← /admin
                     npure_db (pg)       panel_db (pg)
                                              │
                                   docker.sock + Caddy Admin API
```

- **front/** — публичное портфолио + `/admin` (lazy-chunk, защищён JWT).
- **back/** — FastAPI-панель: модель `Project`/`User`, движок деплоя
  (docker-py), Caddy-клиент, JWT + bcrypt, CLI.
- Гостевые `<slug>_app` + `<slug>_db` создаёт сама панель и цепляет в
  сеть `awwwdde_net` (та же, где живёт caddy).

## Контракт гостевого проекта

Чтобы сайт «заехал» одной командой, его репозиторий должен иметь:

1. `Dockerfile` в корне;
2. приложение слушает порт **8080** внутри контейнера;
3. на старте контейнера прогоняются миграции + seed;
4. эндпоинт `GET /healthz` отвечает `200`, когда сервис готов;
5. БД берётся из переменной окружения `DATABASE_URL`.

## Локальный запуск (dev)

```bash
# 1. Postgres для панели (в docker или системный)
docker run -d --name awwwdde_devdb -p 5432:5432 \
  -e POSTGRES_USER=awwwdde -e POSTGRES_PASSWORD=awwwdde -e POSTGRES_DB=awwwdde \
  postgres:16-alpine

# 2. Backend
cd back
python -m venv .venv && .venv\Scripts\activate     # Windows
pip install -r requirements.txt
cp ../.env.example ../.env   # заполнить DATABASE_URL, API_TOKEN, JWT_SECRET
uvicorn main:app --reload --port 8000

# 3. Первый админ (в другом терминале)
cd back
python cli.py user create me@awwwdde.art

# 4. Frontend
cd front
npm install
npm run dev
# → http://localhost:5173/admin/login
```

Vite в dev-режиме проксирует `/api/*` и `/healthz` в `localhost:8000`,
так что админка работает «как в проде» без CORS-плясок.

## Прод (VPS)

1. DNS: A-запись `awwwdde.art` и wildcard `*.awwwdde.art` → IP сервера.
2. `cp .env.example .env` и заполнить (домен, `CF_API_TOKEN`, пароли,
   `API_TOKEN`, `JWT_SECRET`, `DATABASE_URL`).
3. `docker compose up -d --build` — поднимутся caddy + panel + panel_db + front.
4. Завести первого админа:
   ```bash
   docker compose exec panel python cli.py user create me@awwwdde.art
   ```
5. `https://awwwdde.art/admin/login` — войти и пользоваться.

CLI с локальной машины (опционально, через bearer-токен):
```bash
export AWWWDDE_API=https://awwwdde.art
export AWWWDDE_TOKEN=<API_TOKEN из .env>
python back/cli.py deploy npure --source https://github.com/you/npure.git
```

## Веб-админка

`/admin` — отдельный lazy-chunk; публичный сайт не тащит её код.

- **Дашборд** — счётчики по статусам, последние проекты.
- **Под-сайты** — список карточек: deploy / stop / start / логи / delete.
  Кнопка «+ Новый» — форма создания (slug, title, git-URL/папка) с галкой
  «развернуть сразу».
- **Контент** — следующая фаза (правка секций главного сайта и переводов
  en/ru).
- **Сообщения** — следующая фаза (заявки с формы /contact).

## Структура

```
awwwdde/
├── docker-compose.yml        # хост-стек: caddy + panel + panel_db + front
├── .env.example
├── deploy/
│   ├── Caddy.Dockerfile      # Caddy + DNS-плагин wildcard-сертификата
│   └── Caddyfile             # apex SPA + /api proxy + wildcard
├── back/                     # FastAPI-панель + движок + CLI
│   ├── config.py db.py models.py schemas.py
│   ├── auth.py               # bcrypt + JWT, require_auth
│   ├── caddy.py              # клиент Caddy Admin API
│   ├── engine.py             # docker-py: build / run app+db / healthcheck
│   ├── main.py               # REST API панели + /api/auth/*
│   ├── cli.py                # CLI + `user create/list/passwd`
│   ├── Dockerfile
│   └── requirements.txt
└── front/                    # React SPA — публичный сайт + /admin
    ├── src/admin/            # AuthContext, api.ts, ProtectedRoute, AdminApp
    ├── src/pages/admin/      # Login, AdminLayout, Dashboard, Projects
    └── Dockerfile            # multi-stage build → shared volume для Caddy
```

## Статус

- [x] back: модель Project, REST API, движок деплоя, Caddy-клиент, CLI
- [x] back: модель User, bcrypt, JWT-логин, `/api/auth/login` + `/me`
- [x] инфра: docker-compose (caddy + panel + panel_db + front sidecar)
- [x] front: публичный SPA + защищённый `/admin` (lazy)
- [x] front-админка: dashboard + управление под-сайтами (deploy/stop/start/logs/delete)
- [ ] front-админка: правка контента главного сайта + переводы (next)
- [ ] back+front: форма /contact + входящие заявки в админке (next)
- [ ] dashboard: docker stats / disk usage по гостям (next)
- [ ] git-push деплой (webhook / `git push awwwdde main`)
- [ ] стрим логов сборки в реальном времени
- [ ] бэкапы гостевых БД
```
