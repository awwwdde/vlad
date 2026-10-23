"""Read-only server probes with disposable DB and fake Docker/Git/Caddy."""
from pathlib import Path
import subprocess
import sys
import unittest


def isolated_check():
    import asyncio
    from datetime import timedelta
    import importlib.util
    import json
    import types
    from unittest.mock import patch
    from fastapi import FastAPI, Header, HTTPException
    from sqlalchemy import create_engine
    from sqlalchemy.orm import DeclarativeBase, Session
    from sqlalchemy.pool import StaticPool
    root = Path(__file__).resolve().parents[1]; sys.path.insert(0, str(root))
    database = create_engine('sqlite://', connect_args={'check_same_thread': False}, poolclass=StaticPool)
    class Base(DeclarativeBase): pass
    def get_db():
        with Session(database) as db: yield db
    def require_auth(authorization: str = Header(default='')):
        if authorization != 'Bearer test': raise HTTPException(401)
    db_module = types.ModuleType('db'); db_module.Base = Base; db_module.get_db = get_db
    config = types.ModuleType('config'); config.settings = types.SimpleNamespace(workspaces_dir=str(root), base_domain='example.invalid')
    auth = types.ModuleType('auth'); auth.require_auth = require_auth
    caddy = types.ModuleType('caddy'); caddy.ping = lambda: True
    sys.modules.update(db=db_module, config=config, auth=auth, caddy=caddy)
    import models
    import server_diagnostics as probes
    Base.metadata.create_all(database, tables=[models.ServiceHeartbeat.__table__])
    closed = []
    docker_client = types.SimpleNamespace(ping=lambda: True, close=lambda: closed.append(True))
    probes.docker = types.SimpleNamespace(from_env=lambda **kwargs: docker_client)
    probes.shutil = types.SimpleNamespace(disk_usage=lambda root: types.SimpleNamespace(free=10 * 1024**3))
    spec = importlib.util.spec_from_file_location('health_routes_test', root / 'api/health.py')
    routes = importlib.util.module_from_spec(spec); spec.loader.exec_module(routes)
    app = FastAPI(); app.include_router(routes.router)
    def request(authorized):
        async def run():
            events = []
            async def receive(): return {'type': 'http.request', 'body': b'', 'more_body': False}
            async def send(event): events.append(event)
            await app({'type': 'http', 'asgi': {'version': '3.0'}, 'http_version': '1.1', 'method': 'GET', 'scheme': 'http', 'path': '/api/system/diagnostics', 'raw_path': b'/api/system/diagnostics', 'query_string': b'', 'root_path': '', 'headers': [(b'authorization', b'Bearer test')] if authorized else [], 'client': ('127.0.0.1', 1234), 'server': ('test', 80)}, receive, send)
            return next(e['status'] for e in events if e['type'] == 'http.response.start'), json.loads(b''.join(e.get('body', b'') for e in events if e['type'] == 'http.response.body'))
        return asyncio.run(run())
    assert request(False)[0] == 401 and not closed
    status, absent = request(True)
    assert status == 200 and absent['can_deploy'] is False
    assert next(c for c in absent['checks'] if c['key'] == 'worker')['status'] == 'error'
    with Session(database) as db: probes.heartbeat(db)
    assert request(True)[1]['can_deploy'] is True and closed
    with Session(database) as db:
        pulse = db.get(models.ServiceHeartbeat, 'deploy_worker'); pulse.seen_at = probes.now() - timedelta(seconds=60); db.commit()
    assert request(True)[1]['can_deploy'] is False
    with Session(database) as db: probes.heartbeat(db)
    probes.shutil.disk_usage = lambda root: types.SimpleNamespace(free=500 * 1024**2)
    assert next(c for c in request(True)[1]['checks'] if c['key'] == 'disk')['status'] == 'error'
    def failure(**kwargs): raise RuntimeError('secret-value-must-not-leak')
    probes.docker.from_env = failure
    caddy.ping = lambda: False
    _, down = request(True)
    assert 'secret-value-must-not-leak' not in str(down)
    assert next(c for c in down['checks'] if c['key'] == 'docker')['status'] == 'error'
    assert next(c for c in down['checks'] if c['key'] == 'caddy')['status'] == 'error'
    assert probes.inspect_git(None, '') is None
    with patch.object(probes.subprocess, 'run') as git:
        assert probes.inspect_git('https://example.invalid/repo.git', 'main')['status'] == 'ok'
        args, kwargs = git.call_args
        assert args[0][-1] == 'refs/heads/main' and kwargs['timeout'] == 12
        assert kwargs['env']['GIT_TERMINAL_PROMPT'] == '0'
    with patch.object(probes.subprocess, 'run', side_effect=RuntimeError('private-token')):
        result = probes.inspect_git('https://token@example.invalid/repo.git', '')
        assert result['status'] == 'error' and 'private-token' not in str(result) and 'token@' not in str(result)
    database.dispose()


class ServerDiagnosticsTests(unittest.TestCase):
    def test_auth_worker_disk_docker_caddy_and_git(self):
        result = subprocess.run([sys.executable, str(Path(__file__).resolve()), '--isolated'], capture_output=True, text=True, timeout=30)
        self.assertEqual(result.returncode, 0, result.stderr)


if __name__ == '__main__':
    if '--isolated' in sys.argv: isolated_check()
    else: unittest.main()
