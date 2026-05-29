"""Начальный сидинг переводов из бандлов фронта.

Идея: в репозитории front/src/locales/{ru,en}.json — текущий канон контента.
При первом старте панели, если таблица translations пустая, читаем эти файлы
и кладём в БД. Дальше единственный редактор — админка.

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
    with SessionLocal() as db:
        if db.scalar(select(Translation).limit(1)):
            return
        src = _find_locales_dir()
        if not src:
            print(
                "[translations] локали не найдены — таблица оставлена пустой. "
                "Залейте через PUT /api/content/translations/{lang}."
            )
            return
        for lang in ("ru", "en"):
            data = json.loads((src / f"{lang}.json").read_text(encoding="utf-8"))
            db.add(Translation(lang=lang, data=data))
        db.commit()
        print(f"[translations] засидил ru/en из {src}")
