"""Контент публичного сайта: карточки работ."""
from __future__ import annotations

from fastapi import APIRouter
from db import get_db
from fastapi import Depends
from fastapi import File
from fastapi import HTTPException
from fastapi import UploadFile
from models import PortfolioItem
from schemas import ImageOrderIn
from schemas import PortfolioItemIn
from schemas import PortfolioItemOut
from schemas import ReorderRequest
from sqlalchemy import select
from sqlalchemy.orm import Session
import auth as auth_mod
import uploads

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


# ── Галерея карточки ─────────────────────────────────────────────────────────
# Картинки живут отдельно от формы с текстами. Иначе сохранение подписи после
# загрузки фотографий затирало бы список: форма отправляет всё поле целиком,
# а про новые файлы она не знает.

@router.post(
    "/api/content/portfolio/{slug}/images",
    response_model=PortfolioItemOut,
    summary="Загрузить картинки в галерею",
)
async def portfolio_images_upload(
    slug: str,
    files: list[UploadFile] = File(...),
    db: Session = Depends(get_db),
    _: object = Depends(auth_mod.require_auth),
) -> PortfolioItem:
    item = db.scalar(select(PortfolioItem).where(PortfolioItem.slug == slug))
    if not item:
        raise HTTPException(status_code=404, detail="не найден")

    current = list(item.images or [])
    free = uploads.MAX_IMAGES_PER_ITEM - len(current)
    if free <= 0:
        raise HTTPException(
            status_code=409,
            detail=f"уже {uploads.MAX_IMAGES_PER_ITEM} картинок — удалите лишние",
        )
    if len(files) > free:
        raise HTTPException(
            status_code=409,
            detail=f"осталось мест: {free}, а прислано файлов: {len(files)}",
        )

    saved: list[str] = []
    try:
        for f in files:
            raw = await f.read()
            saved.append(uploads.save_image(raw, slug))
    except uploads.UploadError as exc:
        # Частично принятую пачку откатываем: иначе в галерее осядут файлы
        # из загрузки, которую пользователь считает неудавшейся.
        for name in saved:
            uploads.delete_image(name)
        raise HTTPException(status_code=400, detail=f"{f.filename}: {exc}") from exc

    item.images = current + saved
    db.commit()
    db.refresh(item)
    return item


@router.delete(
    "/api/content/portfolio/{slug}/images/{index}",
    response_model=PortfolioItemOut,
    summary="Удалить картинку из галереи",
)
def portfolio_image_delete(
    slug: str,
    index: int,
    db: Session = Depends(get_db),
    _: object = Depends(auth_mod.require_auth),
) -> PortfolioItem:
    item = db.scalar(select(PortfolioItem).where(PortfolioItem.slug == slug))
    if not item:
        raise HTTPException(status_code=404, detail="не найден")

    current = list(item.images or [])
    if not 0 <= index < len(current):
        raise HTTPException(status_code=404, detail="картинки с таким номером нет")

    name = current.pop(index)
    item.images = current
    db.commit()
    # Файл удаляем после коммита: если база откатится, лучше осиротевший файл,
    # чем запись, ссылающаяся в пустоту.
    uploads.delete_image(name)
    db.refresh(item)
    return item


@router.put(
    "/api/content/portfolio/{slug}/images",
    response_model=PortfolioItemOut,
    summary="Изменить порядок картинок",
)
def portfolio_images_reorder(
    slug: str,
    payload: ImageOrderIn,
    db: Session = Depends(get_db),
    _: object = Depends(auth_mod.require_auth),
) -> PortfolioItem:
    """Порядок задаётся номерами текущих позиций. Первая картинка становится
    обложкой карточки на главной, поэтому перестановка - осмысленное действие,
    а не украшение."""
    item = db.scalar(select(PortfolioItem).where(PortfolioItem.slug == slug))
    if not item:
        raise HTTPException(status_code=404, detail="не найден")

    current = list(item.images or [])
    if sorted(payload.order) != list(range(len(current))):
        raise HTTPException(
            status_code=400,
            detail="порядок должен содержать каждый номер ровно один раз",
        )
    item.images = [current[i] for i in payload.order]
    db.commit()
    db.refresh(item)
    return item
