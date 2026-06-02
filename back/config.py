"""Конфигурация хост-сервиса awwwdde.

Всё берётся из переменных окружения / .env. Postgres обязателен и в dev, и в проде —
чтобы окружение разработки совпадало с продом и баги миграций ловились раньше.
"""
from __future__ import annotations

from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Грузим .env и из back/, и из корня проекта — чтобы один файл
    # работал и для uvicorn (cwd=back/), и для docker-compose (cwd=корень).
    model_config = SettingsConfigDict(
        env_file=(".env", "../.env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # ── Базовый домен платформы ──────────────────────────────────────────────
    base_domain: str = "awwwdde.art"

    # ── БД самой панели (обязательно Postgres) ───────────────────────────────
    # Пример dev: postgresql://awwwdde:awwwdde@localhost:5432/awwwdde
    database_url: str = Field(...)

    # ── Caddy Admin API ──────────────────────────────────────────────────────
    caddy_admin_url: str = "http://localhost:2019"
    caddy_server: str = "srv0"

    # ── Сеть и порты гостевых контейнеров ────────────────────────────────────
    docker_network: str = "awwwdde_net"
    guest_app_port: int = 8080

    # ── Рабочие директории ───────────────────────────────────────────────────
    workspaces_dir: str = "./workspaces"

    # ── Безопасность панели ──────────────────────────────────────────────────
    # Bearer-токен для CLI (выпускается один раз, лежит в .env).
    api_token: str = Field(...)
    # Секрет подписи JWT для веб-админки.
    jwt_secret: str = Field(...)
    jwt_ttl_hours: int = 12

    # Master-ключ для симметричного шифрования env-vars гостей в БД.
    # Fernet-совместимый: base64-urlsafe от 32 байт.
    # Сгенерировать: python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
    # ВНИМАНИЕ: при потере все хранимые env-vars становятся нечитаемыми.
    env_encryption_key: str = Field(...)


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
