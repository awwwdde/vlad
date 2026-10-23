"""Durable PostgreSQL queue. Run separately: python deploy_worker.py.

A session advisory lock serializes workers, including restart recovery. HTTP
processes only enqueue; no Docker operation runs in their request threads.
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
import logging
import re
import signal
import threading

from sqlalchemy import case, select, text

import caddy
import engine
import secrets_box
from config import settings
from db import SessionLocal, engine as database
from deploy_options import DeployOptions, safe_error
from deploy_logs import DeploymentLogger, STAGES
from models import Deployment, Project, ProjectStatus
from server_diagnostics import heartbeat

log = logging.getLogger('deploy-worker')
LOCK_ID = 718496023
PENDING = ('queued', 'building', 'deploying')


class LockLost(RuntimeError):
    pass


def run_job(db, attempt: Deployment, fence=lambda: None) -> None:
    """Replay interrupted pre-publish work; publish is an idempotent commit point.

    Old container and its image are untouched until Caddy and DB agree. If the
    publish outcome is uncertain we retain both and retry, never delete a
    possibly routed candidate. No transparent rollback of database migrations.
    """
    proj = db.get(Project, attempt.project_id)
    if proj is None:
        return
    snapshot = attempt.request_config or {}
    # Old synchronous attempts have no replayable snapshot.
    if not snapshot:
        attempt.status = 'failed'; attempt.error = 'Старая выкладка прервана. Запустите её повторно.'
        attempt.finished_at = datetime.now(timezone.utc)
        proj.status = ProjectStatus.failed
        proj.last_error = attempt.error
        db.commit()
        return
    candidate = f'{proj.slug}_release_{attempt.id}'
    image = f'awwwdde/{proj.slug}:release-{attempt.id}'
    hidden = [proj.db_password or '', proj.secret_key or '', proj.jwt_secret or '']
    journal = DeploymentLogger(db, attempt.id, hidden)
    publishing = attempt.stage == 'publish'

    def stage(name, status='building'):
        fence()
        journal.finish()
        attempt.stage = name; attempt.status = status; attempt.error = None
        proj.status = ProjectStatus(status)
        journal.stage = name
        journal.emit(STAGES.get(name, name), flush=True)
        # Stage durability must not depend on remaining log capacity.
        db.commit()

    try:
        options = DeployOptions.model_validate(snapshot['options'])
        extra_env = {key: secrets_box.decrypt(value) for key, value in snapshot.get('env', {}).items()}
        hidden.extend(extra_env.values())
        hidden.extend(line for value in extra_env.values() for line in value.splitlines() if len(line) >= 4)
        journal.stage = attempt.stage
        journal.emit('Worker принял задание.' if attempt.status == 'queued' else 'Worker продолжает незавершённую выкладку.', flush=True)
        if not publishing:
            stage('source')
            context = engine.prepare_source(proj.slug, snapshot.get('source'), options, log=journal.write)
            attempt.revision = engine.source_revision(context)
            engine.ensure_network()
            stage('build')
            engine.build_image(proj.slug, context, options, image_tag=image, log=journal.write)
            journal.finish()
            stage('database', 'deploying')
            if options.database_enabled:
                engine.ensure_db(proj.slug, proj.db_password)
            stage('container', 'deploying')
            engine.run_app(proj.slug, image, proj.database_url if options.database_enabled else '',
                secret_key=proj.secret_key, jwt_secret=proj.jwt_secret,
                extra_env=extra_env, options=options, container_name=candidate,
                release_id=attempt.id)
            stage('health', 'deploying')
        engine.wait_healthy(proj.slug, options=options, container_name=candidate, log=journal.write)
        journal.finish()
        stage('publish', 'deploying')
        publishing = True
        # Refresh domains immediately before publication; no stale ORM snapshot.
        db.refresh(proj)
        fence()
        caddy.upsert_route(proj.slug,
            upstream=f'{candidate}:{options.app_port or settings.guest_app_port}',
            domains=proj.custom_domains)
        proj.app_container = candidate; proj.image_tag = image
        proj.active_config = options.model_dump()
        proj.status = ProjectStatus.running; proj.last_error = None
        proj.deployed_at = datetime.now(timezone.utc)
        attempt.status = 'running'; attempt.stage = 'complete'; attempt.error = None
        attempt.finished_at = datetime.now(timezone.utc)
        journal.stage = 'complete'
        journal.emit(STAGES['complete'])
        journal.finish()
        db.commit()
    except LockLost:
        db.rollback()
        raise
    except Exception as exc:
        error = safe_error(str(exc), hidden)
        try:
            journal.finish()
        except Exception:
            pass
        db.rollback()
        attempt = db.get(Deployment, attempt.id)
        proj = db.get(Project, proj.id)
        journal.stage = attempt.stage
        # Preserve the failed candidate's startup output before cleanup removes it.
        if attempt.stage in ('container', 'health'):
            try:
                journal.write(engine.app_logs(proj.slug, tail=150, container_name=candidate))
                journal.finish()
            except Exception:
                db.rollback()
        journal.emit(error, 'error', flush=True)
        if publishing:
            # Caddy may have accepted a request whose response was lost. Keep
            # both containers and retry publication after reconnect/restart.
            attempt.status = 'deploying'; attempt.stage = 'publish'; attempt.error = error
            attempt.finished_at = None
            proj.status = ProjectStatus.deploying; proj.last_error = error
        else:
            attempt.status = 'failed'; attempt.error = error
            attempt.finished_at = datetime.now(timezone.utc)
            prior = snapshot.get('previous_status')
            proj.status = ProjectStatus(prior) if prior in ('running', 'stopped') else ProjectStatus.failed
            proj.last_error = error
        db.commit()
        if not publishing:
            try: engine._remove_container(candidate)
            except Exception: log.warning('Candidate cleanup failed for deployment %s', attempt.id)


def cleanup_retired(db, fence):
    """Allow 60 seconds for old requests to drain; never touch the active name."""
    attempts = db.scalars(select(Deployment).where(
        Deployment.status == 'running',
        Deployment.finished_at < datetime.now(timezone.utc) - timedelta(seconds=60),
    ))
    for attempt in attempts:
        snapshot = attempt.request_config or {}
        previous = snapshot.get('previous_container')
        if not previous or snapshot.get('retired_cleaned'):
            continue
        proj = db.get(Project, attempt.project_id)
        if not proj or previous == proj.app_container:
            continue
        # Names originate from panel metadata, not arbitrary paths/user input.
        if not re.fullmatch(re.escape(proj.slug) + r'_(?:app|release_\d+)', previous):
            continue
        fence()
        try:
            engine._remove_container(previous)
            engine.remove_release_image(proj.slug, snapshot.get('previous_image'))
        except Exception:
            log.warning('Retirement deferred for deployment %s', attempt.id)
            continue
        attempt.request_config = {**snapshot, 'retired_cleaned': True}
        db.commit()

    failed = db.scalars(select(Deployment).where(Deployment.status == 'failed'))
    for attempt in failed:
        snapshot = attempt.request_config or {}
        if not snapshot or snapshot.get('candidate_cleaned'):
            continue
        proj = db.get(Project, attempt.project_id)
        candidate = f'{proj.slug}_release_{attempt.id}' if proj else None
        if not proj or candidate == proj.app_container:
            continue
        fence()
        try:
            engine._remove_container(candidate)
            engine.remove_release_image(proj.slug, f'awwwdde/{proj.slug}:release-{attempt.id}')
        except Exception:
            log.warning('Failed release cleanup deferred for deployment %s', attempt.id)
            continue
        attempt.request_config = {**snapshot, 'candidate_cleaned': True}
        db.commit()


def tick() -> bool:
    """One global FIFO pass; lock is released by Postgres if worker exits."""
    with database.connect() as connection:
        locked = connection.scalar(text('SELECT pg_try_advisory_lock(:key)'), {'key': LOCK_ID})
        connection.commit()
        if not locked:
            return False
        try:
            def fence():
                # Do not let SQLAlchemy transparently reconnect and keep working
                # after the session holding the advisory lock has disappeared.
                if connection.invalidated:
                    raise LockLost('Соединение блокировки worker потеряно')
                try:
                    connection.execute(text('SELECT 1')); connection.commit()
                except Exception as exc:
                    raise LockLost('Соединение блокировки worker потеряно') from exc
            with SessionLocal() as db:
                cleanup_retired(db, fence)
                # A broken Caddy publication should not starve other sites.
                attempt = db.scalar(select(Deployment).where(Deployment.status.in_(PENDING)).order_by(
                    case((Deployment.error.is_not(None), 1), else_=0), Deployment.id,
                ).limit(1))
                if not attempt:
                    return False
                run_job(db, attempt, fence)
            return True
        finally:
            if not connection.invalidated:
                connection.execute(text('SELECT pg_advisory_unlock(:key)'), {'key': LOCK_ID})
                connection.commit()


def main():
    logging.basicConfig(level=logging.INFO)
    stop = threading.Event()
    for sig in (signal.SIGINT, signal.SIGTERM):
        signal.signal(sig, lambda *_: stop.set())
    def pulse():
        while not stop.is_set():
            try:
                with SessionLocal() as db: heartbeat(db)
            except Exception:
                log.warning('Worker heartbeat could not be saved')
            stop.wait(10)
    threading.Thread(target=pulse, name='worker-heartbeat', daemon=True).start()
    # Schema initialization belongs to panel bootstrap. Compose waits for panel
    # health before starting this process; standalone users start panel first.
    while not stop.is_set():
        try: tick()
        except Exception: log.warning('Queue pass failed; retrying (details omitted to protect secrets)')
        stop.wait(3)


if __name__ == '__main__':
    main()
