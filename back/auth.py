"""Авторизация панели: bcrypt-хэши + JWT для веб-админки.

Параллельно живут две схемы (см. require_auth):
  • JWT (выпускается /api/auth/login, токен в заголовке Authorization: Bearer …)
    — для веб-админки и любых интерактивных сессий.
  • Статический API_TOKEN из .env (тот же заголовок) — для CLI и автоматизаций.
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone

import bcrypt
import jwt
from fastapi import Depends, Header, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from config import settings
from db import get_db
from models import User

_JWT_ALG = "HS256"
# bcrypt молча обрезает пароли длиннее 72 байт — пред-хэшируем через SHA-256
# в hex (64 байта), чтобы любой пароль вписался без потерь.
import hashlib


# ── Пароли ───────────────────────────────────────────────────────────────────

def _prepare(plain: str) -> bytes:
    return hashlib.sha256(plain.encode("utf-8")).hexdigest().encode("ascii")


def hash_password(plain: str) -> str:
    return bcrypt.hashpw(_prepare(plain), bcrypt.gensalt()).decode("ascii")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(_prepare(plain), hashed.encode("ascii"))
    except ValueError:
        return False


# ── JWT ──────────────────────────────────────────────────────────────────────

def issue_jwt(user: User) -> tuple[str, datetime]:
    """Подписать access-токен. Возвращает (token, expires_at)."""
    expires_at = datetime.now(timezone.utc) + timedelta(hours=settings.jwt_ttl_hours)
    payload = {
        "sub": str(user.id),
        "email": user.email,
        "exp": int(expires_at.timestamp()),
    }
    token = jwt.encode(payload, settings.jwt_secret, algorithm=_JWT_ALG)
    return token, expires_at


def _decode_jwt(token: str) -> dict | None:
    try:
        return jwt.decode(token, settings.jwt_secret, algorithms=[_JWT_ALG])
    except jwt.PyJWTError:
        return None


# ── Зависимости FastAPI ──────────────────────────────────────────────────────

def _extract_bearer(authorization: str) -> str | None:
    if not authorization.startswith("Bearer "):
        return None
    return authorization[len("Bearer ") :].strip() or None


def require_auth(
    authorization: str = Header(default=""),
    db: Session = Depends(get_db),
) -> User | None:
    """Пропускает запрос, если предъявлен валидный JWT ИЛИ статический API_TOKEN.

    Возвращает User для JWT-сессии (нужен в эндпоинтах /me, аудита и пр.)
    и None — для CLI с API_TOKEN.
    """
    token = _extract_bearer(authorization)
    if not token:
        raise HTTPException(status_code=401, detail="Требуется авторизация")

    # CLI / автоматизация
    if token == settings.api_token:
        return None

    # Веб-админка
    payload = _decode_jwt(token)
    if payload and (sub := payload.get("sub")):
        user = db.get(User, int(sub))
        if user and user.is_active:
            return user

    raise HTTPException(status_code=401, detail="Неверный или просроченный токен")


def require_user(user: User | None = Depends(require_auth)) -> User:
    """Эндпоинты, которым нужна именно веб-сессия (например, /auth/me)."""
    if user is None:
        raise HTTPException(status_code=403, detail="Только для веб-админа")
    return user
