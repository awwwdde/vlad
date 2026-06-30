"""Подключение к БД панели (Postgres, драйвер psycopg3)."""
from __future__ import annotations

from collections.abc import Generator

from sqlalchemy import create_engine, text
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from config import settings


def _normalize_db_url(url: str) -> str:
    """postgresql:// → postgresql+psycopg:// (явный драйвер psycopg3)."""
    if url.startswith("postgresql+"):
        return url
    if url.startswith("postgresql://"):
        return "postgresql+psycopg://" + url[len("postgresql://") :]
    if url.startswith("postgres://"):
        return "postgresql+psycopg://" + url[len("postgres://") :]
    return url


engine = create_engine(
    _normalize_db_url(settings.database_url),
    pool_pre_ping=True,
    future=True,
)

SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)


class Base(DeclarativeBase):
    pass


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    """Создать таблицы панели и накатить лёгкие in-place миграции (без alembic).

    `create_all` создаёт только отсутствующие таблицы — новые колонки на уже
    существующих он не добавит. Поэтому ниже идёт идемпотентный набор
    ADD COLUMN IF NOT EXISTS для тех полей, которые появились после первого
    деплоя БД панели. Постгресовый синтаксис — это OK, мы фиксируем Postgres
    как единственный поддерживаемый драйвер.
    """
    import models  # noqa: F401  — регистрация моделей

    Base.metadata.create_all(bind=engine)

    with engine.begin() as conn:
        conn.execute(text(
            "ALTER TABLE projects ADD COLUMN IF NOT EXISTS secret_key VARCHAR(120)"
        ))
        conn.execute(text(
            "ALTER TABLE projects ADD COLUMN IF NOT EXISTS jwt_secret VARCHAR(120)"
        ))
        conn.execute(text(
            "ALTER TABLE projects ADD COLUMN IF NOT EXISTS custom_domains "
            "JSONB NOT NULL DEFAULT '[]'::jsonb"
        ))
