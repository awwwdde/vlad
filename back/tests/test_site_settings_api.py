"""Exercise the actual settings router against disposable SQLite, no app config."""
from pathlib import Path
import subprocess
import sys
import unittest


def isolated_check():
    import asyncio
    import importlib.util
    import json
    import types
    from fastapi import FastAPI, Header, HTTPException
    from sqlalchemy import create_engine
    from sqlalchemy.orm import DeclarativeBase, Session
    from sqlalchemy.pool import StaticPool
    from sqlalchemy.ext.compiler import compiles
    from sqlalchemy.dialects.postgresql import JSONB

    root = Path(__file__).resolve().parents[1]
    sys.path.insert(0, str(root))
    engine = create_engine('sqlite://', connect_args={'check_same_thread': False}, poolclass=StaticPool)
    class Base(DeclarativeBase): pass
    def get_db():
        with Session(engine) as session: yield session
    def require_auth(authorization: str = Header(default='')):
        if authorization != 'Bearer disposable-test': raise HTTPException(401)
        return object()
    stub_db = types.ModuleType('db'); stub_db.Base = Base; stub_db.get_db = get_db
    stub_auth = types.ModuleType('auth'); stub_auth.require_auth = require_auth
    sys.modules['db'] = stub_db; sys.modules['auth'] = stub_auth
    @compiles(JSONB, 'sqlite')
    def jsonb(_type, _compiler, **_kwargs): return 'JSON'
    import models
    Base.metadata.create_all(engine, tables=[models.SiteSetting.__table__])
    spec = importlib.util.spec_from_file_location('settings_test_router', root / 'api/site_settings.py')
    module = importlib.util.module_from_spec(spec); spec.loader.exec_module(module)
    app = FastAPI(); app.include_router(module.router)

    def request(method, path, payload=None, authorized=True):
        async def run():
            events = []; body = json.dumps(payload).encode() if payload is not None else b''
            async def receive(): return {'type': 'http.request', 'body': body, 'more_body': False}
            async def send(event): events.append(event)
            headers = [(b'content-type', b'application/json')]
            if authorized: headers.append((b'authorization', b'Bearer disposable-test'))
            await app({'type': 'http', 'asgi': {'version': '3.0'}, 'http_version': '1.1', 'method': method, 'scheme': 'http', 'path': path, 'raw_path': path.encode(), 'query_string': b'', 'root_path': '', 'headers': headers, 'client': ('127.0.0.1', 1234), 'server': ('test', 80)}, receive, send)
            status = next(e['status'] for e in events if e['type'] == 'http.response.start')
            return status, json.loads(b''.join(e.get('body', b'') for e in events if e['type'] == 'http.response.body'))
        return asyncio.run(run())

    assert request('PUT', '/api/site/settings', {'values': {'sky_animated': 'false'}}, authorized=False)[0] == 401
    assert request('PUT', '/api/site/settings', {'values': {'contact_email': 'test@example.invalid', 'sky_animated': 'false'}})[0] == 200
    invalid = request('PUT', '/api/site/settings', {'values': {'contact_email': 'changed@example.invalid', 'calculator_url': 'javascript:alert(1)'}})
    assert invalid[0] == 422
    stored = request('GET', '/api/site/settings')[1]
    assert stored['contact_email'] == 'test@example.invalid' and stored['sky_animated'] == 'false'
    assert 'calculator_url' not in stored
    assert request('PUT', '/api/site/settings/privacy_approved', {'value': 'true'})[0] == 422
    assert request('PUT', '/api/site/settings/sky_animated', {'value': 'true'})[0] == 200
    assert request('GET', '/api/site/settings')[1]['sky_animated'] == 'true'
    scene_keys = ('about_model_animated', 'contact_model_animated', 'case_model_animated', 'about_cat_enabled')
    assert request('PUT', '/api/site/settings', {'values': {key: 'false' for key in scene_keys}})[0] == 200
    stored = request('GET', '/api/site/settings')[1]
    assert all(stored[key] == 'false' for key in scene_keys)
    assert request('PUT', '/api/site/settings', {'values': {'about_cat_enabled': 'yes'}})[0] == 422
    engine.dispose()


class SettingsApiTests(unittest.TestCase):
    def test_auth_validation_and_atomic_persistence(self):
        result = subprocess.run([sys.executable, str(Path(__file__).resolve()), '--isolated'], capture_output=True, text=True, timeout=30)
        self.assertEqual(result.returncode, 0, result.stderr)


if __name__ == '__main__':
    if '--isolated' in sys.argv: isolated_check()
    else: unittest.main()
