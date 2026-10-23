"""Кастомные домены гостевого проекта."""
from __future__ import annotations

from fastapi import APIRouter
from config import settings
from db import get_db
from fastapi import Depends
from fastapi import HTTPException
from models import Project
from schemas import DomainIn
from schemas import ProjectOut
from sqlalchemy import select
from sqlalchemy.orm import Session
import auth as auth_mod
import caddy
from api.projects import editable_project

router = APIRouter(tags=["домены"])


@router.post("/api/projects/{slug}/domains", response_model=ProjectOut)
def add_domain(
    slug: str,
    payload: DomainIn,
    db: Session = Depends(get_db),
    _: object = Depends(auth_mod.require_auth),
) -> Project:
    proj = editable_project(db, slug)
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
    if proj.deployed_at:
        caddy.upsert_route(slug, upstream=proj.upstream, domains=proj.custom_domains)
    db.commit()
    db.refresh(proj)
    return proj


@router.delete("/api/projects/{slug}/domains/{domain}", response_model=ProjectOut)
def remove_domain(
    slug: str,
    domain: str,
    db: Session = Depends(get_db),
    _: object = Depends(auth_mod.require_auth),
) -> Project:
    proj = editable_project(db, slug)
    domain = domain.strip().lower().rstrip(".")
    current = [d for d in (proj.custom_domains or []) if d != domain]
    proj.custom_domains = current
    if proj.deployed_at:
        caddy.upsert_route(slug, upstream=proj.upstream, domains=proj.custom_domains)
    db.commit()
    db.refresh(proj)
    return proj
