"""The fixed 20-field FeatureVector contract. Order and names MUST match
prism-Backend/.../dto/FeatureVector.java (camelCase = the JSON the backend sends)."""
import json
from pathlib import Path

FEATURES = json.loads((Path(__file__).resolve().parent.parent / "features.json").read_text())
assert len(FEATURES) == 20, "FeatureVector has exactly 20 fields (11 static + 9 behavioural)"

STATIC_FEATURES = FEATURES[:11]
RUNTIME_FEATURES = FEATURES[11:]

# Neutral runtime values the backend sends when nothing has been observed (RuntimeSignals.NONE).
NEUTRAL_RUNTIME = {
    "flashLoanDetected": 0, "largeFundMovementUsd": 0.0, "oracleDeviationPct": 0.0,
    "gasAnomalyIndex": 1.0, "txFrequencyZScore": 0.0, "liquidityDeltaPct": 0.0,
    "uniqueCallers": 0, "secondsSinceLastAnomaly": 86_400, "governanceTokenConcentrationDelta": 0.0,
}

ATTACK_CLASSES = [
    "reentrancy", "access_control", "integer_overflow", "unchecked_call",        # static (4)
    "flash_loan", "oracle_manipulation", "governance", "liquidity_manipulation",  # runtime (4)
]
BENIGN = "benign"

# Non-feature columns every dataset row carries.
META_COLUMNS = ["label", "attack_class", "group", "source"]


def band(score: int) -> str:
    """Same thresholds as StubMlScoringClient / RiskPresentationService."""
    return "CRITICAL" if score > 80 else "HIGH" if score > 55 else "MEDIUM" if score > 30 else "LOW"
