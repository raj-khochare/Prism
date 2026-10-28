"""Trains a tiny throw-away model on synthetic rows so the test needs no committed artefacts."""
import json
import os
import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from xgboost import XGBClassifier

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "ml"))
from prism_ml.schema import FEATURES, NEUTRAL_RUNTIME  # noqa: E402
from prism_ml.synthetic import make_synthetic  # noqa: E402


@pytest.fixture(scope="module")
def client(tmp_path_factory):
    d = tmp_path_factory.mktemp("model")
    df = make_synthetic(60)
    m = XGBClassifier(n_estimators=40, max_depth=3, random_state=1).fit(df[FEATURES].astype(float), df["label"])
    m.save_model(d / "model.json")
    (d / "features.json").write_text(json.dumps(FEATURES))
    (d / "model_card.json").write_text(json.dumps({"name": "test-model", "version": "t1", "description": "d"}))
    os.environ["MODEL_DIR"] = str(d)
    sys.path.insert(0, str(ROOT / "ml-service"))
    import importlib
    import app.main as main
    importlib.reload(main)
    with TestClient(main.app) as c:
        yield c


def _vec(**kw):
    v = {k: 0 for k in FEATURES}
    v.update(NEUTRAL_RUNTIME)
    v.update(kw)
    return v


def test_health_and_info(client):
    assert client.get("/health").status_code == 200
    assert client.get("/info").json()["name"] == "test-model"


def test_score_shape_matches_java_mlscoreresult(client):
    r = client.post("/score", json=_vec(reentrancyPattern=True, staticRiskContribution=100, criticalFindingCount=2))
    assert r.status_code == 200
    b = r.json()
    assert set(b) == {"score", "band", "confidence", "factors"}
    assert 0 <= b["score"] <= 100 and b["band"] in {"LOW", "MEDIUM", "HIGH", "CRITICAL"}
    assert all(set(f) == {"featureName", "contribution"} for f in b["factors"])
    assert all(f["featureName"] in FEATURES for f in b["factors"])


def test_attack_scores_higher_than_neutral(client):
    calm = client.post("/score", json=_vec()).json()["score"]
    hot = client.post("/score", json=_vec(flashLoanDetected=True, largeFundMovementUsd=2_000_000, gasAnomalyIndex=4,
                                          txFrequencyZScore=5, secondsSinceLastAnomaly=5)).json()["score"]
    assert hot > calm


def test_missing_feature_is_422(client):
    v = _vec(); v.pop("uniqueCallers")
    assert client.post("/score", json=v).status_code == 422
