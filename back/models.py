"""Модели БД панели awwwdde."""
from __future__ import annotations

import enum
from datetime import datetime

from sqlalchemy import (
    Boolean,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from db import Base


class ProjectStatus(str, enum.Enum):
    """Жизненный цикл гостевого проекта."""

    created = "created"      # запись есть, ещё ни разу не разворачивался
    building = "building"    # идёт docker build
    deploying = "deploying"  # поднимаем контейнеры / ждём healthcheck
    running = "running"      # app+db живы, роут в Caddy прописан
    stopped = "stopped"     # контейнеры остановлены, данные сохранены
    failed = "failed"       # последняя операция упала (см. last_error)


class Project(Base):
    __tablename__ = "projects"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)

    # slug — основа поддомена и имён контейнеров: <slug>.awwwdde.art, <slug>_app.
    slug: Mapped[str] = mapped_column(String(63), unique=True, index=True)
    title: Mapped[str | None] = mapped_column(String(200), nullable=True)

    # Источник кода: git-URL или путь, который положили в workspaces вручную.
    source: Mapped[str | None] = mapped_column(String(500), nullable=True)

    status: Mapped[ProjectStatus] = mapped_column(
        Enum(ProjectStatus), default=ProjectStatus.created, nullable=False
    )
    last_error: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Имена docker-ресурсов (заполняются движком при деплое).
    app_container: Mapped[str | None] = mapped_column(String(120), nullable=True)
    db_container: Mapped[str | None] = mapped_column(String(120), nullable=True)
    image_tag: Mapped[str | None] = mapped_column(String(200), nullable=True)

    # Сгенерированный пароль БД гостя (нужен для DATABASE_URL и pg_dump).
    db_password: Mapped[str | None] = mapped_column(String(120), nullable=True)

    # Базовые секреты гостя — генерируются при первом деплое и переживают
    # пересоздание контейнера, чтобы JWT/session-токены не инвалидировались.
    # Прокидываются как SECRET_KEY / JWT_SECRET в environment app-контейнера.
    secret_key: Mapped[str | None] = mapped_column(String(120), nullable=True)
    jwt_secret: Mapped[str | None] = mapped_column(String(120), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    deployed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    @property
    def domain(self) -> str:
        from config import settings

        return f"{self.slug}.{settings.base_domain}"

    @property
    def database_url(self) -> str:
        """DATABASE_URL, который прокидывается внутрь гостевого app-контейнера."""
        return (
            f"postgresql://{self.slug}:{self.db_password}"
            f"@{self.db_container}:5432/{self.slug}"
        )

    # Произвольные env-переменные, заданные пользователем через UI.
    # Прокидываются в app-контейнер при деплое поверх дефолтов
    # (DATABASE_URL/SECRET_KEY и пр.). Удобно для BOOTSTRAP_ADMIN_*,
    # TG_BOT_TOKEN и любых других ключей конкретного гостя.
    env_vars: Mapped[list["ProjectEnvVar"]] = relationship(
        "ProjectEnvVar",
        cascade="all, delete-orphan",
        back_populates="project",
        lazy="selectin",
    )


class ProjectEnvVar(Base):
    """Одна env-переменная конкретного гостя. Значение в БД — зашифровано
    Fernet'ом (см. back/secrets_box.py), наружу отдаётся либо masked, либо
    в plaintext через явный reveal-эндпоинт."""

    __tablename__ = "project_env_vars"
    __table_args__ = (
        UniqueConstraint("project_id", "key", name="uq_project_env_key"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    project_id: Mapped[int] = mapped_column(
        ForeignKey("projects.id", ondelete="CASCADE"), index=True
    )
    key: Mapped[str] = mapped_column(String(120))
    value_encrypted: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    project: Mapped["Project"] = relationship("Project", back_populates="env_vars")


class PortfolioItem(Base):
    """Карточка портфолио на главном сайте (НЕ путать с гостевым Project).

    Двуязычные поля title/tagline/desc/tags лежат в JSONB-бандлах ru/en —
    так у админки одна форма «слева RU, справа EN», без отдельной таблицы
    переводов. Картинка/ссылка/акцент-цвет — общие для всех языков.
    """

    __tablename__ = "portfolio_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    slug: Mapped[str] = mapped_column(String(63), unique=True, index=True)
    order_index: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # Общие колонки (одинаковые на всех языках).
    link: Mapped[str | None] = mapped_column(String(500), nullable=True)
    image_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    accent: Mapped[str | None] = mapped_column(String(20), nullable=True)  # hex

    # Языковые бандлы: {title, tagline, desc, tags: [str]}.
    ru: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)
    en: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class ContactMessage(Base):
    """Заявка с публичной формы (S6Contact на главной или A2Contact на about).

    Все поля кроме email/source — опциональны, потому что на главной нет
    message, а на about — нет budget. Источник пишется отдельно, чтобы в
    админке было видно «откуда пришло».
    """

    __tablename__ = "contact_messages"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)

    name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    email: Mapped[str] = mapped_column(String(254), index=True)
    message: Mapped[str | None] = mapped_column(Text, nullable=True)
    budget: Mapped[str | None] = mapped_column(String(100), nullable=True)

    source: Mapped[str] = mapped_column(String(40), default="home", nullable=False)
    ip: Mapped[str | None] = mapped_column(String(45), nullable=True)
    user_agent: Mapped[str | None] = mapped_column(String(500), nullable=True)

    is_read: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )


class Translation(Base):
    """Локализационный бандл одного языка целиком в одной JSONB-колонке.

    Структура зеркалит front/src/locales/{lang}.json — это упрощает обмен
    «фронт → бэк → фронт» и админ-форму (один документ, без таблицы строк).
    """

    __tablename__ = "translations"

    lang: Mapped[str] = mapped_column(String(8), primary_key=True)
    data: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class User(Base):
    """Админ-пользователь веб-панели (CLI и API_TOKEN живут параллельно)."""

    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    email: Mapped[str] = mapped_column(String(254), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    is_active: Mapped[bool] = mapped_column(default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
