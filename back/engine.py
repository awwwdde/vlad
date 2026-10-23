"""Docker operations used by the durable deployment worker.

Each release gets a distinct image tag and candidate container. The worker
checks that candidate before updating Caddy and active metadata. Legacy
canonical names remain supported for already deployed sites and CLI actions.
DeployOptions defines source/build/runtime/readiness settings.
"""
from __future__ import annotations

import secrets
import re
import shlex
import shutil
import subprocess
import time
from pathlib import Path

from dataclasses import dataclass

import docker
from docker.errors import APIError, ImageNotFound, NotFound

from config import settings
from deploy_options import DeployOptions, build_paths

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


def prepare_source(slug: str, source: str | None, options: DeployOptions | None = None, *, log=None) -> Path:
    """Положить исходники гостя в workspaces/<slug> и вернуть путь.

    source:
      • git-URL (http/https/git@) — клонируем/обновляем;
      • None — ожидаем, что папка workspaces/<slug> уже существует
        (например, её залили через CLI/scp).
    """
    options = options or DeployOptions()
    if not re.fullmatch(r'[a-z0-9][a-z0-9-]{0,39}', slug):
        raise DeployError('Некорректный slug исходников')
    ws = Path(settings.workspaces_dir).resolve()
    ws.mkdir(parents=True, exist_ok=True)
    dest = ws / slug
    if dest.is_symlink() or dest.resolve().parent != ws:
        raise DeployError('Workspace должен оставаться внутри каталога панели')
    if source and (source.startswith('-') or any(ord(c) < 32 for c in source)):
        raise DeployError('Некорректный источник кода')

    is_git = source and (
        source.startswith(("http://", "https://", "git@", "ssh://"))
        or source.endswith(".git")
    )

    def git(args, timeout):
        try:
            result = subprocess.run(args, check=True, capture_output=True, text=True, timeout=timeout)
            if log:
                log((result.stdout or '') + (result.stderr or ''))
        except (subprocess.CalledProcessError, subprocess.TimeoutExpired) as exc:
            if log:
                output = (exc.stdout or b'') if isinstance(exc.stdout, bytes) else (exc.stdout or '')
                errors = (exc.stderr or b'') if isinstance(exc.stderr, bytes) else (exc.stderr or '')
                if isinstance(output, bytes): output = output.decode('utf-8', 'replace')
                if isinstance(errors, bytes): errors = errors.decode('utf-8', 'replace')
                log(output + errors)
            raise DeployError('Git не смог получить исходники. Подробности — в консоли выкладки.') from exc

    if is_git:
        if (dest / ".git").exists():
            git(['git', '-C', str(dest), 'remote', 'set-url', 'origin', source], 30)
            ref = options.git_branch or 'HEAD'
            git(['git', '-C', str(dest), 'fetch', '--depth', '1', 'origin', ref], 300)
            git(['git', '-C', str(dest), 'checkout', '--detach', 'FETCH_HEAD'], 60)
        else:
            if dest.exists() and any(dest.iterdir()):
                raise DeployError('Workspace не пуст и не является Git-репозиторием; исходники не перезаписаны')
            branch = ['--branch', options.git_branch] if options.git_branch else []
            git(["git", "clone", "--depth", "1", *branch, source, str(dest)], 300)
    elif source and not Path(source).is_dir():
        raise DeployError('Указанная папка исходников не найдена')
    elif source and Path(source).resolve() != dest:
        # source — локальная папка: копируем содержимое в workspace.
        src = Path(source).resolve()
        if src.is_relative_to(dest.resolve()) or dest.resolve().is_relative_to(src):
            raise DeployError('Источник и workspace не должны содержать друг друга')
        context, dockerfile = build_paths(src, options)
        if not context.is_dir() or not dockerfile.is_file():
            raise DeployError('В исходной папке не найден контекст сборки или Dockerfile')
        suffix = secrets.token_hex(6)
        incoming, backup = ws / f'.{slug}-incoming-{suffix}', ws / f'.{slug}-backup-{suffix}'
        installed = False
        try:
            shutil.copytree(src, incoming, ignore=shutil.ignore_patterns(
                '.git', 'node_modules', 'dist', '__pycache__', '*.db', 'backups'
            ))
            if dest.exists(): dest.rename(backup)
            try:
                incoming.rename(dest)
                installed = True
            except Exception:
                if backup.exists() and not dest.exists(): backup.rename(dest)
                raise
        finally:
            for temporary in (incoming, *([backup] if installed else [])):
                if temporary.exists():
                    if temporary.resolve().parent != ws or temporary.is_symlink():
                        raise DeployError('Временный путь вышел за пределы workspace')
                    shutil.rmtree(temporary)

    if not dest.exists():
        raise DeployError(
            f"Исходники не найдены: ни git-URL, ни папка {dest}. "
            f"Передайте source (git-URL) или залейте код в workspaces/{slug}."
        )
    return dest


def source_revision(context: Path) -> str | None:
    if not (context / '.git').exists():
        return None
    result = subprocess.run(['git', '-C', str(context), 'rev-parse', 'HEAD'], capture_output=True, text=True, timeout=10, check=True)
    revision = result.stdout.strip()
    return revision if re.fullmatch(r'[0-9a-f]{40,64}', revision) else None


# ── Сборка образа ────────────────────────────────────────────────────────────

def build_image(slug: str, context_dir: Path, options: DeployOptions | None = None, *, image_tag: str | None = None, log=None) -> str:
    image_tag = image_tag or _names(slug)[2]
    options = options or DeployOptions()
    try:
        context, dockerfile = build_paths(context_dir, options)
        if not context.is_dir() or not dockerfile.is_file():
            raise DeployError('Контекст сборки или Dockerfile не найден')
        if log is None:
            client().images.build(path=str(context), dockerfile=options.dockerfile, tag=image_tag, rm=True, pull=options.pull_base_image, nocache=options.no_cache)
        else:
            stream = client().api.build(path=str(context), dockerfile=options.dockerfile, tag=image_tag,
                rm=True, pull=options.pull_base_image, nocache=options.no_cache, decode=True)
            try:
                for event in stream:
                    if event.get('stream'): log(event['stream'])
                    if event.get('status'):
                        log(f"{event.get('id', '')} {event['status']}\n")
                    error = event.get('error') or (event.get('errorDetail') or {}).get('message')
                    if error:
                        log(str(error) + '\n')
                        raise DeployError(str(error))
            finally:
                if hasattr(stream, 'close'): stream.close()

    except (APIError, Exception) as exc:  # noqa: BLE001
        raise DeployError(f"docker build упал: {exc}") from exc
    return image_tag


def remove_release_image(slug: str, image_tag: str | None) -> None:
    """Only panel release tags, without force-removing images used by containers."""
    if not image_tag or not re.fullmatch(r'awwwdde/' + re.escape(slug) + r':release-\d+', image_tag):
        return
    try:
        client().images.remove(image_tag, force=False)
    except ImageNotFound:
        pass


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
    options: DeployOptions | None = None,
    container_name: str | None = None,
    release_id: int | None = None,
) -> str:
    """Поднять app-контейнер гостя.

    Базовый env (DATABASE_URL/SECRET_KEY/JWT_SECRET/PUBLIC_SITE_URL) формируется
    автоматически. `extra_env` — пользовательский набор из ProjectEnvVar
    (BOOTSTRAP_ADMIN_*, TG_BOT_TOKEN и пр.). Пользовательские ключи **могут
    перебивать дефолты** — это намеренно (например, если кто-то хочет
    зафиксировать свой PUBLIC_SITE_URL).
    """
    app_container = container_name or _names(slug)[0]
    options = options or DeployOptions()
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
    if not options.database_enabled:
        environment.pop('DATABASE_URL', None)
    if extra_env:
        environment.update(extra_env)
    if options.app_port is not None:
        environment['PORT'] = str(options.app_port)
    runtime: dict = {}
    if release_id is not None:
        runtime['labels'] = {'awwwdde.project': slug, 'awwwdde.release': str(release_id)}
    if options.memory_mb is not None: runtime['mem_limit'] = f'{options.memory_mb}m'
    if options.cpus is not None: runtime['nano_cpus'] = int(options.cpus * 1_000_000_000)
    if options.pids_limit is not None: runtime['pids_limit'] = options.pids_limit
    if options.start_command: runtime['command'] = options.start_command
    from docker.types import LogConfig
    runtime['log_config'] = LogConfig(type='json-file', config={'max-size': '10m', 'max-file': '3'})

    client().containers.run(
        image=image_tag,
        name=app_container,
        detach=True,
        restart_policy={"Name": options.restart_policy},
        network=settings.docker_network,
        environment=environment,
        **runtime,
    )
    return app_container


def wait_healthy(slug: str, timeout: int | None = None, options: DeployOptions | None = None, *, container_name: str | None = None, log=None) -> None:
    """Check the actual HTTP status; a redirect or HTML error is not readiness."""
    options = options or DeployOptions()
    timeout = timeout or options.health_timeout
    app_container = container_name or _names(slug)[0]
    deadline = time.monotonic() + timeout
    url = shlex.quote(f'http://127.0.0.1:{options.app_port or settings.guest_app_port}{options.health_path}')
    probe = f"if command -v curl >/dev/null 2>&1; then printf 'HTTP_CODE='; curl -sS -o /dev/null --max-time 5 -w '%{{http_code}}' {url}; else wget -S -O /dev/null -T 5 {url} 2>&1; fi"
    last = ''
    previous_probe = None
    previous_output = ''
    while time.monotonic() < deadline:
        try:
            c = client().containers.get(app_container)
            if c.status in ('exited', 'dead'):
                raise DeployError('app-контейнер завершился до готовности; проверьте журнал приложения')
            code, out = c.exec_run(['sh', '-c', probe])
            text = out.decode('utf-8', 'replace') if out else ''
            statuses = re.findall(r'HTTP_CODE=(\d{3})|HTTP/\S+\s+(\d{3})', text)
            status = next((a or b for a, b in statuses), '')
            last = f'HTTP {status}' if status else 'нет HTTP-ответа; в образе необходим curl или wget'
            if code == 0 and status == str(options.health_status):
                if log: log(f'Готовность: HTTP {status}. Проверка пройдена.\n')
                return
        except NotFound:
            last = 'контейнер не найден'
        if log:
            if last != previous_probe:
                log(f'Готовность: {last}\n'); previous_probe = last
            try:
                output = app_logs(slug, tail=120, container_name=app_container)
                if output and not output.startswith('(контейнер'):
                    if output.startswith(previous_output):
                        log(output[len(previous_output):])
                    elif output != previous_output:
                        # Tail shifted: only the suffix after the longest overlap.
                        old_lines, new_lines = previous_output.splitlines(keepends=True), output.splitlines(keepends=True)
                        overlap = next((n for n in range(min(len(old_lines), len(new_lines)), 0, -1) if old_lines[-n:] == new_lines[:n]), 0)
                        log(''.join(new_lines[overlap:]))
                    previous_output = output
            except Exception:
                pass
        remaining = deadline - time.monotonic()
        if remaining > 0: time.sleep(min(options.health_interval, remaining))
    raise DeployError(f'app {app_container} не прошёл проверку за {timeout}с: {last}')


# ── Высокоуровневые операции ─────────────────────────────────────────────────

def gen_db_password() -> str:
    return secrets.token_urlsafe(24)


def gen_secret() -> str:
    """Сильный случайный секрет для SECRET_KEY / JWT_SECRET гостя."""
    return secrets.token_urlsafe(48)


def stop_project(slug: str, *, container_name: str | None = None) -> None:
    app_container, db_container, _, _ = _names(slug)
    app_container = container_name or app_container
    for name in (app_container, db_container):
        try:
            client().containers.get(name).stop()
        except NotFound:
            pass


def start_project(slug: str, *, database_enabled: bool = True, container_name: str | None = None) -> None:
    app_container, db_container, _, _ = _names(slug)
    app_container = container_name or app_container
    for name in ((db_container, app_container) if database_enabled else (app_container,)):
        try:
            client().containers.get(name).start()
        except NotFound:
            pass


def destroy_project(slug: str, *, drop_data: bool = False, release_ids: list[int] | None = None) -> None:
    """Снести контейнеры (и образ). drop_data=True — ещё и volume БД."""
    app_container, db_container, image_tag, db_volume = _names(slug)
    _remove_container(app_container)
    for container in client().containers.list(all=True, filters={'label': f'awwwdde.project={slug}'}):
        container.remove(force=True)
    for release_id in release_ids or []:
        remove_release_image(slug, f'awwwdde/{slug}:release-{release_id}')
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


def app_logs(slug: str, tail: int = 200, *, container_name: str | None = None) -> str:
    app_container, _, _, _ = _names(slug)
    app_container = container_name or app_container
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
