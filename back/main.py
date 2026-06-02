"""FastAPI-приложение панели awwwdde.

Эндпоинты (Bearer в Authorization — JWT из /api/auth/login или API_TOKEN из .env):
    GET    /healthz                       — живость панели + Caddy
    POST   /api/auth/login                — выпустить JWT
    GET    /api/auth/me                   — текущий веб-пользователь
    GET    /api/projects                  — список проектов
    POST   /api/projects                  — зарегистрировать проект
    GET    /api/projects/{slug}           — карточка
    POST   /api/projects/{slug}/deploy    — собрать и развернуть
    POST   /api/projects/{slug}/stop      — остановить
    POST   /api/projects/{slug}/start     — запустить
    DELETE /api/projects/{slug}           — снести (?drop_data=true — и БД)
    GET    /api/projects/{slug}/logs      — логи app-контейнера
"""
from __future__ import annotations

from datetime import datetime, timezone

from fastapi import Depends, FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import func, select
from sqlalchemy.orm import Session

import auth as auth_mod
import caddy
import engine
import ratelimit
import secrets_box
from config import settings
from db import get_db, init_db
from models import (
    ContactMessage,
    PortfolioItem,
    Project,
    ProjectEnvVar,
    ProjectStatus,
    Translation,
    User,
)
from schemas import (
    ActionResult,
    ContactMessageIn,
    ContactMessageOut,
    DeployRequest,
    EnvVarIn,
    EnvVarOut,
    EnvVarReveal,
    EnvVarsBulk,
    LoginRequest,
    LoginResponse,
    MessagePatch,
    PortfolioItemIn,
    PortfolioItemOut,
    ProjectCreate,
    ProjectOut,
    ReorderRequest,
    TranslationIn,
    TranslationOut,
    UserOut,
    _check_env_key,
)
from seed_portfolio import seed_if_empty as seed_portfolio_if_empty
from seed_translations import seed_if_empty as seed_translations_if_empty

app = FastAPI(title="awwwdde control panel", version="0.2.0")

# В dev фронт крутится на 5173, в проде живёт на том же домене (CORS не нужен,
# но оставляем явный whitelist — проще дебажить локально).
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:4173",
        f"https://{settings.base_domain}",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def _startup() -> None:
    init_db()
    seed_portfolio_if_empty()
    seed_translations_if_empty()


# ── Хелперы ──────────────────────────────────────────────────────────────────

def _get_project(db: Session, slug: str) -> Project:
    proj = db.scalar(select(Project).where(Project.slug == slug))
    if proj is None:
        raise HTTPException(status_code=404, detail=f"Проект '{slug}' не найден")
    return proj


# ── Служебное ────────────────────────────────────────────────────────────────

@app.get("/healthz")
def healthz() -> dict:
    return {
        "status": "ok",
        "caddy": caddy.ping(),
        "base_domain": settings.base_domain,
    }


# ── Auth ─────────────────────────────────────────────────────────────────────

@app.post("/api/auth/login", response_model=LoginResponse)
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


@app.get("/api/auth/me", response_model=UserOut)
def me(user: User = Depends(auth_mod.require_user)) -> User:
    return user


# ── CRUD проектов ────────────────────────────────────────────────────────────

@app.get("/api/projects", response_model=list[ProjectOut])
def list_projects(
    db: Session = Depends(get_db),
    _: object = Depends(auth_mod.require_auth),
) -> list[Project]:
    return list(db.scalars(select(Project).order_by(Project.created_at.desc())))


@app.post("/api/projects", response_model=ProjectOut, status_code=201)
def create_project(
    payload: ProjectCreate,
    db: Session = Depends(get_db),
    _: object = Depends(auth_mod.require_auth),
) -> Project:
    if db.scalar(select(Project).where(Project.slug == payload.slug)):
        raise HTTPException(status_code=409, detail="Проект с таким slug уже есть")
    proj = Project(slug=payload.slug, title=payload.title, source=payload.source)
    db.add(proj)
    db.commit()
    db.refresh(proj)
    return proj


@app.get("/api/projects/{slug}", response_model=ProjectOut)
def get_project(
    slug: str,
    db: Session = Depends(get_db),
    _: object = Depends(auth_mod.require_auth),
) -> Project:
    return _get_project(db, slug)


@app.delete("/api/projects/{slug}", response_model=ActionResult)
def delete_project(
    slug: str,
    drop_data: bool = Query(default=False),
    db: Session = Depends(get_db),
    _: object = Depends(auth_mod.require_auth),
) -> ActionResult:
    proj = _get_project(db, slug)
    caddy.delete_route(slug)
    engine.destroy_project(slug, drop_data=drop_data)
    out = ProjectOut.model_validate(proj)
    db.delete(proj)
    db.commit()
    return ActionResult(ok=True, project=out, message="Проект удалён")


@app.get("/api/projects/{slug}/logs")
def project_logs(
    slug: str,
    tail: int = Query(default=200, le=2000),
    db: Session = Depends(get_db),
    _: object = Depends(auth_mod.require_auth),
) -> dict:
    _get_project(db, slug)
    return {"slug": slug, "logs": engine.app_logs(slug, tail=tail)}


# ── Жизненный цикл ───────────────────────────────────────────────────────────

@app.post("/api/projects/{slug}/deploy", response_model=ActionResult)
def deploy_project(
    slug: str,
    payload: DeployRequest | None = None,
    db: Session = Depends(get_db),
    _: object = Depends(auth_mod.require_auth),
) -> ActionResult:
    proj = _get_project(db, slug)
    source = (payload.source if payload else None) or proj.source

    app_container, db_container, image_tag, _ = engine._names(slug)
    if not proj.db_password:
        proj.db_password = engine.gen_db_password()
    if not proj.secret_key:
        proj.secret_key = engine.gen_secret()
    if not proj.jwt_secret:
        proj.jwt_secret = engine.gen_secret()
    proj.app_container = app_container
    proj.db_container = db_container
    proj.image_tag = image_tag

    try:
        proj.status = ProjectStatus.building
        proj.last_error = None
        db.commit()

        context = engine.prepare_source(slug, source)
        engine.ensure_network()
        engine.build_image(slug, context)

        proj.status = ProjectStatus.deploying
        db.commit()

        engine.ensure_db(slug, proj.db_password)

        # Подтягиваем пользовательские env-vars: расшифровываем и складываем
        # в обычный dict, который engine передаст внутрь app-контейнера.
        extra_env: dict[str, str] = {}
        for ev in proj.env_vars:
            try:
                extra_env[ev.key] = secrets_box.decrypt(ev.value_encrypted)
            except Exception as exc:  # noqa: BLE001
                # Один битый ключ не должен валить весь деплой — логируем и
                # пропускаем; имя ключа в last_error, чтобы user знал что чинить.
                raise engine.DeployError(
                    f"не удалось расшифровать env-vars[{ev.key}] — "
                    f"проверь ENV_ENCRYPTION_KEY в .env панели ({exc})"
                ) from exc

        engine.run_app(
            slug,
            image_tag,
            proj.database_url,
            secret_key=proj.secret_key,
            jwt_secret=proj.jwt_secret,
            extra_env=extra_env,
        )
        engine.wait_healthy(slug)

        caddy.upsert_route(slug)

        proj.status = ProjectStatus.running
        proj.deployed_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(proj)
        return ActionResult(
            ok=True, project=proj, message=f"https://{proj.domain} развёрнут"
        )
    except engine.DeployError as exc:
        proj.status = ProjectStatus.failed
        proj.last_error = str(exc)
        db.commit()
        db.refresh(proj)
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.post("/api/projects/{slug}/stop", response_model=ActionResult)
def stop(
    slug: str,
    db: Session = Depends(get_db),
    _: object = Depends(auth_mod.require_auth),
) -> ActionResult:
    proj = _get_project(db, slug)
    engine.stop_project(slug)
    proj.status = ProjectStatus.stopped
    db.commit()
    db.refresh(proj)
    return ActionResult(ok=True, project=proj, message="Остановлен")


# ── Пользовательские env-vars гостя ─────────────────────────────────────────
# Изменения применяются при следующем deploy: контейнер передаётся новый набор
# env. Изменения сами по себе не рестартят контейнер — это намеренно, чтобы
# можно было набрать несколько ключей и зайти одним передеплоем.

def _env_to_out(ev: ProjectEnvVar) -> EnvVarOut:
    """Расшифровать значение и отдать его в виде маски."""
    try:
        plain = secrets_box.decrypt(ev.value_encrypted)
        preview = secrets_box.mask(plain)
    except Exception:  # noqa: BLE001
        preview = "(не удалось расшифровать)"
    return EnvVarOut(key=ev.key, value_preview=preview, updated_at=ev.updated_at)


@app.get("/api/projects/{slug}/env", response_model=list[EnvVarOut])
def env_list(
    slug: str,
    db: Session = Depends(get_db),
    _: object = Depends(auth_mod.require_auth),
) -> list[EnvVarOut]:
    proj = _get_project(db, slug)
    return [_env_to_out(ev) for ev in sorted(proj.env_vars, key=lambda e: e.key)]


@app.get("/api/projects/{slug}/env/{key}/reveal", response_model=EnvVarReveal)
def env_reveal(
    slug: str,
    key: str,
    db: Session = Depends(get_db),
    _: object = Depends(auth_mod.require_auth),
) -> EnvVarReveal:
    """Одноразовая выдача plaintext-значения. Не кэшировать на фронте."""
    proj = _get_project(db, slug)
    ev = next((e for e in proj.env_vars if e.key == key), None)
    if not ev:
        raise HTTPException(status_code=404, detail="ключ не найден")
    return EnvVarReveal(key=ev.key, value=secrets_box.decrypt(ev.value_encrypted))


@app.put("/api/projects/{slug}/env/{key}", response_model=EnvVarOut)
def env_put(
    slug: str,
    key: str,
    payload: EnvVarIn,
    db: Session = Depends(get_db),
    _: object = Depends(auth_mod.require_auth),
) -> EnvVarOut:
    key = _check_env_key(key)
    proj = _get_project(db, slug)
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


@app.delete("/api/projects/{slug}/env/{key}")
def env_delete(
    slug: str,
    key: str,
    db: Session = Depends(get_db),
    _: object = Depends(auth_mod.require_auth),
) -> dict:
    proj = _get_project(db, slug)
    ev = next((e for e in proj.env_vars if e.key == key), None)
    if not ev:
        raise HTTPException(status_code=404, detail="ключ не найден")
    db.delete(ev)
    db.commit()
    return {"ok": True}


@app.put("/api/projects/{slug}/env", response_model=list[EnvVarOut])
def env_bulk(
    slug: str,
    payload: EnvVarsBulk,
    db: Session = Depends(get_db),
    _: object = Depends(auth_mod.require_auth),
) -> list[EnvVarOut]:
    """Полная замена набора env-vars проекта (что прислали — то и осталось)."""
    proj = _get_project(db, slug)
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


# ── Контент: портфолио ───────────────────────────────────────────────────────
# GET — публичный (используется самим сайтом). Изменения — только под auth.

@app.get("/api/content/portfolio", response_model=list[PortfolioItemOut])
def portfolio_list(db: Session = Depends(get_db)) -> list[PortfolioItem]:
    return list(
        db.scalars(
            select(PortfolioItem).order_by(
                PortfolioItem.order_index, PortfolioItem.id
            )
        )
    )


@app.post("/api/content/portfolio", response_model=PortfolioItemOut, status_code=201)
def portfolio_create(
    payload: PortfolioItemIn,
    db: Session = Depends(get_db),
    _: object = Depends(auth_mod.require_auth),
) -> PortfolioItem:
    if db.scalar(select(PortfolioItem).where(PortfolioItem.slug == payload.slug)):
        raise HTTPException(status_code=409, detail="slug уже занят")
    # Кладём в конец списка.
    max_order = db.scalar(
        select(PortfolioItem.order_index).order_by(PortfolioItem.order_index.desc())
    )
    item = PortfolioItem(
        slug=payload.slug,
        link=payload.link,
        image_url=payload.image_url,
        accent=payload.accent,
        ru=payload.ru.model_dump(),
        en=payload.en.model_dump(),
        order_index=(max_order or 0) + 1,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@app.put("/api/content/portfolio/{slug}", response_model=PortfolioItemOut)
def portfolio_update(
    slug: str,
    payload: PortfolioItemIn,
    db: Session = Depends(get_db),
    _: object = Depends(auth_mod.require_auth),
) -> PortfolioItem:
    item = db.scalar(select(PortfolioItem).where(PortfolioItem.slug == slug))
    if not item:
        raise HTTPException(status_code=404, detail="не найден")
    # Смена slug допустима, но проверяем уникальность.
    if payload.slug != slug and db.scalar(
        select(PortfolioItem).where(PortfolioItem.slug == payload.slug)
    ):
        raise HTTPException(status_code=409, detail="новый slug уже занят")
    item.slug = payload.slug
    item.link = payload.link
    item.image_url = payload.image_url
    item.accent = payload.accent
    item.ru = payload.ru.model_dump()
    item.en = payload.en.model_dump()
    db.commit()
    db.refresh(item)
    return item


@app.delete("/api/content/portfolio/{slug}")
def portfolio_delete(
    slug: str,
    db: Session = Depends(get_db),
    _: object = Depends(auth_mod.require_auth),
) -> dict:
    item = db.scalar(select(PortfolioItem).where(PortfolioItem.slug == slug))
    if not item:
        raise HTTPException(status_code=404, detail="не найден")
    db.delete(item)
    db.commit()
    return {"ok": True}


@app.post("/api/content/portfolio/reorder", response_model=list[PortfolioItemOut])
def portfolio_reorder(
    payload: ReorderRequest,
    db: Session = Depends(get_db),
    _: object = Depends(auth_mod.require_auth),
) -> list[PortfolioItem]:
    items = list(db.scalars(select(PortfolioItem)))
    by_slug = {i.slug: i for i in items}
    # Все slug-и должны быть валидны — частичный reorder не делаем.
    missing = [s for s in payload.slugs if s not in by_slug]
    if missing:
        raise HTTPException(status_code=400, detail=f"unknown slugs: {missing}")
    for idx, slug in enumerate(payload.slugs):
        by_slug[slug].order_index = idx
    db.commit()
    return list(
        db.scalars(
            select(PortfolioItem).order_by(
                PortfolioItem.order_index, PortfolioItem.id
            )
        )
    )


# ── Контент: переводы (тексты секций главного сайта) ───────────────────────
# GET — публичный (i18next публички), PUT — под auth.

_ALLOWED_LANGS = {"ru", "en"}


@app.get("/api/content/translations/{lang}", response_model=TranslationOut)
def translation_get(lang: str, db: Session = Depends(get_db)) -> Translation:
    if lang not in _ALLOWED_LANGS:
        raise HTTPException(status_code=400, detail="unsupported lang")
    tr = db.get(Translation, lang)
    if not tr:
        # Пустой документ — фронт упадёт на baked-in defaults.
        tr = Translation(lang=lang, data={})
        db.add(tr)
        db.commit()
        db.refresh(tr)
    return tr


@app.put("/api/content/translations/{lang}", response_model=TranslationOut)
def translation_put(
    lang: str,
    payload: TranslationIn,
    db: Session = Depends(get_db),
    _: object = Depends(auth_mod.require_auth),
) -> Translation:
    if lang not in _ALLOWED_LANGS:
        raise HTTPException(status_code=400, detail="unsupported lang")
    tr = db.get(Translation, lang)
    if not tr:
        tr = Translation(lang=lang, data=payload.data)
        db.add(tr)
    else:
        tr.data = payload.data
    db.commit()
    db.refresh(tr)
    return tr


# ── Контактная форма ────────────────────────────────────────────────────────
# Публичный POST (с rate-limit по IP), админский список/чтение/удаление.

_CONTACT_LIMIT = 5          # макс сообщений
_CONTACT_WINDOW_SEC = 600   # за 10 минут с одного IP


@app.post("/api/contact", response_model=dict, status_code=201)
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


@app.get("/api/messages", response_model=list[ContactMessageOut])
def messages_list(
    unread: bool | None = Query(default=None),
    db: Session = Depends(get_db),
    _: object = Depends(auth_mod.require_auth),
) -> list[ContactMessage]:
    q = select(ContactMessage).order_by(ContactMessage.created_at.desc())
    if unread is not None:
        q = q.where(ContactMessage.is_read.is_(not unread))
    return list(db.scalars(q))


@app.get("/api/messages/unread/count")
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


@app.patch("/api/messages/{msg_id}", response_model=ContactMessageOut)
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


@app.delete("/api/messages/{msg_id}")
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


@app.post("/api/projects/{slug}/start", response_model=ActionResult)
def start(
    slug: str,
    db: Session = Depends(get_db),
    _: object = Depends(auth_mod.require_auth),
) -> ActionResult:
    proj = _get_project(db, slug)
    engine.start_project(slug)
    caddy.upsert_route(slug)
    proj.status = ProjectStatus.running
    db.commit()
    db.refresh(proj)
    return ActionResult(ok=True, project=proj, message="Запущен")
