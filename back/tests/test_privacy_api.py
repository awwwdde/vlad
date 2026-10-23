"""Exercise real contact routes in an isolated process and disposable in-memory DB.

No application configuration, credentials or production database are loaded.
SQLite substitutes for PostgreSQL JSONB here; deployment still needs a PG check.
"""
from pathlib import Path
import subprocess
import sys
import unittest


def isolated_check():
    import importlib.util
    import types
    import asyncio
    import json
    from sqlalchemy import create_engine, select, func
    from sqlalchemy.orm import DeclarativeBase, Session
    from sqlalchemy.pool import StaticPool
    from sqlalchemy.ext.compiler import compiles
    from sqlalchemy.dialects.postgresql import JSONB
    from fastapi import FastAPI

    root = Path(__file__).resolve().parents[1]
    sys.path.insert(0, str(root))
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)

    class Base(DeclarativeBase):
        pass

    def get_db():
        with Session(engine) as session:
            yield session

    stub_db = types.ModuleType("db")
    stub_db.Base, stub_db.get_db = Base, get_db
    sys.modules["db"] = stub_db
    stub_auth = types.ModuleType("auth")
    stub_auth.require_auth = lambda: object()
    sys.modules["auth"] = stub_auth

    @compiles(JSONB, "sqlite")
    def jsonb_for_sqlite(_type, _compiler, **_kwargs):
        return "JSON"

    import models
    from privacy import REQUIRED
    tables = [models.ContactMessage.__table__, models.ContactConsent.__table__, models.SiteSetting.__table__]
    Base.metadata.create_all(engine, tables=tables)
    spec = importlib.util.spec_from_file_location("contact_routes_under_test", root / "api/messages.py")
    routes = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(routes)
    app = FastAPI()
    app.include_router(routes.router)
    def request(method, path, payload=None):
        async def run():
            events = []
            body = json.dumps(payload).encode() if payload is not None else b""
            async def receive():
                return {"type": "http.request", "body": body, "more_body": False}
            async def send(event):
                events.append(event)
            await app({"type": "http", "asgi": {"version": "3.0"}, "http_version": "1.1", "method": method,
                       "scheme": "http", "path": path, "raw_path": path.encode(), "query_string": b"",
                       "root_path": "", "headers": [(b"content-type", b"application/json")],
                       "client": ("127.0.0.1", 1234), "server": ("test", 80)}, receive, send)
            status = next(e["status"] for e in events if e["type"] == "http.response.start")
            response_body = b"".join(e.get("body", b"") for e in events if e["type"] == "http.response.body")
            return types.SimpleNamespace(status_code=status, json=lambda: json.loads(response_body))
        return asyncio.run(run())
    client = types.SimpleNamespace(get=lambda path: request("GET", path), post=lambda path, json: request("POST", path, json), delete=lambda path: request("DELETE", path))
    payload = {"email": "test@example.invalid", "name": "Test", "message": "Disposable local test", "source": "contact"}

    assert client.get("/api/privacy").json()["ready"] is False
    assert client.post("/api/contact", json=payload).status_code == 503
    with Session(engine) as session:
        for key in REQUIRED:
            session.add(models.SiteSetting(key=f"privacy_{key}", value=f"TEST {key}"))
        session.add(models.SiteSetting(key="privacy_approved", value="true"))
        session.commit()
    doc = client.get("/api/privacy").json()
    assert doc["ready"] is True
    assert client.post("/api/contact", json=payload).status_code == 422
    assert client.post("/api/contact", json={**payload, "consent": "true", "consent_version": doc["version"]}).status_code == 422
    assert client.post("/api/contact", json={**payload, "consent": True, "consent_version": "old"}).status_code == 422
    assert client.post("/api/contact", json={**payload, "consent": True, "consent_version": doc["version"]}).status_code == 201
    with Session(engine) as session:
        message = session.scalar(select(models.ContactMessage))
        evidence = session.scalar(select(models.ContactConsent))
        assert evidence.message_id == message.id and evidence.snapshot == doc
        assert evidence.accepted_at is not None and evidence.version == doc["version"]
        message_id = message.id
        session.get(models.SiteSetting, "privacy_operator").value = "Changed TEST operator"
        session.commit()
    assert client.post("/api/contact", json={**payload, "consent": True, "consent_version": doc["version"]}).status_code == 422
    assert client.delete(f"/api/messages/{message_id}").status_code == 200
    with Session(engine) as session:
        assert session.scalar(select(func.count()).select_from(models.ContactMessage)) == 0
        assert session.scalar(select(func.count()).select_from(models.ContactConsent)) == 0
    engine.dispose()


class PrivacyApiTests(unittest.TestCase):
    def test_routes_and_atomic_consent_record(self):
        result = subprocess.run([sys.executable, str(Path(__file__).resolve()), "--isolated"], capture_output=True, text=True, timeout=30)
        self.assertEqual(result.returncode, 0, result.stderr)


if __name__ == "__main__":
    if "--isolated" in sys.argv:
        isolated_check()
    else:
        unittest.main()
