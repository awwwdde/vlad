# Устройство платформы

Техническое описание: из чего собрано, как разворачивается, что где лежит.
Витрина проекта — в [README](README.md).

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
                     │  Caddy   │  apex → Next.js + /api proxy + wildcard-TLS
                     └────┬─────┘                        + Admin API :2019
        ┌─────────────────┼──────────────────┐
        ▼                 ▼                    ▼
   front (Next.js)   npure_app:8080      panel (FastAPI)  ← /admin
                     npure_db (pg)       panel_db (pg)
                                              │
                                   docker.sock + Caddy Admin API
```

- **front/** — публичный сайт на Next.js (App Router, SSR + ISR) и `/admin`
  (грузится отдельным чанком, защищён JWT).
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
# → http://localhost:3000/admin/login
```

Next в dev-режиме проксирует `/api/*` и `/healthz` в `localhost:8000`
(rewrites в `front/next.config.ts`),
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

`/admin` — отдельный чанк с `ssr: false`; публичный сайт не тащит её код.
Набрана теми же токенами, что и сайт (`--bg`, `--fg`, `--muted`, `--line`,
`--accent`), и следует системной теме вместе с ним: своей палитры у панели
больше нет.

- **Дашборд** — счётчики по статусам, последние проекты.
- **Под-сайты** — блоки стендов со статусом и кнопками (развернуть / остановить
  / запустить / логи / .env / домены / удалить). Клик по блоку раскрывает
  нагрузку: плитки состояния, аптайма, рестартов и размера БД, четыре графика
  (процессор, память, приём и отдача сети) с переключателем периода и лента
  событий. Кнопка «Новый стенд» — форма создания (slug, title, git-URL/папка)
  с галкой «развернуть сразу».
- **Контент** — правка переводов главного сайта (ru/en) и site-settings,
  включая флаг `coming_soon`.
- **Портфолио** — карточки работ: тексты на двух языках, ссылка, порядок.
- **Сообщения** — заявки с формы /contact со счётчиком непрочитанных.

## Мониторинг нагрузки

Свой сборщик вместо Prometheus с cAdvisor: связка съедала бы под полгигабайта
RAM и два контейнера, а нужен от неё один вопрос — сколько ест конкретный
стенд. Докер отдаёт эти цифры через уже смонтированный `docker.sock`.

- Фоновая задача панели раз в 15с снимает `docker stats` с `<slug>_app`
  и `<slug>_db`, плюс пишет событие при смене состояния контейнера.
- Хранение двухуровневое: сырые точки живут 48 часов, дальше сворачиваются
  в часовые срезы на 30 дней. Свёртка идёт по завершённым часам, поэтому
  текущий час всегда читается из сырых точек.
- Выдача: `GET /api/projects/{slug}/metrics?range=1h|24h|7d|30d` — ряды для
  графиков, `GET /api/projects/{slug}/health` — аптайм, рестарты, размер БД,
  `GET /api/metrics/overview` — сводка по всем стендам с проблемными наверху.

Периоды 1h и 24h читаются из сырых замеров, 7d и 30d — из часовых срезов;
шаг сетки подобран так, чтобы на графике выходило 60–120 точек.

Графики рисуются своим SVG-компонентом (`front/src/admin/charts/`), без
дашборд-кита. У каждой величины своя ось: две шкалы в одном кадре делают
взаимное положение линий бессмысленным. Палитра рядов посчитана валидатором
и имеет свои ступени под каждую тему — ΔE при дейтеранопии 18.5 в светлой
и 23.8 в тёмной при пороге 8.

## Гостевые проекты

Требования к проекту, который разворачивается под-сайтом, собраны в
[GUEST.md](GUEST.md): контракт (Dockerfile в корне, порт 8080, `/healthz`,
`wget` или `curl` в образе), что платформа отдаёт сама (`DATABASE_URL`,
`PUBLIC_SITE_URL`, `SECRET_KEY`, `JWT_SECRET`, Postgres и TLS), готовые
Dockerfile под FastAPI, Next.js и статику, а также расшифровка ошибок деплоя.

## Структура

```
awwwdde/
├── docker-compose.yml        # хост-стек: caddy + panel + panel_db + front
├── .env.example
├── deploy/
│   ├── Caddy.Dockerfile      # Caddy + DNS-плагин wildcard-сертификата
│   └── Caddyfile             # apex → front:3000 + /api proxy + wildcard
├── back/                     # FastAPI-панель + движок + CLI
│   ├── main.py               # только сборка приложения: CORS, lifespan, роутеры
│   ├── bootstrap.py          # старт: init_db, сидеры, реконсайл Caddy
│   ├── api/                  # эндпоинты, по файлу на предметную область
│   │   ├── health.py auth.py projects.py domains.py env_vars.py
│   │   ├── metrics.py        # ряды нагрузки, здоровье стенда, сводка
│   │   ├── portfolio.py site_settings.py translations.py messages.py
│   │   └── deps.py           # общие зависимости роутеров
│   ├── metrics_collector.py  # фоновый съём docker stats + свёртка в часы
│   ├── engine.py             # docker-py: build / run app+db / healthcheck / stats
│   ├── caddy.py              # клиент Caddy Admin API
│   ├── auth.py               # bcrypt + JWT, require_auth
│   ├── config.py db.py models.py schemas.py
│   ├── cli.py                # CLI + `user create/list/passwd`
│   ├── Dockerfile
│   └── requirements.txt
└── front/                    # Next.js: публичный сайт + /admin
    ├── app/                  # маршруты App Router
    ├── src/components/       # шапка, подвал, герой на three.js, секции главной
    ├── src/views/admin/      # экраны панели
    └── Dockerfile            # multi-stage build → standalone-сервер
```

## Статус

- [x] back: модель Project, REST API, движок деплоя, Caddy-клиент, CLI
- [x] back: модель User, bcrypt, JWT-логин, `/api/auth/login` + `/me`
- [x] инфра: docker-compose (caddy + panel + panel_db + front)
- [x] front: публичный сайт на Next.js + защищённый `/admin`
- [x] front-админка: dashboard + управление под-сайтами (deploy/stop/start/logs/delete)
- [x] front-админка: правка контента главного сайта + переводы
- [x] back+front: форма /contact + входящие заявки в админке
- [ ] dashboard: docker stats / disk usage по гостям (next)
- [ ] git-push деплой (webhook / `git push awwwdde main`)
- [ ] стрим логов сборки в реальном времени
- [ ] бэкапы гостевых БД
```
