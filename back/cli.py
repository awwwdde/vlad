"""CLI-клиент awwwdde — тонкая обёртка над API панели.

Примеры:
    awwwdde deploy npure --source https://github.com/you/npure.git
    awwwdde deploy npure --source ../npure        # локальная папка
    awwwdde list
    awwwdde logs npure
    awwwdde stop npure
    awwwdde rm npure --drop-data

Адрес панели и токен берутся из окружения:
    AWWWDDE_API   (по умолчанию http://localhost:8000)
    AWWWDDE_TOKEN (по умолчанию dev-token-change-me)
"""
from __future__ import annotations

import os

import httpx
import typer
from rich.console import Console
from rich.table import Table

app = typer.Typer(add_completion=False, help="Управление тестовыми деплоями awwwdde.")
users_app = typer.Typer(help="Управление админ-пользователями панели (локально, через БД).")
app.add_typer(users_app, name="user")
domains_app = typer.Typer(help="Кастомные домены проектов.")
app.add_typer(domains_app, name="domain")
console = Console()

API = os.environ.get("AWWWDDE_API", "http://localhost:8000")
TOKEN = os.environ.get("AWWWDDE_TOKEN", "dev-token-change-me")


def _headers() -> dict:
    return {"Authorization": f"Bearer {TOKEN}"}


def _client() -> httpx.Client:
    return httpx.Client(base_url=API, headers=_headers(), timeout=600.0)


def _die(resp: httpx.Response) -> None:
    try:
        detail = resp.json().get("detail", resp.text)
    except Exception:  # noqa: BLE001
        detail = resp.text
    console.print(f"[red]Ошибка {resp.status_code}:[/red] {detail}")
    raise typer.Exit(1)


@app.command()
def deploy(
    slug: str,
    source: str = typer.Option(None, "--source", "-s", help="git-URL или путь к папке"),
) -> None:
    """Собрать и развернуть проект (создаёт запись, если её ещё нет)."""
    with _client() as c:
        # создаём проект, если отсутствует
        if c.get(f"/api/projects/{slug}").status_code == 404:
            r = c.post("/api/projects", json={"slug": slug, "source": source})
            if r.status_code not in (200, 201):
                _die(r)
        console.print(f"[cyan]Деплой {slug}…[/cyan] (build может занять минуты)")
        r = c.post(f"/api/projects/{slug}/deploy", json={"source": source})
        if r.status_code != 200:
            _die(r)
        data = r.json()
        console.print(f"[green]OK[/green] {data.get('message')}")


@app.command(name="list")
def list_projects() -> None:
    """Показать все проекты."""
    with _client() as c:
        r = c.get("/api/projects")
        if r.status_code != 200:
            _die(r)
    table = Table("slug", "статус", "домен", "развёрнут")
    for p in r.json():
        table.add_row(
            p["slug"], p["status"], p["domain"], (p.get("deployed_at") or "—")
        )
    console.print(table)


@app.command()
def logs(slug: str, tail: int = typer.Option(200, "--tail", "-n")) -> None:
    """Логи app-контейнера проекта."""
    with _client() as c:
        r = c.get(f"/api/projects/{slug}/logs", params={"tail": tail})
        if r.status_code != 200:
            _die(r)
    console.print(r.json()["logs"])


@app.command()
def stop(slug: str) -> None:
    """Остановить контейнеры проекта (данные сохраняются)."""
    with _client() as c:
        r = c.post(f"/api/projects/{slug}/stop")
        if r.status_code != 200:
            _die(r)
    console.print(f"[yellow]■[/yellow] {slug} остановлен")


@app.command()
def start(slug: str) -> None:
    """Запустить ранее остановленный проект."""
    with _client() as c:
        r = c.post(f"/api/projects/{slug}/start")
        if r.status_code != 200:
            _die(r)
    console.print(f"[green]▶[/green] {slug} запущен")


@app.command(name="rm")
def remove(
    slug: str,
    drop_data: bool = typer.Option(False, "--drop-data", help="удалить и БД (volume)"),
) -> None:
    """Снести проект. По умолчанию БД-volume сохраняется."""
    with _client() as c:
        r = c.delete(f"/api/projects/{slug}", params={"drop_data": drop_data})
        if r.status_code != 200:
            _die(r)
    console.print(f"[red]X[/red] {slug} удалён" + (" вместе с БД" if drop_data else ""))


# ── Кастомные домены ────────────────────────────────────────────────────────

@domains_app.command("add")
def domain_add(slug: str, domain: str) -> None:
    """Привязать кастомный домен к проекту."""
    with _client() as c:
        r = c.post(f"/api/projects/{slug}/domains", json={"domain": domain})
        if r.status_code != 200:
            _die(r)
        data = r.json()
    doms = ", ".join(data.get("custom_domains") or []) or "—"
    console.print(f"[green]OK[/green] домен привязан. Кастомные домены: {doms}")
    console.print(
        f"[dim]Дальше: A-запись {domain} → IP этого сервера. "
        f"TLS Caddy выпустит автоматически после резолва DNS.[/dim]"
    )


@domains_app.command("rm")
def domain_rm(slug: str, domain: str) -> None:
    """Отвязать кастомный домен от проекта."""
    with _client() as c:
        r = c.delete(f"/api/projects/{slug}/domains/{domain}")
        if r.status_code != 200:
            _die(r)
    console.print(f"[yellow]–[/yellow] домен {domain} отвязан от {slug}")


@domains_app.command("list")
def domain_list(slug: str) -> None:
    """Показать домены проекта (базовый + кастомные)."""
    with _client() as c:
        r = c.get(f"/api/projects/{slug}")
        if r.status_code != 200:
            _die(r)
        data = r.json()
    table = Table("домен", "тип")
    table.add_row(data["domain"], "базовый")
    for d in data.get("custom_domains") or []:
        table.add_row(d, "кастомный")
    console.print(table)


# ── Управление админ-юзерами ────────────────────────────────────────────────
# Эти команды работают НАПРЯМУЮ с panel_db (минуя HTTP), чтобы можно было
# завести первого администратора, когда веб-логина ещё нет.

@users_app.command("create")
def user_create(
    email: str = typer.Argument(..., help="email админа"),
    password: str = typer.Option(
        None,
        "--password",
        "-p",
        prompt=True,
        hide_input=True,
        confirmation_prompt=True,
        help="пароль (если не указан — спросим интерактивно)",
    ),
) -> None:
    """Создать админ-пользователя (первый bootstrap идёт через эту команду)."""
    from sqlalchemy import select

    import auth as auth_mod  # импорт здесь, чтобы typer не тянул всё при --help
    from db import SessionLocal, init_db
    from models import User

    init_db()
    email_norm = email.lower().strip()
    with SessionLocal() as db:
        if db.scalar(select(User).where(User.email == email_norm)):
            console.print(f"[red]Юзер {email_norm} уже существует[/red]")
            raise typer.Exit(1)
        user = User(email=email_norm, password_hash=auth_mod.hash_password(password))
        db.add(user)
        db.commit()
    console.print(f"[green]OK[/green] Админ {email_norm} создан")


@users_app.command("list")
def user_list() -> None:
    """Показать всех админ-пользователей."""
    from sqlalchemy import select

    from db import SessionLocal
    from models import User

    with SessionLocal() as db:
        users = list(db.scalars(select(User).order_by(User.created_at)))
    table = Table("id", "email", "active", "создан")
    for u in users:
        table.add_row(str(u.id), u.email, "yes" if u.is_active else "no", str(u.created_at))
    console.print(table)


@users_app.command("passwd")
def user_passwd(
    email: str,
    password: str = typer.Option(
        None, "--password", "-p", prompt=True, hide_input=True, confirmation_prompt=True
    ),
) -> None:
    """Сменить пароль админа."""
    from sqlalchemy import select

    import auth as auth_mod
    from db import SessionLocal
    from models import User

    email_norm = email.lower().strip()
    with SessionLocal() as db:
        user = db.scalar(select(User).where(User.email == email_norm))
        if not user:
            console.print(f"[red]Юзер {email_norm} не найден[/red]")
            raise typer.Exit(1)
        user.password_hash = auth_mod.hash_password(password)
        db.commit()
    console.print(f"[green]OK[/green] Пароль обновлён")


if __name__ == "__main__":
    app()
