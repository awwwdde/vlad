"""Exercise the actual portfolio router against disposable SQLite, no app config."""
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
    sys.modules['uploads'] = types.ModuleType('uploads')
    @compiles(JSONB, 'sqlite')
    def jsonb(_type, _compiler, **_kwargs): return 'JSON'
    import models
    Base.metadata.create_all(engine, tables=[models.PortfolioItem.__table__])
    spec = importlib.util.spec_from_file_location('settings_test_router', root / 'api/portfolio.py')
    module = importlib.util.module_from_spec(spec)
    # JSON CRUD only; upload routes require optional multipart, not exercised here.
    source = (root / 'api/portfolio.py').read_text(encoding='utf-8').split('# ── Галерея карточки')[0]
    exec(compile(source, str(root / 'api/portfolio.py'), 'exec'), module.__dict__)
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

    payload = {'slug': 'case-test', 'ru': {'title': 'Тест', 'desc': 'Описание'}, 'en': {'title': 'Test'}}
    assert request('POST', '/api/content/portfolio', payload, authorized=False)[0] == 401
    status, created = request('POST', '/api/content/portfolio', payload)
    assert status == 201 and created['ru']['steps'] == [] and created['ru']['challenge'] == ''
    with Session(engine) as session:
        item = session.get(models.PortfolioItem, created['id'])
        item.images = ['kept-cover.webp', 'kept-detail.webp']; session.commit()
    payload['ru'].update({'client': 'Клиент', 'year': '2026', 'role': 'Дизайн', 'duration': '3 недели', 'challenge': 'Задача\nВторая строка', 'approach': 'Решение', 'outcome': 'Результат', 'steps': [{'title': 'Первый этап', 'body': 'Подробности'}], 'deliverables': ['Дизайн', 'Код'], 'gallery_captions': ['Обложка', 'Детали']})
    payload['en'].update({'challenge': 'English challenge', 'outcome': 'English outcome'})
    assert request('PUT', '/api/content/portfolio/case-test', payload)[0] == 200
    saved = request('GET', '/api/content/portfolio', authorized=False)[1][0]
    for lang in ('ru', 'en'):
        for key, value in payload[lang].items(): assert saved[lang][key] == value, (lang, key)
    assert saved['images'] == ['/uploads/kept-cover.webp', '/uploads/kept-detail.webp']
    payload['ru']['steps'] = [{'title': 'too many'}] * 21
    assert request('PUT', '/api/content/portfolio/case-test', payload)[0] == 422
    assert request('GET', '/api/content/portfolio')[1][0]['ru']['steps'][0]['title'] == 'Первый этап'
    engine.dispose()


class PortfolioApiTests(unittest.TestCase):
    def test_legacy_defaults_bilingual_case_roundtrip_and_gallery_preservation(self):
        result = subprocess.run([sys.executable, str(Path(__file__).resolve()), '--isolated'], capture_output=True, text=True, timeout=30)
        self.assertEqual(result.returncode, 0, result.stderr)


if __name__ == '__main__':
    if '--isolated' in sys.argv: isolated_check()
    else: unittest.main()
