"""Шифрование чувствительных значений в БД панели (env-vars гостей).

Используем Fernet — симметричное AES-128-CBC + HMAC-SHA256, безопасно для
хранения коротких секретов (токены, пароли, ключи API). Ключ берётся из
ENV_ENCRYPTION_KEY (config.settings.env_encryption_key).

При потере ключа все зашифрованные значения становятся нечитаемыми — это
master-key, его место в защищённом хранилище паролей и в бэкапах рядом с
.env. При желании сменить ключ — нужно пройтись по таблице, расшифровать
старым, зашифровать новым (отдельная процедура, не сейчас).
"""
from __future__ import annotations

from functools import lru_cache

from cryptography.fernet import Fernet, InvalidToken

from config import settings


@lru_cache
def _fernet() -> Fernet:
    key = settings.env_encryption_key.strip()
    # Fernet хочет bytes; в .env лежит строка.
    return Fernet(key.encode("utf-8") if isinstance(key, str) else key)


def encrypt(plain: str) -> str:
    """Зашифровать строку. Возвращает base64-urlsafe токен (хранится в БД)."""
    return _fernet().encrypt(plain.encode("utf-8")).decode("ascii")


def decrypt(token: str) -> str:
    """Расшифровать; кидает InvalidToken если ключ не подходит / токен битый."""
    try:
        return _fernet().decrypt(token.encode("ascii")).decode("utf-8")
    except InvalidToken:
        # Не палим что именно не так — наружу пробросится 500.
        raise


def mask(plain: str, *, keep: int = 2) -> str:
    """Маскировка значения для вывода в UI: первые `keep` символов + …"""
    if not plain:
        return ""
    if len(plain) <= keep:
        return "…"
    return plain[:keep] + "…" + ("•" * min(6, len(plain) - keep))
