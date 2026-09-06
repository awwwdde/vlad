"""Флаги публичного сайта (coming_soon и прочее)."""
from __future__ import annotations

from fastapi import APIRouter
from db import get_db
from fastapi import Depends
from models import SiteSetting
from schemas import SiteSettingIn
from schemas import SiteSettingOut
from sqlalchemy import select
from sqlalchemy.orm import Session
import auth as auth_mod

router = APIRouter(tags=["настройки сайта"])


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
    setting = db.get(SiteSetting, key)
    if setting is None:
        setting = SiteSetting(key=key, value=payload.value)
        db.add(setting)
    else:
        setting.value = payload.value
    db.commit()
    db.refresh(setting)
    return setting
