"""Разовые действия при старте панели.

Вынесено из main.py: там должно оставаться только собирание приложения.
Каждый шаг безопасен при повторном вызове - панель перезапускается вместе
с compose-стеком, и старт не должен зависеть от того, первый он или сотый.
"""
from __future__ import annotations

from sqlalchemy import select

import caddy
from db import SessionLocal, init_db
from models import Project, ProjectStatus, SiteSetting
from seed_portfolio import seed_if_empty as seed_portfolio_if_empty
from seed_translations import seed_if_empty as seed_translations_if_empty

# "true" - публичный сайт показывает заглушку ComingSoon. "false" - открыт всем.
SITE_DEFAULTS = {
    "coming_soon": "false",
}


def seed_site_defaults() -> None:
    """Прописать дефолтные ключи site_settings, если их нет."""
    with SessionLocal() as db:
        for key, default in SITE_DEFAULTS.items():
            if db.get(SiteSetting, key) is None:
                db.add(SiteSetting(key=key, value=default))
        db.commit()


def reconcile_caddy_routes() -> None:
    """Перепрописать маршруты всех running-проектов в Caddy.

    Маршруты гостей живут в памяти Caddy (через Admin API), а статический
    Caddyfile содержит только apex. Поэтому при перезапуске Caddy роуты
    теряются и все под-сайты падают. Реконсайл вызывается при старте панели
    (compose обычно перезапускает panel вместе с caddy) и восстанавливает их.
    Также доступен вручную: `cli.py reconcile`.
    """
    try:
        if not caddy.ping():
            print("[reconcile] Caddy недоступен - пропускаю восстановление маршрутов")
            return
        with SessionLocal() as db:
            projects = list(
                db.scalars(select(Project).where(Project.status == ProjectStatus.running))
            )
        restored = 0
        for p in projects:
            try:
                caddy.upsert_route(p.slug, domains=p.custom_domains or [])
                restored += 1
            except Exception as exc:  # noqa: BLE001
                print(f"[reconcile] {p.slug}: {exc}")
        if projects:
            print(f"[reconcile] восстановлено маршрутов: {restored}/{len(projects)}")
    except Exception as exc:  # noqa: BLE001
        # Реконсайл не должен мешать старту панели.
        print(f"[reconcile] пропущен из-за ошибки: {exc}")


def bootstrap() -> None:
    """Полный набор стартовых действий в правильном порядке."""
    init_db()
    seed_portfolio_if_empty()
    seed_translations_if_empty()
    seed_site_defaults()
    reconcile_caddy_routes()
