import pandas as pd

from prism_ml.baseline import baseline_score
from prism_ml.schema import FEATURES, NEUTRAL_RUNTIME, band
from prism_ml.synthetic import make_synthetic


def _row(**kw):
    r = {k: 0 for k in FEATURES}
    r.update(NEUTRAL_RUNTIME)
    r.update(kw)
    return pd.DataFrame([r])


def test_twenty_ordered_features():
    assert len(FEATURES) == 20 and FEATURES[0] == "reentrancyPattern" and FEATURES[-1] == "governanceTokenConcentrationDelta"


def test_neutral_vector_scores_zero():
    # the old Java stub added gasAnomalyIndex*3 = +3 here
    assert baseline_score(_row())[0] == 0


def test_baseline_matches_java_hand_calculations():
    assert baseline_score(_row(staticRiskContribution=100))[0] == 60                  # 0.60 * 100
    assert baseline_score(_row(staticRiskContribution=40, flashLoanDetected=1))[0] == 49   # 24 + 25
    assert baseline_score(_row(oracleDeviationPct=50))[0] == 20                       # capped
    assert baseline_score(_row(staticRiskContribution=100, flashLoanDetected=1, oracleDeviationPct=50,
                               gasAnomalyIndex=9, txFrequencyZScore=9))[0] == 100     # capped at 100


def test_bands():
    assert [band(s) for s in (0, 31, 56, 81)] == ["LOW", "MEDIUM", "HIGH", "CRITICAL"]


def test_synthetic_schema():
    df = make_synthetic(20)
    assert list(df.columns[:20]) == FEATURES and df["label"].isin([0, 1]).all()
