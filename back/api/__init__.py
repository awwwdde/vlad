"""Роутеры панели, по одному на предметную область.

Раньше все тридцать с лишним эндпоинтов лежали в main.py одним файлом на
восемьсот строк: проекты, домены, секреты, контент сайта и заявки вперемешку.
Разбиение по областям - не косметика: по имени файла видно, где что искать,
а в /docs эндпоинты сгруппированы по тегам, а не идут сплошным списком.

Пути остались прежними и заданы в декораторах целиком, без префиксов роутеров:
так маршрут виден на месте, а не собирается из двух половин.
"""
from __future__ import annotations

from fastapi import APIRouter

from api import (
    auth,
    domains,
    env_vars,
    health,
    messages,
    metrics,
    portfolio,
    projects,
    site_settings,
    translations,
)

#: Порядок задаёт порядок разделов в /docs - от служебного к контенту.
ROUTERS: tuple[APIRouter, ...] = (
    health.router,
    auth.router,
    projects.router,
    metrics.router,
    domains.router,
    env_vars.router,
    portfolio.router,
    site_settings.router,
    translations.router,
    messages.router,
)
