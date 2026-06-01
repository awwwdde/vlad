# Деплой awwwdde на Timeweb Cloud VPS

Гайд от пустого VPS до работающего `https://awwwdde.art/admin`.

## 0. Что должно быть до начала

- Куплен VPS у Timeweb Cloud (Ubuntu 22.04 или 24.04, 2 vCPU / 4 GB / 80 GB).
- Куплен домен `awwwdde.art`.
- Есть **IP VPS** и **root-пароль** (или SSH-ключ) из письма Timeweb.

## 1. DNS — в панели Timeweb

В личном кабинете Timeweb → раздел **DNS** для домена `awwwdde.art` — добавить две A-записи:

| Тип | Имя | Значение |
|---|---|---|
| A | `@` | `IP_твоего_VPS` |
| A | `*` | `IP_твоего_VPS` |

Вторая (wildcard) — обязательна. Без неё `npure.awwwdde.art` и любые
другие поддомены не зарезолвятся. TTL по умолчанию.

Подождать 10-30 минут, пока DNS разойдётся. Проверить:

```bash
nslookup awwwdde.art
nslookup npure.awwwdde.art   # должно вернуть тот же IP
```

## 2. Залить код в git (один раз, локально на Windows)

Если ещё не сделал:

```powershell
cd C:\Users\vlad\Documents\542\awwwdde
git init
git add .
git commit -m "init: awwwdde platform"
# Создай приватный репо на github.com/new (например awwwdde)
git remote add origin git@github.com:ТВОЙ_USERNAME/awwwdde.git
git branch -M main
git push -u origin main
```

`.gitignore` уже исключает `.env`, `node_modules`, `.venv` и пр. — секреты
не утекут.

## 3. SSH на VPS и базовая настройка

```bash
ssh root@IP_VPS

# Обновление + docker + docker compose + git
apt update && apt -y upgrade
apt -y install docker.io docker-compose-v2 git ufw

# Firewall: только SSH, HTTP, HTTPS
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

# Запустить и автостарт docker
systemctl enable --now docker
docker --version
docker compose version
```

## 4. Клон репозитория

```bash
mkdir -p /opt && cd /opt
# Публичный репо:
git clone https://github.com/ТВОЙ_USERNAME/awwwdde.git
# ИЛИ приватный по SSH (нужен ssh-ключ на VPS, который добавлен в Github → Settings → SSH keys):
# ssh-keygen -t ed25519 -C "root@vps"; cat ~/.ssh/id_ed25519.pub  → скопировать в Github
# git clone git@github.com:ТВОЙ_USERNAME/awwwdde.git
cd awwwdde
```

## 5. Создать .env с прод-секретами

```bash
# Сгенерируй НОВЫЕ секреты прямо на сервере:
python3 -c "import secrets, base64, os; print('PANEL_DB_PASSWORD=' + base64.urlsafe_b64encode(os.urandom(18)).decode().rstrip('='))"
python3 -c "import secrets; print('API_TOKEN=' + secrets.token_urlsafe(32))"
python3 -c "import secrets; print('JWT_SECRET=' + secrets.token_urlsafe(48))"
```

Создай `.env` в корне проекта:

```bash
cat > .env <<EOF
BASE_DOMAIN=awwwdde.art
ACME_EMAIL=твой_email@example.com

PANEL_DB_PASSWORD=ВСТАВЬ_сгенерированный_PANEL_DB_PASSWORD
DATABASE_URL=postgresql://awwwdde:ВСТАВЬ_тот_же_PANEL_DB_PASSWORD@panel_db:5432/awwwdde

API_TOKEN=ВСТАВЬ_сгенерированный_API_TOKEN
JWT_SECRET=ВСТАВЬ_сгенерированный_JWT_SECRET
EOF

chmod 600 .env   # никто кроме root не читает
```

> **Важно**: `PANEL_DB_PASSWORD` и пароль в `DATABASE_URL` должны совпадать.

## 6. Поднять всё

```bash
docker compose up -d --build
# Билд занимает 3-7 минут на первом запуске (Node для фронта тяжёлый).
docker compose ps   # должны быть UP: caddy, panel, panel_db, front
docker compose logs -f caddy   # увидишь как Caddy просит cert у LetsEncrypt
```

## 7. Создать первого админа

```bash
docker compose exec panel python cli.py user create me@awwwdde.art
# попросит пароль (дважды). Готово.
```

## 8. Открыть в браузере

- **Сайт**: https://awwwdde.art (cert выпустится за ~30 секунд при первом заходе)
- **Админка**: https://awwwdde.art/admin/login

Если cert не выпускается — посмотри `docker compose logs caddy`. Обычно
ошибка одна: DNS ещё не разошёлся (`nslookup` возвращает не тот IP).

## Обновления потом

Каждый раз когда меняешь код локально:

```powershell
# локально
git add . && git commit -m "..." && git push
```

```bash
# на сервере
cd /opt/awwwdde
git pull
docker compose up -d --build   # пересоберёт только изменившиеся слои
```

## Поднять под-сайт через UI

После того как зайдёшь в `https://awwwdde.art/admin/projects`:

1. «+ Новый» → slug `npure`, source `https://github.com/...npure.git`
   (проект должен соответствовать контракту: Dockerfile в корне, порт 8080,
   `/healthz`, `DATABASE_URL` из env)
2. Галка «развернуть сразу» → жмёшь «Создать»
3. Через ~2-5 минут (build + healthcheck) откроется `https://npure.awwwdde.art`

## Бэкапы

В панели Timeweb включи **автоматические бэкапы VPS** (~150 ₽/мес). Они
снимают весь диск, включая docker-volumes. Если что-то ломаешь — откатишь
весь сервер.

## Что делать если уронишь VPS

1. В Timeweb → восстановить из бэкапа.
2. Или с нуля повторить шаги 3-7. Код берётся из git, секреты — из твоего
   локального бэкапа `.env` (сохрани его себе в **пароли**, например в
   1Password/KeePass).
