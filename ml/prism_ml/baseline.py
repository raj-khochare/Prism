"""Rule-based baseline. Line-for-line mirror of StubMlScoringClient.java - change both together.
This is the number the XGBoost model has to beat in the evaluation chapter."""
import numpy as np
import pandas as pd


def baseline_points(df: pd.DataFrame) -> pd.DataFrame:
    """Per-term score points for each row (columns are the factor names)."""
    t = pd.DataFrame(index=df.index)
    t["Static risk contribution"] = 0.60 * df["staticRiskContribution"]
    t["Flash loan detected"] = 25.0 * df["flashLoanDetected"].astype(float)
    t["Oracle deviation"] = np.minimum(2.0 * df["oracleDeviationPct"], 20)
    t["Gas anomaly"] = np.minimum(8.0 * np.maximum(df["gasAnomalyIndex"] - 1.0, 0), 15)
    t["Transaction burst"] = np.minimum(3.0 * np.maximum(df["txFrequencyZScore"], 0), 12)
    t["Large fund movement"] = np.minimum(df["largeFundMovementUsd"] / 10_000.0, 15)
    t["Liquidity change"] = np.minimum(0.3 * df["liquidityDeltaPct"].abs(), 10)
    t["Governance concentration change"] = np.minimum(0.5 * df["governanceTokenConcentrationDelta"].abs(), 10)
    return t


def baseline_score(df: pd.DataFrame) -> np.ndarray:
    """0-100 score (rounded like Java's Math.round on the capped sum)."""
    return np.round(np.minimum(baseline_points(df).sum(axis=1), 100)).astype(int).to_numpy()
