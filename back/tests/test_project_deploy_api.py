"""Actual project routes, disposable DB and fake engine: never deploy a real site."""
from pathlib import Path
import subprocess
import sys
import unittest


def isolated_check():
    import asyncio
    import importlib.util
    import json
    from deploy_test_support import DisposableWorkspace
    import types
    from fastapi import FastAPI, Header, HTTPException
    from sqlalchemy import create_engine, select
    from sqlalchemy.orm import DeclarativeBase, Session
    from sqlalchemy.pool import StaticPool
    from sqlalchemy.ext.compiler import compiles
    from sqlalchemy.dialects.postgresql import JSONB

    root = Path(__file__).resolve().parents[1]; sys.path.insert(0, str(root))
    database = create_engine('sqlite://', connect_args={'check_same_thread': False}, poolclass=StaticPool)
    class Base(DeclarativeBase): pass
    def get_db():
        with Session(database) as session: yield session
    def require_auth(authorization: str = Header(default='')):
        if authorization != 'Bearer disposable-test': raise HTTPException(401)
        return object()
    stub_db = types.ModuleType('db'); stub_db.Base = Base; stub_db.get_db = get_db; stub_db.SessionLocal = lambda: Session(database); stub_db.engine = database
    stub_auth = types.ModuleType('auth'); stub_auth.require_auth = require_auth
    workspace = DisposableWorkspace(dir=root / 'tests', prefix='deploy-test-')
    assert Path(workspace.name).resolve().is_relative_to((root / 'tests').resolve())
    stub_config = types.ModuleType('config'); stub_config.settings = types.SimpleNamespace(base_domain='example.invalid', guest_app_port=8080, workspaces_dir=workspace.name)
    stub_secrets = types.ModuleType('secrets_box'); stub_secrets.decrypt = lambda value: value
    stub_engine = types.ModuleType('engine'); stub_caddy = types.ModuleType('caddy')
    sys.modules.update(db=stub_db, auth=stub_auth, config=stub_config, secrets_box=stub_secrets, engine=stub_engine, caddy=stub_caddy)
    @compiles(JSONB, 'sqlite')
    def jsonb(_type, _compiler, **_kwargs): return 'JSON'
    import models
    from schemas import ProjectSettingsIn
    Base.metadata.create_all(database, tables=[models.Project.__table__, models.ProjectEnvVar.__table__, models.Deployment.__table__, models.DeploymentLog.__table__])
    api_package = types.ModuleType('api'); api_package.__path__ = [str(root / 'api')]; sys.modules['api'] = api_package
    spec = importlib.util.spec_from_file_location('project_router_under_test', root / 'api/projects.py')
    routes = importlib.util.module_from_spec(spec); spec.loader.exec_module(routes)
    app = FastAPI(); app.include_router(routes.router)
    import deploy_worker
    calls = []
    stub_engine.remove_release_image = lambda *args: None
    stub_engine._remove_container = lambda name: calls.append(('remove', name))
    stub_engine._names = lambda slug: (f'{slug}_app', f'{slug}_db', f'awwwdde/{slug}:latest', f'{slug}_db_data')
    stub_engine.gen_db_password = lambda: 'db-secret-test'
    stub_engine.gen_secret = lambda: 'base-secret-test'
    stub_engine.prepare_source = lambda slug, source, options, **kwargs: Path(workspace.name) / slug
    stub_engine.app_logs = lambda *args, **kwargs: 'Startup failed: external-secret-test\n'
    stub_engine.source_revision = lambda path: 'a' * 40
    stub_engine.ensure_network = lambda: calls.append(('network',))
    stub_engine.ensure_db = lambda *args: calls.append(('db',))
    stub_engine.run_app = lambda *args, **kwargs: calls.append(('run', kwargs))
    stub_engine.wait_healthy = lambda *args, **kwargs: calls.append(('health', kwargs))
    stub_engine.start_project = lambda *args, **kwargs: calls.append(('start', kwargs))
    stub_caddy.upsert_route = lambda *args, **kwargs: calls.append(('route', kwargs))
    def build(slug, context, options, **kwargs):
        kwargs['log']('Building: external-secret-test\n')
        calls.append(('build', options))
        assert kwargs['image_tag'].startswith('awwwdde/alpha:release-')
        with Session(database) as other:
            try: routes.deploy_project(slug, None, other, object())
            except HTTPException as exc: assert exc.status_code == 409
            else: raise AssertionError('Duplicate deployment accepted')
        with Session(database) as other:
            try: routes.project_settings(slug, ProjectSettingsIn(), other, object())
            except HTTPException as exc: assert exc.status_code == 409
            else: raise AssertionError('Settings changed during deployment')
    stub_engine.build_image = build

    def request(method, path, payload=None, authorized=True):
        async def run():
            events = []; body = json.dumps(payload).encode() if payload is not None else b''
            async def receive(): return {'type': 'http.request', 'body': body, 'more_body': False}
            async def send(event): events.append(event)
            headers = [(b'content-type', b'application/json')]
            if authorized: headers.append((b'authorization', b'Bearer disposable-test'))
            await app({'type': 'http', 'asgi': {'version': '3.0'}, 'http_version': '1.1', 'method': method, 'scheme': 'http', 'path': path, 'raw_path': path.encode(), 'query_string': b'', 'root_path': '', 'headers': headers, 'client': ('127.0.0.1', 1234), 'server': ('test', 80)}, receive, send)
            return next(e['status'] for e in events if e['type'] == 'http.response.start'), json.loads(b''.join(e.get('body', b'') for e in events if e['type'] == 'http.response.body'))
        return asyncio.run(run())

    cfg = {'app_port': 3000, 'health_path': '/ready', 'memory_mb': 512, 'cpus': .5, 'database_enabled': False}
    status, created = request('POST', '/api/projects', {'slug': 'alpha', 'deploy_config': cfg})
    assert status == 201
    assert request('GET', '/api/projects/alpha/deployments', authorized=False)[0] == 401
    assert request('PUT', '/api/projects/alpha/settings', {'deploy_config': cfg}, authorized=False)[0] == 401
    assert request('PUT', '/api/projects/alpha/settings', {'deploy_config': {'app_port': 70000}})[0] == 422
    folder = Path(workspace.name) / 'alpha'; folder.mkdir(); (folder / 'Dockerfile').write_text('FROM scratch')
    assert request('GET', '/api/projects/alpha/preflight')[1]['can_deploy'] is True
    assert request('GET', '/api/projects/alpha/readiness', authorized=False)[0] == 401
    from datetime import datetime, timezone
    routes.inspect_server = lambda db: {'at': datetime.now(timezone.utc), 'checks': [{'key': 'docker', 'label': 'Docker', 'status': 'error', 'message': 'Unavailable'}]}
    assert request('GET', '/api/projects/alpha/readiness')[1]['can_deploy'] is False
    routes.inspect_server = lambda db: {'at': datetime.now(timezone.utc), 'checks': [{'key': 'docker', 'label': 'Docker', 'status': 'ok', 'message': 'Available'}]}
    assert request('GET', '/api/projects/alpha/readiness')[1]['can_deploy'] is True
    assert not calls
    (folder / 'Dockerfile').unlink()
    assert request('GET', '/api/projects/alpha/preflight')[1]['can_deploy'] is False
    (folder / 'Dockerfile').write_text('FROM scratch')
    status, deployed = request('POST', '/api/projects/alpha/deploy', {})
    assert status == 202, deployed
    assert request('GET', '/api/projects/alpha/deployments/1/logs', authorized=False)[0] == 401
    assert request('GET', '/api/projects/alpha/deployments/999/logs')[0] == 404
    assert not calls, 'Enqueue must not call Docker or Caddy'
    history = request('GET', '/api/projects/alpha/deployments')[1]
    assert history[0]['status'] == 'queued' and 'request_config' not in history[0]
    assert request('POST', '/api/projects/alpha/deploy', {})[0] == 409
    with Session(database) as session:
        deploy_worker.run_job(session, session.get(models.Deployment, history[0]['id']))
    assert not any(call[0] == 'db' for call in calls)
    assert next(call[1]['options'].memory_mb for call in calls if call[0] == 'run') == 512
    assert next(call[1]['upstream'] for call in calls if call[0] == 'route') == 'alpha_release_1:3000'
    history = request('GET', '/api/projects/alpha/deployments')[1]
    assert len(history) == 1 and history[0]['stage'] == 'complete' and history[0]['finished_at'] and history[0]['revision'] == 'a' * 40
    cfg['app_port'] = 4000
    assert request('PUT', '/api/projects/alpha/settings', {'deploy_config': cfg})[0] == 200
    calls.clear()
    assert request('POST', '/api/projects/alpha/start')[0] == 200
    assert next(call[1]['upstream'] for call in calls if call[0] == 'route') == 'alpha_release_1:3000'
    assert next(call[1]['options'].app_port for call in calls if call[0] == 'health') == 3000
    with Session(database) as session:
        session.add(models.ProjectEnvVar(project_id=created['id'], key='TEST_SECRET', value_encrypted='external-secret-test')); session.commit()
    def failed(*args, **kwargs): raise RuntimeError('external-secret-test base-secret-test https://user:password@example.invalid')
    stub_engine.wait_healthy = failed
    status, error = request('POST', '/api/projects/alpha/deploy', {})
    assert status == 202
    # Editing env after enqueue cannot change the encrypted request snapshot.
    with Session(database) as session:
        env = session.scalar(select(models.ProjectEnvVar))
        env.value_encrypted = 'changed-after-enqueue'; session.commit()
    # Simulate process restart: reload durable job in a completely new session.
    with Session(database) as session:
        job = session.scalar(select(models.Deployment).where(models.Deployment.status == 'queued'))
        deploy_worker.run_job(session, job)
    assert next(call[1]['extra_env']['TEST_SECRET'] for call in reversed(calls) if call[0] == 'run') == 'external-secret-test'
    assert calls[-1] == ('remove', 'alpha_release_2')
    assert not any(call == ('remove', 'alpha_release_1') for call in calls)

    history = request('GET', '/api/projects/alpha/deployments')[1]
    assert len(history) == 2 and history[0]['stage'] == 'health' and history[0]['status'] == 'failed'
    assert 'external-secret-test' not in history[0]['error']
    logs = request('GET', '/api/projects/alpha/deployments/2/logs')[1]
    assert any('Startup failed' in line['message'] for line in logs['lines'])
    assert 'external-secret-test' not in str(logs) and 'password' not in str(logs)
    assert any(line['level'] == 'error' for line in logs['lines'])
    with Session(database) as session:
        from deploy_logs import DeploymentLogger
        logger = DeploymentLogger(session, 2, ['split-secret-value'])
        logger.write('token: split-sec'); logger.write('ret-value\n')
        logger.finish()
    logs = request('GET', '/api/projects/alpha/deployments/2/logs')[1]
    assert 'split-secret-value' not in str(logs)
    assert logs['next_cursor'] == logs['lines'][-1]['id']
    first = routes.deployment_logs('alpha', 2, after=0, limit=1, db=Session(database), _=object())
    assert len(first.lines) == 1 and first.has_more
    with Session(database) as session:
        rest = routes.deployment_logs('alpha', 2, after=first.next_cursor, limit=500, db=session, _=object())
        assert all(line.id > first.next_cursor for line in rest.lines)
    assert request('POST', '/api/projects', {'slug': 'beta'})[0] == 201
    assert request('GET', '/api/projects/beta/deployments/2/logs')[0] == 404

    with Session(database) as session:
        project = session.scalar(select(models.Project))
        assert project.active_config['app_port'] == 3000
        assert project.app_container == 'alpha_release_1' and project.status == models.ProjectStatus.running

    # Interrupted publication: uncertain Caddy response must retain both releases.
    stub_engine.wait_healthy = lambda *args, **kwargs: calls.append(('health', kwargs))
    def uncertain_route(*args, **kwargs): raise RuntimeError('Caddy response lost')
    stub_caddy.upsert_route = uncertain_route
    assert request('POST', '/api/projects/alpha/deploy', {})[0] == 202
    with Session(database) as session:
        job = session.scalar(select(models.Deployment).where(models.Deployment.status == 'queued'))
        deploy_worker.run_job(session, job)
        assert job.stage == 'publish' and job.status == 'deploying' and job.finished_at is None
    assert not any(call == ('remove', 'alpha_release_3') for call in calls)
    calls.clear()
    stub_caddy.upsert_route = lambda *args, **kwargs: calls.append(('route', kwargs))
    with Session(database) as session:
        job = session.get(models.Deployment, 3)
        deploy_worker.run_job(session, job)
        assert job.status == 'running'
        assert session.get(models.Project, created['id']).app_container == 'alpha_release_3'
    assert [call[0] for call in calls] == ['health', 'route'], 'Publish recovery must not rebuild/recreate routed candidate'

    # Graceful retirement only removes recorded previous container, never active.
    from datetime import datetime, timedelta, timezone
    with Session(database) as session:
        job = session.get(models.Deployment, 3)
        job.finished_at = datetime.now(timezone.utc) - timedelta(seconds=70); session.commit()
        deploy_worker.cleanup_retired(session, lambda: None)
        assert ('remove', 'alpha_release_1') in calls
        assert job.request_config['retired_cleaned'] is True
        before = len([call for call in calls if call == ('remove', 'alpha_release_1')])
        deploy_worker.cleanup_retired(session, lambda: None)
        assert len([call for call in calls if call == ('remove', 'alpha_release_1')]) == before

    # Replaying a pre-publish interrupted attempt reuses deterministic release ID.
    calls.clear()
    assert request('POST', '/api/projects/alpha/deploy', {})[0] == 202
    with Session(database) as session:
        job = session.get(models.Deployment, 4)
        job.stage = 'health'; job.status = 'deploying'; session.commit()
    with Session(database) as session:
        deploy_worker.run_job(session, session.get(models.Deployment, 4))
        assert session.get(models.Project, created['id']).app_container == 'alpha_release_4'
    assert next(call[1]['container_name'] for call in calls if call[0] == 'run') == 'alpha_release_4'

    # A lost advisory-lock connection must not finish/fail or clean the job.
    assert request('POST', '/api/projects/alpha/deploy', {})[0] == 202
    def lost(): raise deploy_worker.LockLost('lost')
    calls.clear()
    with Session(database) as session:
        try: deploy_worker.run_job(session, session.get(models.Deployment, 5), lost)
        except deploy_worker.LockLost: pass
        else: raise AssertionError('Lost worker lock was ignored')
        assert session.get(models.Deployment, 5).status == 'queued'
    assert not calls

    # Exercise production tick and release the lock even on an unexpected error.
    class LockConnection:
        invalidated = False
        granted = False
        statements = []
        def __enter__(self): return self
        def __exit__(self, *_): pass
        def scalar(self, statement, *_):
            self.statements.append(str(statement)); return self.granted
        def execute(self, statement, *_): self.statements.append(str(statement))
        def commit(self): pass
    connection = LockConnection()
    deploy_worker.database = types.SimpleNamespace(connect=lambda: connection)
    assert deploy_worker.tick() is False and not calls
    connection.granted = True
    assert deploy_worker.tick() is True
    assert any('pg_advisory_unlock' in query for query in connection.statements)
    assert next(call[1]['container_name'] for call in calls if call[0] == 'run') == 'alpha_release_5'
    with Session(database) as session:
        assert session.get(models.Deployment, 5).status == 'running'

    assert request('POST', '/api/projects/alpha/deploy', {})[0] == 202
    original_run_job = deploy_worker.run_job
    def crash(*args, **kwargs): raise RuntimeError('simulated worker crash')
    deploy_worker.run_job = crash
    connection.statements.clear()
    try: deploy_worker.tick()
    except RuntimeError: pass
    else: raise AssertionError('Worker exception swallowed by tick')
    finally: deploy_worker.run_job = original_run_job
    assert any('pg_advisory_unlock' in query for query in connection.statements)
    with Session(database) as session:
        assert session.get(models.Deployment, 6).status == 'queued'

    workspace.cleanup(); database.dispose()


class ProjectDeployApiTests(unittest.TestCase):
    def test_settings_preflight_history_claim_and_failure(self):
        result = subprocess.run([sys.executable, str(Path(__file__).resolve()), '--isolated'], capture_output=True, text=True, timeout=40)
        self.assertEqual(result.returncode, 0, result.stderr)


if __name__ == '__main__':
    if '--isolated' in sys.argv: isolated_check()
    else: unittest.main()
