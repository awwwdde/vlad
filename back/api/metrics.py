"""Нагрузка гостевых стендов: ряды для графиков, здоровье и общая сводка."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, Query
from sqlalchemy import Select, func, select, text
from sqlalchemy.orm import Session

import auth as auth_mod
import engine
from api.deps import get_project_or_404
from db import get_db
from models import HealthEvent, MetricHourly, MetricSample, Project, ProjectStatus
from schemas import (
    HealthEventOut,
    MetricPoint,
    MetricSeries,
    MetricsOut,
    OverviewOut,
    ProjectHealthOut,
    ProjectLoadOut,
)

router = APIRouter(tags=["нагрузка"])

#: Пресеты периодов. Для каждого - глубина, шаг сетки и источник.
#:
#: Час и сутки читаются из сырых замеров: там важна минута, в которую стенд
#: лёг. Неделя и месяц - из часовых срезов: сырые точки за такой период
#: (полмиллиона строк на проект) не нужны ни глазу, ни браузеру.
#:
#: Шаг подобран так, чтобы на графике выходило 60-120 точек. Меньше - теряется
#: форма всплеска, больше - линия превращается в шум, а ответ пухнет.
RANGES: dict[str, tuple[timedelta, int, str]] = {
    "1h": (timedelta(hours=1), 60, "raw"),
    "24h": (timedelta(hours=24), 15 * 60, "raw"),
    "7d": (timedelta(days=7), 3600, "hourly"),
    "30d": (timedelta(days=30), 6 * 3600, "hourly"),
}

RangeName = str


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _bucket(column, seconds: int):
    """Сетка времени с произвольным шагом.

    date_bin умеет любой интервал, в отличие от date_trunc с его фиксированными
    единицами: пятнадцатиминутные корзины через date_trunc не выразить.
    Требует Postgres 14+, что для панели и так обязательное условие.
    """
    # seconds приходит только из RANGES - это наши собственные константы,
    # в запрос не попадает ничего пользовательского.
    return func.date_bin(
        text(f"interval '{seconds} seconds'"),
        column,
        text("timestamptz '2000-01-01'"),
    )


@router.get(
    "/api/projects/{slug}/metrics",
    response_model=MetricsOut,
    summary="Ряды нагрузки для графиков",
)
def project_metrics(
    slug: str,
    range: RangeName = Query(default="24h", pattern="^(1h|24h|7d|30d)$"),
    db: Session = Depends(get_db),
    _: object = Depends(auth_mod.require_auth),
) -> MetricsOut:
    proj = get_project_or_404(db, slug)
    window, step, source = RANGES[range]
    since = _now() - window

    series = (
        _raw_series(db, proj.id, since, step)
        if source == "raw"
        else _hourly_series(db, proj.id, since, step)
    )
    return MetricsOut(
        slug=slug, range=range, resolution=source, step_seconds=step, series=series
    )


def _raw_series(db: Session, project_id: int, since: datetime, step: int) -> list[MetricSeries]:
    """Сырые замеры, усреднённые по корзинам шага."""
    bucket = _bucket(MetricSample.taken_at, step).label("t")
    stmt: Select = (
        select(
            MetricSample.container,
            bucket,
            func.avg(MetricSample.cpu_percent).label("cpu"),
            func.avg(MetricSample.mem_bytes).label("mem"),
            func.max(MetricSample.mem_limit_bytes).label("mem_limit"),
            # Счётчики докера кумулятивные: за корзину прошло столько, на
            # сколько они выросли внутри неё.
            (func.max(MetricSample.net_rx_bytes) - func.min(MetricSample.net_rx_bytes)).label("rx"),
            (func.max(MetricSample.net_tx_bytes) - func.min(MetricSample.net_tx_bytes)).label("tx"),
        )
        .where(MetricSample.project_id == project_id, MetricSample.taken_at >= since)
        .group_by(MetricSample.container, bucket)
        .order_by(bucket)
    )
    return _group(
        db.execute(stmt).all(),
        lambda r: MetricPoint(
            t=r.t,
            cpu=round(float(r.cpu or 0), 2),
            mem=int(r.mem or 0),
            mem_limit=int(r.mem_limit or 0) or None,
            net_rx=max(0, int(r.rx or 0)),
            net_tx=max(0, int(r.tx or 0)),
        ),
    )


def _hourly_series(db: Session, project_id: int, since: datetime, step: int) -> list[MetricSeries]:
    """Часовые срезы. При шаге крупнее часа корзины укрупняются ещё раз."""
    bucket = _bucket(MetricHourly.hour, step).label("t")
    stmt: Select = (
        select(
            MetricHourly.container,
            bucket,
            func.avg(MetricHourly.cpu_avg).label("cpu"),
            func.max(MetricHourly.cpu_max).label("cpu_max"),
            func.avg(MetricHourly.mem_avg).label("mem"),
            func.max(MetricHourly.mem_max).label("mem_max"),
            func.sum(MetricHourly.net_rx_delta).label("rx"),
            func.sum(MetricHourly.net_tx_delta).label("tx"),
        )
        .where(MetricHourly.project_id == project_id, MetricHourly.hour >= since)
        .group_by(MetricHourly.container, bucket)
        .order_by(bucket)
    )
    return _group(
        db.execute(stmt).all(),
        lambda r: MetricPoint(
            t=r.t,
            cpu=round(float(r.cpu or 0), 2),
            cpu_max=round(float(r.cpu_max or 0), 2),
            mem=int(r.mem or 0),
            mem_limit=int(r.mem_max or 0) or None,
            net_rx=int(r.rx or 0),
            net_tx=int(r.tx or 0),
        ),
    )


def _group(rows, to_point) -> list[MetricSeries]:
    """Разложить плоский результат по контейнерам, сохраняя порядок времени."""
    buckets: dict[str, list[MetricPoint]] = {}
    for r in rows:
        buckets.setdefault(r.container, []).append(to_point(r))
    return [MetricSeries(container=k, points=v) for k, v in sorted(buckets.items())]


@router.get(
    "/api/projects/{slug}/health",
    response_model=ProjectHealthOut,
    summary="Состояние стенда: аптайм, рестарты, размер БД",
)
def project_health(
    slug: str,
    range: RangeName = Query(default="24h", pattern="^(1h|24h|7d|30d)$"),
    db: Session = Depends(get_db),
    _: object = Depends(auth_mod.require_auth),
) -> ProjectHealthOut:
    proj = get_project_or_404(db, slug)
    window, _step, _source = RANGES[range]
    since = _now() - window

    events = list(
        db.scalars(
            select(HealthEvent)
            .where(HealthEvent.project_id == proj.id, HealthEvent.at >= since)
            .order_by(HealthEvent.at.desc())
            .limit(50)
        )
    )
    last = db.scalar(
        select(HealthEvent)
        .where(HealthEvent.project_id == proj.id)
        .order_by(HealthEvent.at.desc())
        .limit(1)
    )

    return ProjectHealthOut(
        slug=slug,
        state=last.state if last else None,
        restarts=last.restarts if last else 0,
        uptime_percent=_uptime_percent(db, proj.id, since),
        db_size_bytes=engine.db_size_bytes(slug),
        events=[HealthEventOut.model_validate(e) for e in events],
    )


def _uptime_percent(db: Session, project_id: int, since: datetime) -> float | None:
    """Доля замеров, в которых app-контейнер был живой.

    Считаем по замерам, а не по длительности между событиями: замеры идут
    равномерно, поэтому их доля и есть доля времени, и не приходится
    доопределять, что делать с периодом до первого события.
    """
    total = db.scalar(
        select(func.count())
        .select_from(MetricSample)
        .where(
            MetricSample.project_id == project_id,
            MetricSample.container == "app",
            MetricSample.taken_at >= since,
        )
    )
    if not total:
        return None
    alive = db.scalar(
        select(func.count())
        .select_from(MetricSample)
        .where(
            MetricSample.project_id == project_id,
            MetricSample.container == "app",
            MetricSample.taken_at >= since,
            MetricSample.mem_bytes > 0,
        )
    )
    return round((alive or 0) / total * 100, 1)


#: Пороги, по которым стенд попадает в «требует внимания».
CPU_ALERT_PERCENT = 80.0
MEM_ALERT_RATIO = 0.9


@router.get(
    "/api/metrics/overview",
    response_model=OverviewOut,
    summary="Сводка нагрузки по всем стендам",
)
def overview(
    db: Session = Depends(get_db),
    _: object = Depends(auth_mod.require_auth),
) -> OverviewOut:
    """Последнее известное потребление по каждому проекту плюс итоги.

    Берём последний замер на контейнер, а не среднее: на дашборде нужен ответ
    «что происходит сейчас», а усреднённая за час картина именно текущий
    всплеск и прячет.
    """
    projects = list(db.scalars(select(Project).order_by(Project.created_at.desc())))
    if not projects:
        return OverviewOut(
            at=_now(),
            projects_total=0,
            projects_running=0,
            cpu_percent_total=0.0,
            mem_bytes_total=0,
            projects=[],
        )

    latest = (
        select(
            MetricSample.project_id,
            MetricSample.container,
            func.max(MetricSample.taken_at).label("t"),
        )
        .group_by(MetricSample.project_id, MetricSample.container)
        .subquery()
    )
    rows = db.execute(
        select(MetricSample)
        .join(
            latest,
            (MetricSample.project_id == latest.c.project_id)
            & (MetricSample.container == latest.c.container)
            & (MetricSample.taken_at == latest.c.t),
        )
    ).scalars().all()

    load: dict[int, dict[str, float]] = {}
    for s in rows:
        acc = load.setdefault(s.project_id, {"cpu": 0.0, "mem": 0, "limit": 0})
        acc["cpu"] += s.cpu_percent
        acc["mem"] += s.mem_bytes
        acc["limit"] = max(acc["limit"], s.mem_limit_bytes)

    # Последнее событие здоровья на проект - тем же приёмом, что и замеры.
    last_event = (
        select(HealthEvent.project_id, func.max(HealthEvent.at).label("t"))
        .group_by(HealthEvent.project_id)
        .subquery()
    )
    health = {
        e.project_id: e
        for e in db.execute(
            select(HealthEvent).join(
                last_event,
                (HealthEvent.project_id == last_event.c.project_id)
                & (HealthEvent.at == last_event.c.t),
            )
        ).scalars().all()
    }

    out: list[ProjectLoadOut] = []
    for proj in projects:
        acc = load.get(proj.id, {"cpu": 0.0, "mem": 0, "limit": 0})
        ev = health.get(proj.id)
        out.append(
            ProjectLoadOut(
                slug=proj.slug,
                title=proj.title,
                status=proj.status,
                cpu_percent=round(acc["cpu"], 2),
                mem_bytes=int(acc["mem"]),
                state=ev.state if ev else None,
                restarts=ev.restarts if ev else 0,
                attention=_attention(proj, acc, ev),
            )
        )

    # Проблемные наверх: дашборд должен открываться тем, что требует действий.
    out.sort(key=lambda p: (p.attention is None, -p.cpu_percent))

    return OverviewOut(
        at=_now(),
        projects_total=len(projects),
        projects_running=sum(1 for p in projects if p.status == ProjectStatus.running),
        cpu_percent_total=round(sum(p.cpu_percent for p in out), 2),
        mem_bytes_total=sum(p.mem_bytes for p in out),
        projects=out,
    )


def _attention(proj: Project, acc: dict, ev: HealthEvent | None) -> str | None:
    """Одна причина, по которой на стенд стоит посмотреть. None - всё в норме."""
    if proj.status == ProjectStatus.failed:
        return "последняя операция упала"
    if ev is not None and ev.state not in {"running", "exited"}:
        return f"контейнер в состоянии {ev.state}"
    if proj.status == ProjectStatus.running and ev is not None and ev.state != "running":
        return "числится развёрнутым, но контейнер не запущен"
    if acc["cpu"] >= CPU_ALERT_PERCENT:
        return f"CPU {acc['cpu']:.0f}%"
    if acc["limit"] and acc["mem"] / acc["limit"] >= MEM_ALERT_RATIO:
        return "память у предела"
    return None
