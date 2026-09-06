"""Переводы публичного сайта (ru/en)."""
from __future__ import annotations

from fastapi import APIRouter
from db import get_db
from fastapi import Depends
from fastapi import HTTPException
from models import Translation
from schemas import TranslationIn
from schemas import TranslationOut
from sqlalchemy.orm import Session
import auth as auth_mod

router = APIRouter(tags=["переводы"])

#: Языки публичного сайта. Набор закрытый: по неизвестному коду создавалась бы
#: пустая запись-болванка, и сидер потом счёл бы язык уже заполненным.
_ALLOWED_LANGS = {"ru", "en"}


@router.get("/api/content/translations/{lang}", response_model=TranslationOut)
def translation_get(lang: str, db: Session = Depends(get_db)) -> Translation:
    if lang not in _ALLOWED_LANGS:
        raise HTTPException(status_code=400, detail="unsupported lang")
    tr = db.get(Translation, lang)
    if not tr:
        # Пустой документ — фронт упадёт на baked-in defaults.
        tr = Translation(lang=lang, data={})
        db.add(tr)
        db.commit()
        db.refresh(tr)
    return tr


@router.put("/api/content/translations/{lang}", response_model=TranslationOut)
def translation_put(
    lang: str,
    payload: TranslationIn,
    db: Session = Depends(get_db),
    _: object = Depends(auth_mod.require_auth),
) -> Translation:
    if lang not in _ALLOWED_LANGS:
        raise HTTPException(status_code=400, detail="unsupported lang")
    tr = db.get(Translation, lang)
    if not tr:
        tr = Translation(lang=lang, data=payload.data)
        db.add(tr)
    else:
        tr.data = payload.data
    db.commit()
    db.refresh(tr)
    return tr
