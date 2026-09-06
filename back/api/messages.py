"""Форма обратной связи и входящие заявки."""
from __future__ import annotations

from fastapi import APIRouter
from db import get_db
from fastapi import Depends
from fastapi import HTTPException
from fastapi import Query
from fastapi import Request
from models import ContactMessage
from schemas import ContactMessageIn
from schemas import ContactMessageOut
from schemas import MessagePatch
from sqlalchemy import func
from sqlalchemy import select
from sqlalchemy.orm import Session
import auth as auth_mod
import ratelimit

router = APIRouter(tags=["сообщения"])

#: Ограничение на публичный POST /api/contact: пять сообщений за десять минут
#: с одного IP. Форма открыта всем, и без предела её превращают в спам-канал.
_CONTACT_LIMIT = 5
_CONTACT_WINDOW_SEC = 600


@router.post("/api/contact", response_model=dict, status_code=201)
def contact_submit(
    payload: ContactMessageIn,
    request: Request,
    db: Session = Depends(get_db),
) -> dict:
    # Берём реальный IP с учётом Caddy (X-Forwarded-For ставит прокси).
    fwd = request.headers.get("x-forwarded-for", "")
    ip = (fwd.split(",")[0].strip() if fwd else (request.client.host if request.client else "")) or "unknown"

    if not ratelimit.hit(f"contact:{ip}", limit=_CONTACT_LIMIT, window_sec=_CONTACT_WINDOW_SEC):
        raise HTTPException(
            status_code=429,
            detail="Слишком много сообщений с этого IP. Попробуйте позже.",
        )

    msg = ContactMessage(
        name=(payload.name or None),
        email=payload.email,
        message=(payload.message or None),
        budget=(payload.budget or None),
        source=payload.source or "home",
        ip=ip,
        user_agent=(request.headers.get("user-agent", "") or None)[:500] if request.headers.get("user-agent") else None,
    )
    db.add(msg)
    db.commit()
    return {"ok": True}


@router.get("/api/messages", response_model=list[ContactMessageOut])
def messages_list(
    unread: bool | None = Query(default=None),
    db: Session = Depends(get_db),
    _: object = Depends(auth_mod.require_auth),
) -> list[ContactMessage]:
    q = select(ContactMessage).order_by(ContactMessage.created_at.desc())
    if unread is not None:
        q = q.where(ContactMessage.is_read.is_(not unread))
    return list(db.scalars(q))


@router.get("/api/messages/unread/count")
def messages_unread_count(
    db: Session = Depends(get_db),
    _: object = Depends(auth_mod.require_auth),
) -> dict:
    n = db.scalar(
        select(func.count()).select_from(ContactMessage).where(
            ContactMessage.is_read.is_(False)
        )
    )
    return {"count": int(n or 0)}


@router.patch("/api/messages/{msg_id}", response_model=ContactMessageOut)
def messages_patch(
    msg_id: int,
    payload: MessagePatch,
    db: Session = Depends(get_db),
    _: object = Depends(auth_mod.require_auth),
) -> ContactMessage:
    msg = db.get(ContactMessage, msg_id)
    if not msg:
        raise HTTPException(status_code=404, detail="не найдено")
    msg.is_read = payload.is_read
    db.commit()
    db.refresh(msg)
    return msg


@router.delete("/api/messages/{msg_id}")
def messages_delete(
    msg_id: int,
    db: Session = Depends(get_db),
    _: object = Depends(auth_mod.require_auth),
) -> dict:
    msg = db.get(ContactMessage, msg_id)
    if not msg:
        raise HTTPException(status_code=404, detail="не найдено")
    db.delete(msg)
    db.commit()
    return {"ok": True}
