"""Движок деплоя гостевых проектов на docker-py.

Один проект = два контейнера в общей сети awwwdde_net:
    <slug>_db   — Postgres 16 (свой volume <slug>_db_data)
    <slug>_app  — образ, собранный из Dockerfile гостя; слушает :8080

Полный цикл deploy():
    1. подготовить исходники (git clone / уже лежащая папка в workspaces);
    2. docker build → образ awwwdde/<slug>:latest;
    3. поднять (или переиспользовать) Postgres-контейнер гостя;
    4. (пере)создать app-контейнер с DATABASE_URL на свой db;
    5. дождаться, пока app начнёт отвечать на /healthz;
    6. прописать маршрут в Caddy (<slug>.awwwdde.art → <slug>_app:8080).

Гостевой контракт (что должен иметь проект, чтобы «заехать»):
    • Dockerfile в корне исходников;
    • app слушает порт 8080;
    • миграции+seed на старте контейнера;
    • эндпоинт GET /healthz, отвечающий 200, когда готов;
    • БД берётся из переменной окружения DATABASE_URL.
"""
from __future__ import annotations

import secrets
import shutil
import subprocess
import time
from pathlib import Path

from dataclasses import dataclass

import docker
from docker.errors import APIError, ImageNotFound, NotFound

from config import settings

_client: docker.DockerClient | None = None


def client() -> docker.DockerClient:
    global _client
    if _client is None:
        _client = docker.from_env()
    return _client


class DeployError(RuntimeError):
    """Любая ошибка на этапе деплоя — поднимается с человекочитаемым текстом."""


# ── Вспомогательное ──────────────────────────────────────────────────────────

def ensure_network() -> None:
    """Создать общую docker-сеть, если её ещё нет."""
    try:
        client().networks.get(settings.docker_network)
    except NotFound:
        client().networks.create(settings.docker_network, driver="bridge")


def _names(slug: str) -> tuple[str, str, str, str]:
    """app_container, db_container, image_tag, db_volume."""
    return (
        f"{slug}_app",
        f"{slug}_db",
        f"awwwdde/{slug}:latest",
        f"{slug}_db_data",
    )


def _remove_container(name: str) -> None:
    try:
        c = client().containers.get(name)
        c.remove(force=True)
    except NotFound:
        pass


def prepare_source(slug: str, source: str | None) -> Path:
    """Положить исходники гостя в workspaces/<slug> и вернуть путь.

    source:
      • git-URL (http/https/git@) — клонируем/обновляем;
      • None — ожидаем, что папка workspaces/<slug> уже существует
        (например, её залили через CLI/scp).
    """
    ws = Path(settings.workspaces_dir).resolve()
    ws.mkdir(parents=True, exist_ok=True)
    dest = ws / slug

    is_git = source and (
        source.startswith(("http://", "https://", "git@", "ssh://"))
        or source.endswith(".git")
    )

    if is_git:
        if (dest / ".git").exists():
            subprocess.run(["git", "-C", str(dest), "pull", "--ff-only"], check=True)
        else:
            if dest.exists():
                shutil.rmtree(dest)
            subprocess.run(["git", "clone", "--depth", "1", source, str(dest)], check=True)
    elif source and Path(source).exists() and Path(source).resolve() != dest:
        # source — локальная папка: копируем содержимое в workspace.
        if dest.exists():
            shutil.rmtree(dest)
        shutil.copytree(source, dest, ignore=shutil.ignore_patterns(
            ".git", "node_modules", "dist", "__pycache__", "*.db", "backups"
        ))

    if not dest.exists():
        raise DeployError(
            f"Исходники не найдены: ни git-URL, ни папка {dest}. "
            f"Передайте source (git-URL) или залейте код в workspaces/{slug}."
        )
    if not (dest / "Dockerfile").exists():
        raise DeployError(f"В {dest} нет Dockerfile — нарушен контракт гостя.")
    return dest


# ── Сборка образа ────────────────────────────────────────────────────────────

def build_image(slug: str, context_dir: Path) -> str:
    _, _, image_tag, _ = _names(slug)
    try:
        # low-level build, чтобы поток логов можно было пробросить позже.
        client().images.build(path=str(context_dir), tag=image_tag, rm=True, pull=False)
    except (APIError, Exception) as exc:  # noqa: BLE001
        raise DeployError(f"docker build упал: {exc}") from exc
    return image_tag


# ── Postgres гостя ───────────────────────────────────────────────────────────

def ensure_db(slug: str, db_password: str) -> str:
    """Поднять Postgres-контейнер гостя (если ещё не поднят) и вернуть его имя."""
    _, db_container, _, db_volume = _names(slug)
    try:
        c = client().containers.get(db_container)
        if c.status != "running":
            c.start()
        return db_container
    except NotFound:
        pass

    client().containers.run(
        image="postgres:16-alpine",
        name=db_container,
        detach=True,
        restart_policy={"Name": "unless-stopped"},
        network=settings.docker_network,
        environment={
            "POSTGRES_USER": slug,
            "POSTGRES_PASSWORD": db_password,
            "POSTGRES_DB": slug,
        },
        volumes={db_volume: {"bind": "/var/lib/postgresql/data", "mode": "rw"}},
        healthcheck={
            "test": ["CMD-SHELL", f"pg_isready -U {slug} -d {slug}"],
            "interval": 5_000_000_000,   # 5s в наносекундах
            "timeout": 3_000_000_000,
            "retries": 10,
        },
    )
    _wait_db_ready(db_container, slug)
    return db_container


def _wait_db_ready(db_container: str, slug: str, timeout: int = 60) -> None:
    deadline = time.time() + timeout
    while time.time() < deadline:
        try:
            c = client().containers.get(db_container)
            code, _ = c.exec_run(f"pg_isready -U {slug} -d {slug}")
            if code == 0:
                return
        except NotFound:
            pass
        time.sleep(2)
    raise DeployError(f"Postgres {db_container} не поднялся за {timeout}с.")


# ── App гостя ────────────────────────────────────────────────────────────────

def run_app(
    slug: str,
    image_tag: str,
    database_url: str,
    *,
    secret_key: str,
    jwt_secret: str,
    extra_env: dict[str, str] | None = None,
) -> str:
    """Поднять app-контейнер гостя.

    Базовый env (DATABASE_URL/SECRET_KEY/JWT_SECRET/PUBLIC_SITE_URL) формируется
    автоматически. `extra_env` — пользовательский набор из ProjectEnvVar
    (BOOTSTRAP_ADMIN_*, TG_BOT_TOKEN и пр.). Пользовательские ключи **могут
    перебивать дефолты** — это намеренно (например, если кто-то хочет
    зафиксировать свой PUBLIC_SITE_URL).
    """
    app_container, _, _, _ = _names(slug)
    _remove_container(app_container)  # пересоздаём начисто на каждый деплой

    environment: dict[str, str] = {
        "DATABASE_URL": database_url,
        "PUBLIC_SITE_URL": f"https://{slug}.{settings.base_domain}",
        # Базовые секреты, которых гость почти всегда хочет (pydantic-settings
        # типично требует их обязательными). Стабильны между деплоями —
        # хранятся в Project и переживают пересоздание контейнера.
        "SECRET_KEY": secret_key,
        "JWT_SECRET": jwt_secret,
    }
    if extra_env:
        environment.update(extra_env)

    client().containers.run(
        image=image_tag,
        name=app_container,
        detach=True,
        restart_policy={"Name": "unless-stopped"},
        network=settings.docker_network,
        environment=environment,
    )
    return app_container


def wait_healthy(slug: str, timeout: int = 120) -> None:
    """Ждём, пока app начнёт отвечать 200 на /healthz (изнутри сети)."""
    app_container, _, _, _ = _names(slug)
    deadline = time.time() + timeout
    last = ""
    while time.time() < deadline:
        try:
            c = client().containers.get(app_container)
            if c.status == "exited":
                logs = c.logs(tail=40).decode("utf-8", "replace")
                raise DeployError(f"app-контейнер упал на старте:\n{logs}")
            code, out = c.exec_run(
                f"sh -c 'wget -qO- http://localhost:{settings.guest_app_port}/healthz "
                f"|| curl -fsS http://localhost:{settings.guest_app_port}/healthz'"
            )
            last = out.decode("utf-8", "replace") if out else ""
            if code == 0:
                return
        except NotFound:
            pass
        time.sleep(3)
    raise DeployError(f"app {app_container} не прошёл healthcheck за {timeout}с. {last}")


# ── Высокоуровневые операции ─────────────────────────────────────────────────

def gen_db_password() -> str:
    return secrets.token_urlsafe(24)


def gen_secret() -> str:
    """Сильный случайный секрет для SECRET_KEY / JWT_SECRET гостя."""
    return secrets.token_urlsafe(48)


def stop_project(slug: str) -> None:
    app_container, db_container, _, _ = _names(slug)
    for name in (app_container, db_container):
        try:
            client().containers.get(name).stop()
        except NotFound:
            pass


def start_project(slug: str) -> None:
    app_container, db_container, _, _ = _names(slug)
    for name in (db_container, app_container):
        try:
            client().containers.get(name).start()
        except NotFound:
            pass


def destroy_project(slug: str, *, drop_data: bool = False) -> None:
    """Снести контейнеры (и образ). drop_data=True — ещё и volume БД."""
    app_container, db_container, image_tag, db_volume = _names(slug)
    _remove_container(app_container)
    _remove_container(db_container)
    try:
        client().images.remove(image_tag, force=True)
    except ImageNotFound:
        pass
    if drop_data:
        try:
            client().volumes.get(db_volume).remove(force=True)
        except NotFound:
            pass


def app_logs(slug: str, tail: int = 200) -> str:
    app_container, _, _, _ = _names(slug)
    try:
        return client().containers.get(app_container).logs(tail=tail).decode(
            "utf-8", "replace"
        )
    except NotFound:
        return f"(контейнер {app_container} не найден)"


# ── Съём нагрузки ────────────────────────────────────────────────────────────

@dataclass(slots=True)
class ContainerStats:
    """Мгновенный срез нагрузки одного контейнера."""

    state: str
    restarts: int
    cpu_percent: float
    mem_bytes: int
    mem_limit_bytes: int
    net_rx_bytes: int
    net_tx_bytes: int
    blk_read_bytes: int
    blk_write_bytes: int


def container_stats(name: str) -> ContainerStats | None:
    """Снять нагрузку контейнера. None - если контейнера нет.

    stream=False снимает ровно один срез. Докер в этом режиме отдаёт и
    предыдущий замер (precpu_stats), поэтому процент CPU считается по разнице
    прямо здесь и второй запрос не нужен.
    """
    try:
        c = client().containers.get(name)
    except NotFound:
        return None
    except APIError as exc:
        raise DeployError(f"docker недоступен: {exc}") from exc

    state = (c.attrs.get("State") or {})
    restarts = int(state.get("RestartCount") or c.attrs.get("RestartCount") or 0)
    status = str(state.get("Status") or c.status or "unknown")

    if status != "running":
        # У остановленного контейнера статистики нет, но факт остановки важен.
        return ContainerStats(status, restarts, 0.0, 0, 0, 0, 0, 0, 0)

    raw = c.stats(stream=False)
    return ContainerStats(
        state=status,
        restarts=restarts,
        cpu_percent=_cpu_percent(raw),
        mem_bytes=int((raw.get("memory_stats") or {}).get("usage") or 0),
        mem_limit_bytes=int((raw.get("memory_stats") or {}).get("limit") or 0),
        **_io_totals(raw),
    )


def _cpu_percent(raw: dict) -> float:
    """Процент CPU по разнице с предыдущим замером, как это делает `docker stats`."""
    cpu = raw.get("cpu_stats") or {}
    pre = raw.get("precpu_stats") or {}
    cpu_delta = (cpu.get("cpu_usage") or {}).get("total_usage", 0) - (
        pre.get("cpu_usage") or {}
    ).get("total_usage", 0)
    sys_delta = cpu.get("system_cpu_usage", 0) - pre.get("system_cpu_usage", 0)
    if cpu_delta <= 0 or sys_delta <= 0:
        return 0.0
    # online_cpus отсутствует на старых демонах - тогда считаем по длине массива.
    cpus = cpu.get("online_cpus") or len((cpu.get("cpu_usage") or {}).get("percpu_usage") or [1])
    return round(cpu_delta / sys_delta * cpus * 100.0, 2)


def _io_totals(raw: dict) -> dict[str, int]:
    """Суммарные счётчики сети и диска. Значения кумулятивные с момента старта."""
    rx = tx = 0
    for iface in (raw.get("networks") or {}).values():
        rx += int(iface.get("rx_bytes") or 0)
        tx += int(iface.get("tx_bytes") or 0)

    read = write = 0
    for entry in ((raw.get("blkio_stats") or {}).get("io_service_bytes_recursive") or []):
        op = str(entry.get("op", "")).lower()
        if op == "read":
            read += int(entry.get("value") or 0)
        elif op == "write":
            write += int(entry.get("value") or 0)

    return {
        "net_rx_bytes": rx,
        "net_tx_bytes": tx,
        "blk_read_bytes": read,
        "blk_write_bytes": write,
    }


def db_size_bytes(slug: str) -> int | None:
    """Размер гостевой БД. None - если контейнер недоступен или запрос не прошёл."""
    _, db_container, _, _ = _names(slug)
    try:
        c = client().containers.get(db_container)
    except (NotFound, APIError):
        return None
    if c.status != "running":
        return None
    code, out = c.exec_run(
        ["psql", "-U", slug, "-d", slug, "-tAc", f"SELECT pg_database_size('{slug}')"],
        demux=False,
    )
    if code != 0:
        return None
    try:
        return int(out.decode().strip())
    except (ValueError, AttributeError):
        return None
