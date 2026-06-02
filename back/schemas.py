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


# ── Env-vars гостя ──────────────────────────────────────────────────────────

# Имена в стиле SCREAMING_SNAKE и до 120 символов (как и в обычных Linux ENV).
_ENV_KEY_RE = re.compile(r"^[A-Z_][A-Z0-9_]{0,119}$")


class EnvVarIn(BaseModel):
    """Тело PUT /api/projects/{slug}/env/{key} либо элемент bulk-апсёрта."""

    value: str

    @field_validator("value")
    @classmethod
    def _value(cls, v: str) -> str:
        # Не trimим — иногда хвостовые пробелы значимы (например для PEM-ключей).
        if len(v) > 8000:
            raise ValueError("значение слишком длинное (>8000)")
        return v


class EnvVarOut(BaseModel):
    """Что отдаём в UI. Без plaintext — только маска. Реальное значение
    получают отдельным запросом с ?reveal=true."""

    model_config = ConfigDict(from_attributes=True)

    key: str
    value_preview: str  # masked
    updated_at: datetime


class EnvVarReveal(BaseModel):
    """Ответ на reveal-запрос — plaintext один раз. На фронте лучше не
    кэшировать, не логировать, не отображать долго."""

    key: str
    value: str


def _check_env_key(v: str) -> str:
    v = v.strip()
    if not _ENV_KEY_RE.match(v):
        raise ValueError(
            "ключ env: только A-Z, 0-9, _; должен начинаться с буквы или _"
        )
    return v


class EnvVarBulkItem(BaseModel):
    key: str
    value: str

    @field_validator("key")
    @classmethod
    def _key(cls, v: str) -> str:
        return _check_env_key(v)


class EnvVarsBulk(BaseModel):
    """Заменяет весь набор env-vars проекта на переданный."""

    items: list[EnvVarBulkItem]
