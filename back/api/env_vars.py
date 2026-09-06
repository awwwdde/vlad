"""Шифрованные env-переменные гостевого проекта."""
from __future__ import annotations

from fastapi import APIRouter
from db import get_db
from fastapi import Depends
from fastapi import HTTPException
from models import ProjectEnvVar
from schemas import EnvVarIn
from schemas import EnvVarOut
from schemas import EnvVarReveal
from schemas import EnvVarsBulk
from schemas import _check_env_key
from sqlalchemy.orm import Session
import auth as auth_mod
import secrets_box
from api.deps import get_project_or_404

router = APIRouter(tags=["env-переменные"])


def _env_to_out(ev: ProjectEnvVar) -> EnvVarOut:
    """Расшифровать значение и отдать его в виде маски."""
    try:
        plain = secrets_box.decrypt(ev.value_encrypted)
        preview = secrets_box.mask(plain)
    except Exception:  # noqa: BLE001
        preview = "(не удалось расшифровать)"
    return EnvVarOut(key=ev.key, value_preview=preview, updated_at=ev.updated_at)


@router.get("/api/projects/{slug}/env", response_model=list[EnvVarOut])
def env_list(
    slug: str,
    db: Session = Depends(get_db),
    _: object = Depends(auth_mod.require_auth),
) -> list[EnvVarOut]:
    proj = get_project_or_404(db, slug)
    return [_env_to_out(ev) for ev in sorted(proj.env_vars, key=lambda e: e.key)]


@router.get("/api/projects/{slug}/env/{key}/reveal", response_model=EnvVarReveal)
def env_reveal(
    slug: str,
    key: str,
    db: Session = Depends(get_db),
    _: object = Depends(auth_mod.require_auth),
) -> EnvVarReveal:
    """Одноразовая выдача plaintext-значения. Не кэшировать на фронте."""
    proj = get_project_or_404(db, slug)
    ev = next((e for e in proj.env_vars if e.key == key), None)
    if not ev:
        raise HTTPException(status_code=404, detail="ключ не найден")
    return EnvVarReveal(key=ev.key, value=secrets_box.decrypt(ev.value_encrypted))


@router.put("/api/projects/{slug}/env/{key}", response_model=EnvVarOut)
def env_put(
    slug: str,
    key: str,
    payload: EnvVarIn,
    db: Session = Depends(get_db),
    _: object = Depends(auth_mod.require_auth),
) -> EnvVarOut:
    key = _check_env_key(key)
    proj = get_project_or_404(db, slug)
    ev = next((e for e in proj.env_vars if e.key == key), None)
    encrypted = secrets_box.encrypt(payload.value)
    if ev:
        ev.value_encrypted = encrypted
    else:
        ev = ProjectEnvVar(project_id=proj.id, key=key, value_encrypted=encrypted)
        db.add(ev)
    db.commit()
    db.refresh(ev)
    return _env_to_out(ev)


@router.delete("/api/projects/{slug}/env/{key}")
def env_delete(
    slug: str,
    key: str,
    db: Session = Depends(get_db),
    _: object = Depends(auth_mod.require_auth),
) -> dict:
    proj = get_project_or_404(db, slug)
    ev = next((e for e in proj.env_vars if e.key == key), None)
    if not ev:
        raise HTTPException(status_code=404, detail="ключ не найден")
    db.delete(ev)
    db.commit()
    return {"ok": True}


@router.put("/api/projects/{slug}/env", response_model=list[EnvVarOut])
def env_bulk(
    slug: str,
    payload: EnvVarsBulk,
    db: Session = Depends(get_db),
    _: object = Depends(auth_mod.require_auth),
) -> list[EnvVarOut]:
    """Полная замена набора env-vars проекта (что прислали — то и осталось)."""
    proj = get_project_or_404(db, slug)
    incoming = {item.key: item.value for item in payload.items}
    existing = {ev.key: ev for ev in proj.env_vars}

    # Удалить то, чего больше нет.
    for key, ev in existing.items():
        if key not in incoming:
            db.delete(ev)

    # Создать новые / обновить существующие.
    for key, value in incoming.items():
        encrypted = secrets_box.encrypt(value)
        if key in existing:
            existing[key].value_encrypted = encrypted
        else:
            db.add(ProjectEnvVar(project_id=proj.id, key=key, value_encrypted=encrypted))

    db.commit()
    db.refresh(proj)
    return [_env_to_out(ev) for ev in sorted(proj.env_vars, key=lambda e: e.key)]
