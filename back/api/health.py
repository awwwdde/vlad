"""Служебное: живость панели и связанных сервисов."""
from __future__ import annotations

from fastapi import APIRouter
from config import settings
import caddy

router = APIRouter(tags=["служебное"])


@router.get("/healthz")
def healthz() -> dict:
    return {
        "status": "ok",
        "caddy": caddy.ping(),
        "base_domain": settings.base_domain,
    }
