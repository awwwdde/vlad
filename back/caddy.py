"""Клиент Caddy Admin API.

Caddy держит активную конфигурацию в памяти и отдаёт REST-управление на
:2019. Мы добавляем/убираем по одному маршруту на проект, помечая каждый
стабильным @id ("project_<slug>"), чтобы потом удалять точечно.

Маршрут проекта:
    хост  <slug>.awwwdde.art  →  reverse_proxy  <slug>_app:8080

Базовый сервер (srv0) с автоматическим wildcard-TLS поднимается отдельно
(см. deploy/Caddyfile хоста). Здесь мы только дёргаем его routes.
"""
from __future__ import annotations

import httpx

from config import settings


def _route_id(slug: str) -> str:
    return f"project_{slug}"


def _routes_url() -> str:
    return (
        f"{settings.caddy_admin_url}"
        f"/config/apps/http/servers/{settings.caddy_server}/routes"
    )


def _routes_prepend_url() -> str:
    # POST на индекс 0 вставляет маршрут В НАЧАЛО списка — так роут гостя
    # обходит catch-all заглушку базового Caddyfile (она матчит *.domain).
    return _routes_url() + "/0"


def _id_url(slug: str) -> str:
    return f"{settings.caddy_admin_url}/id/{_route_id(slug)}"


def _build_route(slug: str, upstream: str) -> dict:
    return {
        "@id": _route_id(slug),
        "match": [{"host": [f"{slug}.{settings.base_domain}"]}],
        "handle": [
            {
                "handler": "reverse_proxy",
                "upstreams": [{"dial": upstream}],
            }
        ],
        "terminal": True,
    }


def upsert_route(slug: str, upstream: str | None = None) -> None:
    """Создать или обновить маршрут проекта.

    upstream по умолчанию — "<slug>_app:<guest_app_port>".
    """
    if upstream is None:
        upstream = f"{slug}_app:{settings.guest_app_port}"
    route = _build_route(slug, upstream)

    with httpx.Client(timeout=10.0) as client:
        # Уже есть маршрут с таким @id? — заменяем целиком (PATCH по /id/...).
        existing = client.get(_id_url(slug))
        if existing.status_code == 200:
            r = client.patch(_id_url(slug), json=route)
        else:
            # Иначе — вставляем в начало списка routes сервера (приоритет
            # над catch-all заглушкой).
            r = client.post(_routes_prepend_url(), json=route)
        r.raise_for_status()


def delete_route(slug: str) -> None:
    """Удалить маршрут проекта (идемпотентно — 404 игнорируем)."""
    with httpx.Client(timeout=10.0) as client:
        r = client.delete(_id_url(slug))
        if r.status_code not in (200, 404):
            r.raise_for_status()


def ping() -> bool:
    """Проверка, что Caddy Admin API доступен."""
    try:
        with httpx.Client(timeout=3.0) as client:
            return client.get(f"{settings.caddy_admin_url}/config/").status_code == 200
    except httpx.HTTPError:
        return False
