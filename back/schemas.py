"""Pydantic-схемы API панели."""
from __future__ import annotations

import re
from datetime import datetime

from pydantic import BaseModel, ConfigDict, field_validator

from models import ProjectStatus

# slug: 1–40 символов, латиница/цифры/дефис, не с дефиса (поддомен DNS-safe).
_SLUG_RE = re.compile(r"^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$")


class ProjectCreate(BaseModel):
    slug: str
    title: str | None = None
    source: str | None = None  # git-URL или путь в workspaces

    @field_validator("slug")
    @classmethod
    def _check_slug(cls, v: str) -> str:
        v = v.strip().lower()
        if not _SLUG_RE.match(v):
            raise ValueError(
                "slug: 1–40 символов, латиница/цифры/дефис, "
                "не начинается и не заканчивается дефисом"
            )
        return v


class ProjectOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    slug: str
    title: str | None
    source: str | None
    status: ProjectStatus
    last_error: str | None
    domain: str
    created_at: datetime
    deployed_at: datetime | None


class DeployRequest(BaseModel):
    # Необязательно переопределить источник на лету (например, новый git-ref).
    source: str | None = None


class ActionResult(BaseModel):
    ok: bool
    project: ProjectOut
    message: str | None = None


# ── Auth ─────────────────────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    email: str
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_at: datetime
    user: "UserOut"


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str
    is_active: bool
    created_at: datetime


LoginResponse.model_rebuild()


# ── Портфолио (контент главного сайта) ───────────────────────────────────────

class I18nBundle(BaseModel):
    """Языковой бандл одного элемента портфолио."""

    title: str = ""
    tagline: str = ""
    desc: str = ""
    tags: list[str] = []


class PortfolioItemIn(BaseModel):
    slug: str
    link: str | None = None
    image_url: str | None = None
    accent: str | None = None
    ru: I18nBundle = I18nBundle()
    en: I18nBundle = I18nBundle()

    @field_validator("slug")
    @classmethod
    def _slug(cls, v: str) -> str:
        v = v.strip().lower()
        if not _SLUG_RE.match(v):
            raise ValueError("slug: латиница/цифры/дефис, 1–40 символов")
        return v


class PortfolioItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    slug: str
    order_index: int
    link: str | None
    image_url: str | None
    accent: str | None
    ru: I18nBundle
    en: I18nBundle
    created_at: datetime
    updated_at: datetime


class ReorderRequest(BaseModel):
    # Новый порядок — массив slug-ов сверху вниз.
    slugs: list[str]


# ── Переводы (контент секций главного сайта) ─────────────────────────────────

class TranslationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    lang: str
    data: dict
    updated_at: datetime


class TranslationIn(BaseModel):
    data: dict


# ── Заявки с публичной формы /contact ────────────────────────────────────────

class ContactMessageIn(BaseModel):
    """То, что шлёт публичная форма. email обязателен, остальное опционально."""

    email: str
    name: str | None = None
    message: str | None = None
    budget: str | None = None
    source: str = "home"  # "home" | "about" | др.

    @field_validator("email")
    @classmethod
    def _email(cls, v: str) -> str:
        v = v.strip().lower()
        # Минимальная валидация — задача формы, не бэка делать тонкую проверку.
        if "@" not in v or "." not in v or len(v) > 254:
            raise ValueError("некорректный email")
        return v


class ContactMessageOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str | None
    email: str
    message: str | None
    budget: str | None
    source: str
    ip: str | None
    user_agent: str | None
    is_read: bool
    created_at: datetime


class MessagePatch(BaseModel):
    is_read: bool
