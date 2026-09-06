"""Гостевые проекты: карточки и жизненный цикл контейнеров."""
from __future__ import annotations

from fastapi import APIRouter
from datetime import datetime
from datetime import timezone
from db import get_db
from fastapi import Depends
from fastapi import HTTPException
from fastapi import Query
from models import Project
from models import ProjectStatus
from schemas import ActionResult
from schemas import DeployRequest
from schemas import ProjectCreate
from schemas import ProjectOut
from sqlalchemy import select
from sqlalchemy.orm import Session
import auth as auth_mod
import caddy
import engine
import secrets_box
from api.deps import get_project_or_404

router = APIRouter(tags=["проекты"])


@router.get("/api/projects", response_model=list[ProjectOut])
def list_projects(
    db: Session = Depends(get_db),
    _: object = Depends(auth_mod.require_auth),
) -> list[Project]:
    return list(db.scalars(select(Project).order_by(Project.created_at.desc())))


@router.post("/api/projects", response_model=ProjectOut, status_code=201)
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


@router.get("/api/projects/{slug}", response_model=ProjectOut)
def get_project(
    slug: str,
    db: Session = Depends(get_db),
    _: object = Depends(auth_mod.require_auth),
) -> Project:
    return get_project_or_404(db, slug)


@router.delete("/api/projects/{slug}", response_model=ActionResult)
def delete_project(
    slug: str,
    drop_data: bool = Query(default=False),
    db: Session = Depends(get_db),
    _: object = Depends(auth_mod.require_auth),
) -> ActionResult:
    proj = get_project_or_404(db, slug)
    caddy.delete_route(slug)
    engine.destroy_project(slug, drop_data=drop_data)
    out = ProjectOut.model_validate(proj)
    db.delete(proj)
    db.commit()
    return ActionResult(ok=True, project=out, message="Проект удалён")


@router.get("/api/projects/{slug}/logs")
def project_logs(
    slug: str,
    tail: int = Query(default=200, le=2000),
    db: Session = Depends(get_db),
    _: object = Depends(auth_mod.require_auth),
) -> dict:
    get_project_or_404(db, slug)
    return {"slug": slug, "logs": engine.app_logs(slug, tail=tail)}


@router.post("/api/projects/{slug}/deploy", response_model=ActionResult)
def deploy_project(
    slug: str,
    payload: DeployRequest | None = None,
    db: Session = Depends(get_db),
    _: object = Depends(auth_mod.require_auth),
) -> ActionResult:
    proj = get_project_or_404(db, slug)
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

        caddy.upsert_route(slug, domains=proj.custom_domains)

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


@router.post("/api/projects/{slug}/stop", response_model=ActionResult)
def stop(
    slug: str,
    db: Session = Depends(get_db),
    _: object = Depends(auth_mod.require_auth),
) -> ActionResult:
    proj = get_project_or_404(db, slug)
    engine.stop_project(slug)
    proj.status = ProjectStatus.stopped
    db.commit()
    db.refresh(proj)
    return ActionResult(ok=True, project=proj, message="Остановлен")


@router.post("/api/projects/{slug}/start", response_model=ActionResult)
def start(
    slug: str,
    db: Session = Depends(get_db),
    _: object = Depends(auth_mod.require_auth),
) -> ActionResult:
    proj = get_project_or_404(db, slug)
    engine.start_project(slug)
    caddy.upsert_route(slug, domains=proj.custom_domains)
    proj.status = ProjectStatus.running
    db.commit()
    db.refresh(proj)
    return ActionResult(ok=True, project=proj, message="Запущен")
