"""PRISM ML scoring service (port 8002). Stateless: loads model.json + features.json once.

POST /score  body: the 20-field FeatureVector as camelCase JSON (what the Spring backend sends)
             -> {score, band, confidence, factors:[{featureName, contribution}]}
             `contribution` is in score points / 100 (0.12 == +12 points), additive relative to the
             training base rate, so the Risk page's  round(contribution * 100)  reads as points.
GET  /info   model name / version / description (shown on the Risk Assessment page)
GET  /health 200 only when a model is loaded (so Docker marks the container unhealthy otherwise)

If the model files are missing the backend simply keeps using its rule-based baseline.
"""
import json
import math
import os
from pathlib import Path
from typing import Any

from contextlib import asynccontextmanager

import numpy as np
from fastapi import Body, FastAPI, HTTPException

MODEL_DIR = Path(os.getenv("MODEL_DIR", Path(__file__).resolve().parent.parent / "model"))
TOP_K = int(os.getenv("TOP_K_FACTORS", "6"))

_state: dict[str, Any] = {"model": None, "explainer": None, "features": None, "card": {}}


def _load() -> None:
    from xgboost import XGBClassifier
    import shap
    model_path, feat_path = MODEL_DIR / "model.json", MODEL_DIR / "features.json"
    if not model_path.exists() or not feat_path.exists():
        return
    model = XGBClassifier()
    model.load_model(model_path)
    card_path = MODEL_DIR / "model_card.json"
    _state.update(model=model, explainer=shap.TreeExplainer(model), features=json.loads(feat_path.read_text()),
                  card=json.loads(card_path.read_text()) if card_path.exists() else {})


@asynccontextmanager
async def lifespan(_app: FastAPI):
    _load()
    yield


app = FastAPI(title="PRISM ML service", version="1.0.0", lifespan=lifespan)


def _band(score: int) -> str:
    return "CRITICAL" if score > 80 else "HIGH" if score > 55 else "MEDIUM" if score > 30 else "LOW"


def _sigmoid(x: float) -> float:
    return 1.0 / (1.0 + math.exp(-x))


@app.get("/health")
def health():
    if _state["model"] is None:
        raise HTTPException(status_code=503, detail="model not loaded")
    return {"status": "healthy", "model_loaded": True}


@app.get("/info")
def info():
    card = _state["card"]
    return {"name": card.get("name", "XGBoost + SHAP"), "version": card.get("version", "unversioned"),
            "description": card.get("description", "")}


@app.post("/score")
def score(body: dict[str, Any] = Body(...)):
    if _state["model"] is None:
        raise HTTPException(status_code=503, detail="model not loaded")
    feats = _state["features"]
    missing = [f for f in feats if f not in body]
    if missing:
        raise HTTPException(status_code=422, detail=f"missing features: {missing}")
    try:
        x = np.array([[float(body[f]) for f in feats]])  # bool -> 0/1 works with float()
    except (TypeError, ValueError):
        raise HTTPException(status_code=422, detail="all 20 features must be numbers or booleans")

    p = float(_state["model"].predict_proba(x)[0, 1])
    explainer = _state["explainer"]
    sv = np.asarray(explainer.shap_values(x))[0]
    p0 = _sigmoid(float(np.ravel(explainer.expected_value)[0]))
    total = float(sv.sum())
    # SHAP is additive in log-odds; rescale so contributions add up (in probability) to p - p0.
    scale = (p - p0) / total if abs(total) > 1e-9 else 0.0
    contrib = sv * scale
    order = np.argsort(-np.abs(contrib))[:TOP_K]
    factors = [{"featureName": feats[i], "contribution": round(float(contrib[i]), 4)}
               for i in order if abs(contrib[i]) >= 0.005]
    s = int(round(p * 100))
    return {"score": s, "band": _band(s), "confidence": round(max(p, 1 - p), 3), "factors": factors}
