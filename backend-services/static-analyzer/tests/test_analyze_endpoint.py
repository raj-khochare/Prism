"""Endpoint-level test with Slither and Gemini mocked (no compiler/network needed)."""
import os
import uuid

os.environ.setdefault("DATABASE_URL", "sqlite://")

from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy import create_engine  # noqa: E402
from sqlalchemy.orm import sessionmaker  # noqa: E402
from sqlalchemy.pool import StaticPool  # noqa: E402

from app.database import Base  # noqa: E402
from app.dependencies import get_db  # noqa: E402
from app.main import app as fastapi_app  # noqa: E402
import app.models  # noqa: E402,F401
import app.api.analyze as analyze_mod  # noqa: E402
from app.models import StaticAnalysis  # noqa: E402

engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
Session = sessionmaker(bind=engine, autoflush=False)
Base.metadata.create_all(engine)


def _db():
    db = Session()
    try:
        yield db
    finally:
        db.close()


fastapi_app.dependency_overrides[get_db] = _db
client = TestClient(fastapi_app)

SRC = """pragma solidity ^0.8.20;
contract V { uint public value;
  function increase(uint amount) external { unchecked { value += amount; } } }"""


def test_contract_id_form_field_is_persisted(monkeypatch):
    monkeypatch.setattr(analyze_mod, "run_slither", lambda path, src=None: {"results": {"detectors": []}})
    monkeypatch.setattr(analyze_mod, "analyze_finding", lambda f: {"explanation": "x", "impact": None, "recommendation": "fix it"})
    cid = str(uuid.uuid4())

    r = client.post("/analyze", files={"file": ("UploadedContract.sol", SRC, "text/plain")}, data={"contract_id": cid})
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["success"] and len(body["findings"]) == 1          # custom detector fired
    assert body["findings"][0]["analysis"]["impact"] == ""          # null coalesced (NOT NULL column)

    db = Session()
    assert str(db.query(StaticAnalysis).one().contract_id) == cid   # the old code stored NULL
    db.close()


def test_gemini_outage_does_not_fail_scan(monkeypatch):
    monkeypatch.setattr(analyze_mod, "run_slither", lambda path, src=None: {"results": {"detectors": []}})
    def boom(f):
        raise RuntimeError("quota")
    monkeypatch.setattr(analyze_mod, "analyze_finding", boom)
    r = client.post("/analyze", files={"file": ("A.sol", SRC, "text/plain")})
    assert r.status_code == 200
    assert r.json()["findings"][0]["analysis"]["available"] is False


def test_rejects_non_solidity():
    r = client.post("/analyze", files={"file": ("a.txt", "x", "text/plain")})
    assert r.status_code == 400
