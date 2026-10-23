"""Служебное: живость панели и связанных сервисов."""
from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from db import get_db
import auth
from server_diagnostics import inspect_server
from config import settings
import caddy

router = APIRouter(tags=["служебное"])


@router.get('/api/system/diagnostics')
def diagnostics(db: Session = Depends(get_db), _: object = Depends(auth.require_auth)):
    return inspect_server(db)


@router.get("/healthz")
def healthz() -> dict:
    return {
        "status": "ok",
        "caddy": caddy.ping(),
        "base_domain": settings.base_domain,
    }
