"""Сбор нагрузки гостевых контейнеров.

Своя фоновая задача внутри панели вместо Prometheus с cAdvisor. Причина
простая: связка Prometheus + cAdvisor съедает под полгигабайта памяти и два
контейнера на VPS, а нужен от неё один вопрос - сколько ест конкретный стенд.
Докер и так отдаёт эти цифры через уже смонтированный docker.sock, и вся
подсистема укладывается в один файл.

Хранение двухуровневое:
    сырые точки раз в 15с          -> живут 48 часов
    часовые срезы (среднее и пик)  -> живут 30 дней

Свёртка идёт по завершённым часам, поэтому текущий час всегда читается из
сырых точек и график не дёргается на границе часа.
"""
from __future__ import annotations

import asyncio
from datetime import datetime, timedelta, timezone

from sqlalchemy import delete, func, select, text
from sqlalchemy.orm import Session

import engine
from db import SessionLocal
from models import HealthEvent, MetricHourly, MetricSample, Project, ProjectStatus

#: Шаг съёма. 15с - компромисс: всплеск в полминуты уже виден, а за сутки на
#: проект набегает ~5.7 тысячи строк, что для Postgres пренебрежимо.
INTERVAL_SECONDS = 15

#: Сколько живут сырые точки. Двое суток покрывают «вчера вечером всё легло».
RAW_RETENTION = timedelta(hours=48)

#: Сколько живут часовые срезы.
HOURLY_RETENTION = timedelta(days=30)

#: Как часто запускать свёртку и уборку. Чаще незачем: работа идёт по часам.
MAINTENANCE_EVERY = timedelta(minutes=10)

#: Контейнеры, которые снимаем с каждого проекта.
CONTAINERS = ("app", "db")


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _floor_hour(moment: datetime) -> datetime:
    return moment.replace(minute=0, second=0, microsecond=0)


# ── Один проход сбора ────────────────────────────────────────────────────────

def collect_once(db: Session) -> int:
    """Снять нагрузку со всех развёрнутых проектов. Возвращает число замеров.

    Проекты в статусе created пропускаем: контейнеров у них ещё нет, и докер
    на каждый отвечал бы NotFound. Остановленные снимаем - ноль нагрузки у
    остановленного стенда тоже факт, и по нему видно, что он стоит.
    """
    projects = list(
        db.scalars(select(Project).where(Project.status != ProjectStatus.created))
    )
    written = 0

    for proj in projects:
        app_state: str | None = None
        app_restarts = 0

        for kind in CONTAINERS:
            name = f"{proj.slug}_{kind}"
            try:
                stats = engine.container_stats(name)
            except Exception as exc:  # noqa: BLE001
                # Сбор метрик не должен ронять панель: докер мог моргнуть.
                print(f"[metrics] {name}: {exc}")
                continue
            if stats is None:
                continue

            db.add(
                MetricSample(
                    project_id=proj.id,
                    container=kind,
                    cpu_percent=stats.cpu_percent,
                    mem_bytes=stats.mem_bytes,
                    mem_limit_bytes=stats.mem_limit_bytes,
                    net_rx_bytes=stats.net_rx_bytes,
                    net_tx_bytes=stats.net_tx_bytes,
                    blk_read_bytes=stats.blk_read_bytes,
                    blk_write_bytes=stats.blk_write_bytes,
                )
            )
            written += 1

            if kind == "app":
                app_state, app_restarts = stats.state, stats.restarts

        if app_state is not None:
            _record_health(db, proj, app_state, app_restarts)

    db.commit()
    return written


def _record_health(db: Session, proj: Project, state: str, restarts: int) -> None:
    """Записать событие, только если состояние изменилось.

    Писать каждые 15 секунд «всё ещё running» бессмысленно: таблица распухнет,
    а полезного сигнала в ней ноль. Событие - это именно смена состояния или
    новый рестарт.
    """
    last = db.scalar(
        select(HealthEvent)
        .where(HealthEvent.project_id == proj.id)
        .order_by(HealthEvent.at.desc())
        .limit(1)
    )
    if last is not None and last.state == state and last.restarts == restarts:
        return
    db.add(HealthEvent(project_id=proj.id, state=state, restarts=restarts))


# ── Свёртка и уборка ─────────────────────────────────────────────────────────

def rollup_and_prune(db: Session) -> int:
    """Свернуть завершённые часы в срезы и вычистить просроченное."""
    boundary = _floor_hour(_now())

    # Выражение создаётся один раз и переиспользуется в SELECT и в GROUP BY.
    # Если написать func.date_trunc("hour", ...) в обоих местах, SQLAlchemy
    # подставит два разных плейсхолдера ($1 и $2), Postgres не признает их
    # одним выражением и потребует колонку в GROUP BY. Литерал через text()
    # по той же причине: параметр в GROUP BY сравнивать не с чем.
    hour = func.date_trunc(text("'hour'"), MetricSample.taken_at).label("hour")

    rows = db.execute(
        select(
            MetricSample.project_id,
            MetricSample.container,
            hour,
            func.count().label("samples"),
            func.avg(MetricSample.cpu_percent).label("cpu_avg"),
            func.max(MetricSample.cpu_percent).label("cpu_max"),
            func.avg(MetricSample.mem_bytes).label("mem_avg"),
            func.max(MetricSample.mem_bytes).label("mem_max"),
            # Счётчики докера кумулятивные: за час прошло столько, на сколько
            # они выросли. Рестарт обнуляет счётчик, и разница уйдёт в минус -
            # такие часы отбрасываем ниже, а не пишем отрицательный трафик.
            (func.max(MetricSample.net_rx_bytes) - func.min(MetricSample.net_rx_bytes)).label("rx"),
            (func.max(MetricSample.net_tx_bytes) - func.min(MetricSample.net_tx_bytes)).label("tx"),
        )
        .where(MetricSample.taken_at < boundary)
        .group_by(MetricSample.project_id, MetricSample.container, hour)
    ).all()

    written = 0
    for r in rows:
        existing = db.scalar(
            select(MetricHourly).where(
                MetricHourly.project_id == r.project_id,
                MetricHourly.container == r.container,
                MetricHourly.hour == r.hour,
            )
        )
        values = dict(
            samples=int(r.samples),
            cpu_avg=float(r.cpu_avg or 0),
            cpu_max=float(r.cpu_max or 0),
            mem_avg=int(r.mem_avg or 0),
            mem_max=int(r.mem_max or 0),
            net_rx_delta=max(0, int(r.rx or 0)),
            net_tx_delta=max(0, int(r.tx or 0)),
        )
        if existing:
            for k, v in values.items():
                setattr(existing, k, v)
        else:
            db.add(
                MetricHourly(
                    project_id=r.project_id, container=r.container, hour=r.hour, **values
                )
            )
            written += 1

    now = _now()
    db.execute(delete(MetricSample).where(MetricSample.taken_at < now - RAW_RETENTION))
    db.execute(delete(MetricHourly).where(MetricHourly.hour < now - HOURLY_RETENTION))
    db.commit()
    return written


# ── Фоновая задача ───────────────────────────────────────────────────────────

async def run_forever(stop: asyncio.Event) -> None:
    """Цикл сбора. Живёт столько же, сколько приложение.

    Обращения к докеру и к БД блокирующие, поэтому уходят в поток: иначе на
    время съёма вставал бы весь event loop, а вместе с ним и обработка запросов
    к панели.
    """
    next_maintenance = _now()
    print(f"[metrics] сборщик запущен, интервал {INTERVAL_SECONDS}с")

    while not stop.is_set():
        started = _now()
        try:
            await asyncio.to_thread(_tick, started >= next_maintenance)
            if started >= next_maintenance:
                next_maintenance = started + MAINTENANCE_EVERY
        except Exception as exc:  # noqa: BLE001
            # Цикл обязан пережить любую ошибку: остановившийся сборщик
            # заметить некому, а дыра в графике выглядит как простой стенда.
            print(f"[metrics] проход упал: {exc}")

        # Считаем от начала прохода, чтобы длительность съёма не съезжала в шаг.
        elapsed = (_now() - started).total_seconds()
        try:
            await asyncio.wait_for(stop.wait(), timeout=max(1.0, INTERVAL_SECONDS - elapsed))
        except asyncio.TimeoutError:
            pass

    print("[metrics] сборщик остановлен")


def _tick(with_maintenance: bool) -> None:
    with SessionLocal() as db:
        collect_once(db)
        if with_maintenance:
            rollup_and_prune(db)
