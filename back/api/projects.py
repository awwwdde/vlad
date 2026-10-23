"""Гостевые проекты: карточки и жизненный цикл контейнеров."""
from __future__ import annotations

from fastapi import APIRouter
from db import get_db
from fastapi import Depends
from fastapi import HTTPException
from fastapi import Query
from models import Project
from models import ProjectStatus
from models import Deployment, DeploymentLog
from schemas import ProjectSettingsIn, DeploymentOut, DeploymentLogsOut, DeploymentLogOut
from deploy_options import DeployOptions, build_paths
from pathlib import Path
from config import settings
from schemas import ActionResult
from schemas import DeployRequest
from schemas import ProjectCreate
from schemas import ProjectOut
from sqlalchemy import select, update
from sqlalchemy.orm import Session
import auth as auth_mod
import caddy
import engine
from server_diagnostics import inspect_server, inspect_git
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
    proj = Project(slug=payload.slug, title=payload.title, source=payload.source, deploy_config=payload.deploy_config.model_dump())
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


def editable_project(db: Session, slug: str) -> Project:
    proj = db.scalar(select(Project).where(Project.slug == slug).with_for_update())
    if not proj:
        raise HTTPException(404, 'Проект не найден')
    if proj.status in (ProjectStatus.building, ProjectStatus.deploying):
        raise HTTPException(409, 'Дождитесь завершения текущего деплоя')
    return proj


@router.put('/api/projects/{slug}/settings', response_model=ProjectOut)
def project_settings(slug: str, payload: ProjectSettingsIn, db: Session = Depends(get_db), _: object = Depends(auth_mod.require_auth)) -> Project:
    proj = editable_project(db, slug)
    proj.title = payload.title.strip() or None if payload.title else None
    proj.source = payload.source.strip() or None if payload.source else None
    proj.deploy_config = payload.deploy_config.model_dump()
    db.commit(); db.refresh(proj)
    return proj


@router.get('/api/projects/{slug}/deployments', response_model=list[DeploymentOut])
def deployment_history(slug: str, db: Session = Depends(get_db), _: object = Depends(auth_mod.require_auth)) -> list[Deployment]:
    proj = get_project_or_404(db, slug)
    return list(db.scalars(select(Deployment).where(Deployment.project_id == proj.id).order_by(Deployment.id.desc()).limit(30)))


@router.get('/api/projects/{slug}/deployments/{deployment_id}/logs', response_model=DeploymentLogsOut)
def deployment_logs(slug: str, deployment_id: int, after: int = Query(default=0, ge=0), limit: int = Query(default=200, ge=1, le=500), db: Session = Depends(get_db), _: object = Depends(auth_mod.require_auth)) -> DeploymentLogsOut:
    proj = get_project_or_404(db, slug)
    attempt = db.scalar(select(Deployment).where(Deployment.id == deployment_id, Deployment.project_id == proj.id))
    if not attempt:
        raise HTTPException(404, 'Выкладка не найдена')
    lines = list(db.scalars(select(DeploymentLog).where(
        DeploymentLog.deployment_id == attempt.id, DeploymentLog.id > after,
    ).order_by(DeploymentLog.id).limit(limit + 1)))
    more = len(lines) > limit
    lines = lines[:limit]
    return DeploymentLogsOut(deployment=DeploymentOut.model_validate(attempt),
        lines=[DeploymentLogOut.model_validate(line) for line in lines],
        next_cursor=lines[-1].id if lines else after, has_more=more)


@router.get('/api/projects/{slug}/preflight')
def preflight(slug: str, db: Session = Depends(get_db), _: object = Depends(auth_mod.require_auth)) -> dict:
    proj = get_project_or_404(db, slug)
    options = DeployOptions.model_validate(proj.deploy_config or {})
    source = proj.source or ''
    is_git = source.startswith(('http://', 'https://', 'git@', 'ssh://')) or source.endswith('.git')
    root = Path(settings.workspaces_dir) / slug
    if source and not is_git:
        root = Path(source)
    checks = []
    if not root.exists():
        checks.append({'status': 'warning' if is_git else 'error', 'label': 'Исходники', 'message': 'Репозиторий будет получен при деплое; файлы пока не проверены.' if is_git else 'Папка исходников не найдена на сервере.'})
    else:
        try:
            context, dockerfile = build_paths(root, options)
            found = context.is_dir() and dockerfile.is_file()
            checks.append({'status': 'ok' if found else 'warning' if is_git else 'error', 'label': 'Сборка', 'message': 'Контекст и Dockerfile найдены в текущих исходниках.' if found else 'Контекст или Dockerfile пока не найден. Git-ветка будет получена при деплое.' if is_git else 'Контекст или Dockerfile не найден.'})
            if is_git:
                checks.append({'status': 'warning', 'label': 'Ветка Git', 'message': 'Проверены текущие файлы workspace. Выбранная ветка будет обновлена и проверена повторно во время деплоя.'})
        except ValueError as exc:
            checks.append({'status': 'error', 'label': 'Сборка', 'message': str(exc)})
    checks.append({'status': 'ok', 'label': 'HTTP-проверка', 'message': f'Порт {options.app_port or settings.guest_app_port}, {options.health_path}, ожидается HTTP {options.health_status}; до {options.health_timeout} с.'})
    if options.memory_mb is None or options.cpus is None:
        checks.append({'status': 'warning', 'label': 'Ресурсы', 'message': 'CPU или память не ограничены. Лимиты можно задать в настройках сайта.'})
    checks.append({'status': 'warning', 'label': 'Готовность сервера', 'message': 'Docker, доступ к Git, зависимости и HTTP-ответ здесь не проверяются — только на этапе деплоя.'})
    return {'can_deploy': not any(check['status'] == 'error' for check in checks), 'checks': checks}


@router.get('/api/projects/{slug}/readiness')
def readiness(slug: str, db: Session = Depends(get_db), _: object = Depends(auth_mod.require_auth)):
    proj = get_project_or_404(db, slug)
    source, options = proj.source, DeployOptions.model_validate(proj.deploy_config or {})
    local = preflight(slug, db, _)
    server = inspect_server(db)
    git = inspect_git(source, options.git_branch)
    checks = [*server['checks'], *[c for c in local['checks'] if c['label'] != 'Готовность сервера']]
    if git: checks.append(git)
    return {'at': server['at'], 'can_deploy': not any(c['status'] == 'error' for c in checks), 'checks': checks}


@router.delete("/api/projects/{slug}", response_model=ActionResult)
def delete_project(
    slug: str,
    drop_data: bool = Query(default=False),
    db: Session = Depends(get_db),
    _: object = Depends(auth_mod.require_auth),
) -> ActionResult:
    proj = editable_project(db, slug)
    caddy.delete_route(slug)
    release_ids = list(db.scalars(select(Deployment.id).where(Deployment.project_id == proj.id)))
    engine.destroy_project(slug, drop_data=drop_data, release_ids=release_ids)
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
    proj = get_project_or_404(db, slug)
    return {"slug": slug, "logs": engine.app_logs(slug, tail=tail, container_name=proj.app_container)}


@router.post("/api/projects/{slug}/deploy", response_model=ActionResult, status_code=202)
def deploy_project(
    slug: str,
    payload: DeployRequest | None = None,
    db: Session = Depends(get_db),
    _: object = Depends(auth_mod.require_auth),
) -> ActionResult:
    proj = editable_project(db, slug)
    previous_status = proj.status.value
    claimed = db.execute(update(Project).where(
        Project.id == proj.id,
        Project.status.notin_([ProjectStatus.building, ProjectStatus.deploying]),
    ).values(status=ProjectStatus.building, last_error=None).returning(Project.id),
        execution_options={'synchronize_session': False}).scalar_one_or_none()
    if claimed is None:
        db.rollback()
        raise HTTPException(409, 'Деплой уже находится в очереди или выполняется')
    # Claim and durable job are committed together: no stranded project between them.
    db.refresh(proj)
    options = DeployOptions.model_validate(proj.deploy_config or {})
    if options.database_enabled and not proj.db_password:
        proj.db_password = engine.gen_db_password()
    if not proj.secret_key: proj.secret_key = engine.gen_secret()
    if not proj.jwt_secret: proj.jwt_secret = engine.gen_secret()
    proj.db_container = engine._names(slug)[1]
    attempt = Deployment(project_id=proj.id, status='queued', stage='queued', request_config={
        'source': (payload.source if payload else None) or proj.source,
        'options': options.model_dump(),
        'env': {ev.key: ev.value_encrypted for ev in proj.env_vars},
        'previous_status': previous_status,
        'previous_container': proj.app_container or (f'{slug}_app' if proj.deployed_at else None),
        'previous_image': proj.image_tag,
    })
    db.add(attempt); db.flush()
    db.add(DeploymentLog(deployment_id=attempt.id, stage='queued', level='info',
        message='Задание сохранено. Ожидание worker.'))
    db.commit(); db.refresh(proj)
    return ActionResult(ok=True, project=proj, message='Выкладка добавлена в очередь. Можно закрыть страницу — ход выполнения сохранится в истории.')


@router.post("/api/projects/{slug}/stop", response_model=ActionResult)
def stop(
    slug: str,
    db: Session = Depends(get_db),
    _: object = Depends(auth_mod.require_auth),
) -> ActionResult:
    proj = editable_project(db, slug)
    engine.stop_project(slug, container_name=proj.app_container)
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
    proj = editable_project(db, slug)
    active = DeployOptions.model_validate(proj.active_config or {})
    try:
        engine.start_project(slug, database_enabled=active.database_enabled, container_name=proj.app_container)
        engine.wait_healthy(slug, options=active, container_name=proj.app_container)
        caddy.upsert_route(slug, upstream=proj.upstream, domains=proj.custom_domains)
    except Exception as exc:
        db.rollback()
        raise HTTPException(500, 'Не удалось запустить сайт или подтвердить его готовность. Проверьте журнал приложения.') from exc
    proj.status = ProjectStatus.running
    db.commit()
    db.refresh(proj)
    return ActionResult(ok=True, project=proj, message="Запущен")
