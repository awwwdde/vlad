"""Флаги публичного сайта (coming_soon и прочее)."""
from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from site_settings_validation import EDITABLE, validate_settings
from db import get_db
from fastapi import Depends
from models import SiteSetting
from schemas import SiteSettingIn
from schemas import SiteSettingOut
from sqlalchemy import select
from sqlalchemy.orm import Session
import auth as auth_mod

router = APIRouter(tags=["настройки сайта"])

class SettingsPatch(BaseModel):
    values: dict[str, str] = Field(max_length=30)


@router.put('/api/site/settings')
def settings_batch(payload: SettingsPatch, db: Session = Depends(get_db), _: object = Depends(auth_mod.require_auth)) -> dict[str, str]:
    rows = {row.key: row for row in db.scalars(select(SiteSetting))}
    try:
        changes = validate_settings(payload.values, {key: row.value for key, row in rows.items()})
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    for key, value in changes.items():
        if key in rows:
            rows[key].value = value
        else:
            rows[key] = SiteSetting(key=key, value=value)
            db.add(rows[key])
    db.commit()
    return {key: row.value for key, row in rows.items()}


@router.get("/api/site/settings")
def site_settings_list(db: Session = Depends(get_db)) -> dict[str, str]:
    """Все настройки одним словарём (key → value)."""
    rows = db.scalars(select(SiteSetting))
    return {r.key: r.value for r in rows}


@router.put("/api/site/settings/{key}", response_model=SiteSettingOut)
def site_settings_put(
    key: str,
    payload: SiteSettingIn,
    db: Session = Depends(get_db),
    _: object = Depends(auth_mod.require_auth),
) -> SiteSetting:
    if key in EDITABLE:
        settings_batch(SettingsPatch(values={key: payload.value}), db, _)
        return db.get(SiteSetting, key)
    setting = db.get(SiteSetting, key)
    if setting is None:
        setting = SiteSetting(key=key, value=payload.value)
        db.add(setting)
    else:
        setting.value = payload.value
    db.commit()
    db.refresh(setting)
    return setting
