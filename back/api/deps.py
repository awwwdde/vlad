"""Зависимости, общие для роутеров."""
from __future__ import annotations

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from models import Project


def get_project_or_404(db: Session, slug: str) -> Project:
    """Проект по слагу или 404. Слаг - публичный идентификатор проекта во всех
    маршрутах, поэтому проверка вынесена сюда, а не продублирована в каждом."""
    proj = db.scalar(select(Project).where(Project.slug == slug))
    if proj is None:
        raise HTTPException(status_code=404, detail=f"Проект '{slug}' не найден")
    return proj
