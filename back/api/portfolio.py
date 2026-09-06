"""Контент публичного сайта: карточки работ."""
from __future__ import annotations

from fastapi import APIRouter
from db import get_db
from fastapi import Depends
from fastapi import HTTPException
from models import PortfolioItem
from schemas import PortfolioItemIn
from schemas import PortfolioItemOut
from schemas import ReorderRequest
from sqlalchemy import select
from sqlalchemy.orm import Session
import auth as auth_mod

router = APIRouter(tags=["портфолио"])


@router.get("/api/content/portfolio", response_model=list[PortfolioItemOut])
def portfolio_list(db: Session = Depends(get_db)) -> list[PortfolioItem]:
    return list(
        db.scalars(
            select(PortfolioItem).order_by(
                PortfolioItem.order_index, PortfolioItem.id
            )
        )
    )


@router.post("/api/content/portfolio", response_model=PortfolioItemOut, status_code=201)
def portfolio_create(
    payload: PortfolioItemIn,
    db: Session = Depends(get_db),
    _: object = Depends(auth_mod.require_auth),
) -> PortfolioItem:
    if db.scalar(select(PortfolioItem).where(PortfolioItem.slug == payload.slug)):
        raise HTTPException(status_code=409, detail="slug уже занят")
    # Кладём в конец списка.
    max_order = db.scalar(
        select(PortfolioItem.order_index).order_by(PortfolioItem.order_index.desc())
    )
    item = PortfolioItem(
        slug=payload.slug,
        link=payload.link,
        image_url=payload.image_url,
        accent=payload.accent,
        ru=payload.ru.model_dump(),
        en=payload.en.model_dump(),
        order_index=(max_order or 0) + 1,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.put("/api/content/portfolio/{slug}", response_model=PortfolioItemOut)
def portfolio_update(
    slug: str,
    payload: PortfolioItemIn,
    db: Session = Depends(get_db),
    _: object = Depends(auth_mod.require_auth),
) -> PortfolioItem:
    item = db.scalar(select(PortfolioItem).where(PortfolioItem.slug == slug))
    if not item:
        raise HTTPException(status_code=404, detail="не найден")
    # Смена slug допустима, но проверяем уникальность.
    if payload.slug != slug and db.scalar(
        select(PortfolioItem).where(PortfolioItem.slug == payload.slug)
    ):
        raise HTTPException(status_code=409, detail="новый slug уже занят")
    item.slug = payload.slug
    item.link = payload.link
    item.image_url = payload.image_url
    item.accent = payload.accent
    item.ru = payload.ru.model_dump()
    item.en = payload.en.model_dump()
    db.commit()
    db.refresh(item)
    return item


@router.delete("/api/content/portfolio/{slug}")
def portfolio_delete(
    slug: str,
    db: Session = Depends(get_db),
    _: object = Depends(auth_mod.require_auth),
) -> dict:
    item = db.scalar(select(PortfolioItem).where(PortfolioItem.slug == slug))
    if not item:
        raise HTTPException(status_code=404, detail="не найден")
    db.delete(item)
    db.commit()
    return {"ok": True}


@router.post("/api/content/portfolio/reorder", response_model=list[PortfolioItemOut])
def portfolio_reorder(
    payload: ReorderRequest,
    db: Session = Depends(get_db),
    _: object = Depends(auth_mod.require_auth),
) -> list[PortfolioItem]:
    items = list(db.scalars(select(PortfolioItem)))
    by_slug = {i.slug: i for i in items}
    # Все slug-и должны быть валидны — частичный reorder не делаем.
    missing = [s for s in payload.slugs if s not in by_slug]
    if missing:
        raise HTTPException(status_code=400, detail=f"unknown slugs: {missing}")
    for idx, slug in enumerate(payload.slugs):
        by_slug[slug].order_index = idx
    db.commit()
    return list(
        db.scalars(
            select(PortfolioItem).order_by(
                PortfolioItem.order_index, PortfolioItem.id
            )
        )
    )
