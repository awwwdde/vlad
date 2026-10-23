"""Regression tests for real SQLAlchemy rows and unavailable Docker, no network."""
from pathlib import Path
import subprocess
import sys
import unittest


def isolated_check():
    import asyncio
    from datetime import datetime, timedelta, timezone
    import importlib.util
    import json
    import types
    from fastapi import FastAPI, Header, HTTPException
    from sqlalchemy import create_engine, func, select
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
        if authorization != 'Bearer test': raise HTTPException(401)
    stub_db = types.ModuleType('db'); stub_db.Base = Base; stub_db.get_db = get_db; stub_db.SessionLocal = lambda: Session(database)
    config = types.ModuleType('config'); config.settings = types.SimpleNamespace(base_domain='example.invalid', guest_app_port=8080)
    auth = types.ModuleType('auth'); auth.require_auth = require_auth
    engine = types.ModuleType('engine')
    def unavailable(*_args): raise RuntimeError('Docker unavailable')
    engine.db_size_bytes = unavailable
    sys.modules.update(db=stub_db, config=config, auth=auth, engine=engine)
    @compiles(JSONB, 'sqlite')
    def jsonb(*_args, **_kwargs): return 'JSON'
    import models
    Base.metadata.create_all(database, tables=[models.Project.__table__, models.ProjectEnvVar.__table__, models.MetricSample.__table__, models.MetricHourly.__table__, models.HealthEvent.__table__])
    package = types.ModuleType('api'); package.__path__ = [str(root / 'api')]; sys.modules['api'] = package
    spec = importlib.util.spec_from_file_location('metrics_routes_under_test', root / 'api/metrics.py')
    routes = importlib.util.module_from_spec(spec); spec.loader.exec_module(routes)
    # SQLite has no PG date_bin: keep the actual grouping and Row objects,
    # substitute just the bucket SQL function. The previous Row.t fails here.
    routes._bucket = lambda column, _step: func.strftime('%Y-%m-%dT%H:00:00', column)
    app = FastAPI(); app.include_router(routes.router)

    def request(path, query='', authorized=True):
        async def run():
            events = []
            async def receive(): return {'type': 'http.request', 'body': b'', 'more_body': False}
            async def send(event): events.append(event)
            headers = [(b'authorization', b'Bearer test')] if authorized else []
            await app({'type': 'http', 'asgi': {'version': '3.0'}, 'http_version': '1.1', 'method': 'GET', 'scheme': 'http', 'path': path, 'raw_path': path.encode(), 'query_string': query.encode(), 'root_path': '', 'headers': headers, 'client': ('127.0.0.1', 1234), 'server': ('test', 80)}, receive, send)
            return next(e['status'] for e in events if e['type'] == 'http.response.start'), json.loads(b''.join(e.get('body', b'') for e in events if e['type'] == 'http.response.body'))
        return asyncio.run(run())

    now = datetime.now(timezone.utc)
    with Session(database) as db:
        project = models.Project(slug='alpha', status=models.ProjectStatus.running, app_container='alpha_release_12', deployed_at=now)
        db.add(project); db.commit(); pid = project.id
        db.add_all([
            models.MetricSample(project_id=pid, container='app', taken_at=now - timedelta(seconds=20), state='running', cpu_percent=12.5, mem_bytes=1024, mem_limit_bytes=4096),
            models.MetricSample(project_id=pid, container='app', taken_at=now, state='missing', cpu_percent=0, mem_bytes=0, mem_limit_bytes=4096),
            models.MetricHourly(project_id=pid, container='app', hour=now - timedelta(hours=1), samples=20, cpu_avg=15, cpu_max=35, mem_avg=2048, mem_max=3072),
            models.HealthEvent(project_id=pid, at=now, state='missing'),
        ]); db.commit()
    assert request('/api/projects/alpha/metrics', authorized=False)[0] == 401
    for period in ('1h', '24h', '7d', '30d'):
        status, data = request('/api/projects/alpha/metrics', 'range=' + period)
        assert status == 200 and data['series'] and isinstance(data['series'][0]['points'][0]['t'], str), data
        assert data['last_sample_at'] and data['warning'] is None
    status, health = request('/api/projects/alpha/health')
    assert status == 200 and health['uptime_percent'] == 50
    assert health['db_size_bytes'] is None and 'Docker' in health['warning']
    status, overview = request('/api/metrics/overview')
    assert status == 200 and overview['cpu_percent_total'] == 0 and overview['projects'][0]['state'] == 'missing'
    with Session(database) as db:
        for sample in db.scalars(select(models.MetricSample)):
            sample.taken_at = now - timedelta(minutes=10)
        db.commit()
    _, stale = request('/api/metrics/overview')
    assert stale['warning'] and stale['cpu_percent_total'] is None and stale['projects'][0]['mem_bytes'] is None
    _, stale_health = request('/api/projects/alpha/health')
    assert stale_health['state'] is None
    assert request('/api/projects/alpha/metrics')[1]['warning']

    # Actual collector records a missing app and follows the active release name.
    import metrics_collector
    queried = []
    def missing(name): queried.append(name); return None
    engine.container_stats = missing
    with Session(database) as db:
        project = db.get(models.Project, pid); project.active_config = {'database_enabled': False}; db.commit()
        assert metrics_collector.collect_once(db) == 1
        assert queried == ['alpha_release_12']
        newest = db.scalar(select(models.MetricSample).order_by(models.MetricSample.id.desc()))
        assert newest.state == 'missing' and newest.mem_bytes == 0
    database.dispose()


class MetricsApiTests(unittest.TestCase):
    def test_timeseries_health_overview_staleness_and_collector(self):
        result = subprocess.run([sys.executable, str(Path(__file__).resolve()), '--isolated'], capture_output=True, text=True, timeout=40)
        self.assertEqual(result.returncode, 0, result.stderr)


if __name__ == '__main__':
    if '--isolated' in sys.argv: isolated_check()
    else: unittest.main()
