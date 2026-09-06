"""Вход в панель и текущий пользователь."""
from __future__ import annotations

from fastapi import APIRouter
from db import get_db
from fastapi import Depends
from fastapi import HTTPException
from models import User
from schemas import LoginRequest
from schemas import LoginResponse
from schemas import UserOut
from sqlalchemy import select
from sqlalchemy.orm import Session
import auth as auth_mod

router = APIRouter(tags=["вход"])


@router.post("/api/auth/login", response_model=LoginResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> LoginResponse:
    user = db.scalar(select(User).where(User.email == payload.email.lower().strip()))
    if not user or not user.is_active or not auth_mod.verify_password(
        payload.password, user.password_hash
    ):
        # Намеренно не уточняем, что именно не так — меньше подсказок брутфорсу.
        raise HTTPException(status_code=401, detail="Неверный email или пароль")
    token, expires_at = auth_mod.issue_jwt(user)
    return LoginResponse(
        access_token=token,
        expires_at=expires_at,
        user=UserOut.model_validate(user),
    )


@router.get("/api/auth/me", response_model=UserOut)
def me(user: User = Depends(auth_mod.require_user)) -> User:
    return user
