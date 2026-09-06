"""Кастомные домены гостевого проекта."""
from __future__ import annotations

from fastapi import APIRouter
from config import settings
from db import get_db
from fastapi import BackgroundTasks
from fastapi import Depends
from fastapi import HTTPException
from models import Project
from schemas import DomainIn
from schemas import ProjectOut
from sqlalchemy import select
from sqlalchemy.orm import Session
import auth as auth_mod
import caddy
from api.deps import get_project_or_404

router = APIRouter(tags=["домены"])


def _apply_caddy_route(slug: str, domains: list[str]) -> None:
    """Best-effort применение маршрута в Caddy. Ошибки не валят запрос —
    маршрут переприменится при следующем deploy/start."""
    try:
        caddy.upsert_route(slug, domains=domains)
    except Exception as exc:  # noqa: BLE001
        print(f"[domains] caddy upsert для {slug} не удался: {exc}")


@router.post("/api/projects/{slug}/domains", response_model=ProjectOut)
def add_domain(
    slug: str,
    payload: DomainIn,
    background: BackgroundTasks,
    db: Session = Depends(get_db),
    _: object = Depends(auth_mod.require_auth),
) -> Project:
    proj = get_project_or_404(db, slug)
    domain = payload.domain

    if domain == settings.base_domain or domain.endswith("." + settings.base_domain):
        raise HTTPException(
            status_code=400,
            detail=f"Домены *.{settings.base_domain} управляются панелью автоматически",
        )

    # Уникальность среди всех проектов.
    for other in db.scalars(select(Project)):
        if domain in (other.custom_domains or []):
            raise HTTPException(
                status_code=409,
                detail=f"Домен уже привязан к проекту '{other.slug}'",
            )

    current = list(proj.custom_domains or [])
    if domain not in current:
        current.append(domain)
    proj.custom_domains = current  # переприсваиваем — иначе SQLAlchemy не заметит мутацию JSONB
    db.commit()
    db.refresh(proj)

    # Применяем в Caddy в фоне — ответ возвращается сразу.
    background.add_task(_apply_caddy_route, slug, list(proj.custom_domains))
    return proj


@router.delete("/api/projects/{slug}/domains/{domain}", response_model=ProjectOut)
def remove_domain(
    slug: str,
    domain: str,
    background: BackgroundTasks,
    db: Session = Depends(get_db),
    _: object = Depends(auth_mod.require_auth),
) -> Project:
    proj = get_project_or_404(db, slug)
    domain = domain.strip().lower().rstrip(".")
    current = [d for d in (proj.custom_domains or []) if d != domain]
    proj.custom_domains = current
    db.commit()
    db.refresh(proj)

    background.add_task(_apply_caddy_route, slug, list(proj.custom_domains))
    return proj
