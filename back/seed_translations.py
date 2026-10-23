"""Начальный сидинг переводов из бандлов фронта.

Идея: в репозитории front/src/locales/{ru,en}.json — текущий канон контента.
При первом старте панели читаем эти файлы и кладём в БД. При обновлениях
добавляем только отсутствующие ключи, сохраняя все правки из админки.

Если на проде файлы недоступны (например, back/ задеплоен отдельно от front/),
просто пропускаем — администратор зальёт переводы через UI.
"""
from __future__ import annotations

import json
from pathlib import Path

from sqlalchemy import select

from db import SessionLocal
from models import Translation

# Возможные расположения бандлов локалей относительно back/.
_CANDIDATES = [
    Path("../front/src/locales"),
    Path("./front/src/locales"),
    Path("/app/locales"),  # на случай примонтированной директории в проде
]


def _find_locales_dir() -> Path | None:
    for p in _CANDIDATES:
        if (p / "ru.json").exists() and (p / "en.json").exists():
            return p.resolve()
    return None


def seed_if_empty() -> None:
    """Создать локали или дополнить их новыми ключами без потери правок.

    Проверяем per-lang: если для языка нет строки или её data={} (так бывает,
    когда фронт случайно GET-нул /translations/{lang} раньше сидинга и
    создал пустую запись-болванку), то перезаливаем из файла.
    """
    src = _find_locales_dir()
    if not src:
        print(
            "[translations] локали не найдены — таблица оставлена как есть. "
            "Смонтируйте front/src/locales или залейте через PUT API."
        )
        return

    with SessionLocal() as db:
        for lang in ("ru", "en"):
            existing = db.get(Translation, lang)
            data = json.loads((src / f"{lang}.json").read_text(encoding="utf-8"))
            if existing and existing.data:
                # New UI copy must also be available in the content editor on
                # existing installations. Never overwrite an owner's edits.
                merged = merge_missing(existing.data, data)
                # Explicit contact-address migration for existing installations.
                # Keep other content edits and independently changed addresses.
                common = merged.get("common")
                if isinstance(common, dict) and str(common.get("email", "")).strip().lower() == "ohaww@yandex.ru":
                    merged["common"] = {**common, "email": "message@awwwdde.art"}
                if merged != existing.data:
                    existing.data = merged
                continue
            if existing:
                existing.data = data
            else:
                db.add(Translation(lang=lang, data=data))
            print(f"[translations] засидил {lang} из {src}")
        db.commit()


def merge_missing(current: dict, defaults: dict) -> dict:
    """Add new translation keys, preserving every existing value."""
    merged = dict(current)
    for key, value in defaults.items():
        if key not in merged:
            merged[key] = value
        elif isinstance(value, dict) and isinstance(merged[key], dict):
            merged[key] = merge_missing(merged[key], value)
    return merged
