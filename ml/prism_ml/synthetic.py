"""SMOKE-TEST DATA ONLY.

Generates a fake dataset with the right schema so build/train/serve can be exercised end to end
before any real data exists. Its metrics say NOTHING about real-world performance: the labels
come from a made-up generative story, not from real exploits. train.py refuses to run on it
unless --allow-synthetic is given and tags the resulting model card accordingly.
Never put numbers from synthetic data in the report.
"""
import numpy as np
import pandas as pd

from .schema import ATTACK_CLASSES, BENIGN, FEATURES, NEUTRAL_RUNTIME

_STATIC_FLAGS = {  # attack class -> static flags it switches on
    "reentrancy": ["reentrancyPattern", "externalCallBeforeStateUpdate"],
    "access_control": ["missingAccessControl", "unprotectedPrivilegedFunction"],
    "integer_overflow": ["integerOverflowRisk"],
    "unchecked_call": ["uncheckedExternalCall"],
}


def _static_row(cls: str, rng: np.random.Generator) -> dict:
    row = {k: 0 for k in FEATURES[:11]}
    crit = high = med = low = 0
    if cls in _STATIC_FLAGS:
        for k in _STATIC_FLAGS[cls]:
            row[k] = 1
        crit = int(rng.integers(0, 3)) if cls == "reentrancy" else 0
        high = int(rng.integers(1, 3))
        med = int(rng.integers(0, 3))
    else:
        # benign or runtime-only: mostly clean code, occasional minor findings (false-positive noise)
        if rng.random() < 0.35:
            med = int(rng.integers(0, 2))
            low = int(rng.integers(0, 3))
        if rng.random() < 0.12:
            high = 1
            row["uncheckedExternalCall"] = int(rng.random() < 0.5)
    if cls == "governance" and rng.random() < 0.4:
        row["usesDelegateCall"] = 1
    row["floatingPragma"] = int(rng.random() < 0.6)
    row["criticalFindingCount"], row["highFindingCount"] = crit, high
    row["staticRiskContribution"] = float(min(40 * crit + 25 * high + 15 * med + 5 * low, 100))
    return row


def _runtime_row(attack_cls: str, rng: np.random.Generator) -> dict:
    r = dict(NEUTRAL_RUNTIME)
    r["gasAnomalyIndex"] = float(np.clip(rng.normal(1.0, 0.25), 0.4, 3.0))
    r["txFrequencyZScore"] = float(rng.normal(0, 1.2))
    r["uniqueCallers"] = int(rng.poisson(3))
    r["largeFundMovementUsd"] = float(abs(rng.normal(0, 8_000)))
    r["liquidityDeltaPct"] = float(rng.normal(0, 3))
    r["oracleDeviationPct"] = float(abs(rng.normal(0, 0.8)))
    r["secondsSinceLastAnomaly"] = int(rng.choice([86_400, int(rng.integers(600, 80_000))]))
    if attack_cls == BENIGN:
        return r
    # every attack looks a bit anomalous; the profile differs by class
    r["secondsSinceLastAnomaly"] = int(rng.integers(0, 120))
    r["gasAnomalyIndex"] = float(rng.uniform(1.8, 5.0))
    r["txFrequencyZScore"] = float(rng.uniform(1.5, 6.0))
    if attack_cls == "reentrancy":
        r["largeFundMovementUsd"] = float(rng.uniform(30_000, 600_000))
        r["uniqueCallers"] = int(rng.integers(1, 3))
    elif attack_cls == "flash_loan":
        r["flashLoanDetected"] = 1
        r["largeFundMovementUsd"] = float(rng.uniform(200_000, 5_000_000))
    elif attack_cls == "oracle_manipulation":
        r["oracleDeviationPct"] = float(rng.uniform(6, 40))
        r["flashLoanDetected"] = int(rng.random() < 0.5)
    elif attack_cls == "governance":
        r["governanceTokenConcentrationDelta"] = float(rng.uniform(10, 45))
        r["uniqueCallers"] = int(rng.integers(5, 25))
    elif attack_cls == "liquidity_manipulation":
        r["liquidityDeltaPct"] = float(rng.choice([-1, 1]) * rng.uniform(25, 70))
        r["largeFundMovementUsd"] = float(rng.uniform(100_000, 2_000_000))
    elif attack_cls in ("access_control", "unchecked_call", "integer_overflow"):
        r["largeFundMovementUsd"] = float(rng.uniform(10_000, 400_000))
    return r


def make_synthetic(n_groups: int = 80, seed: int = 7, label_noise: float = 0.05) -> pd.DataFrame:
    rng = np.random.default_rng(seed)
    rows = []
    for g in range(n_groups):
        is_attack = rng.random() < 0.35
        cls = str(rng.choice(ATTACK_CLASSES)) if is_attack else BENIGN
        static = _static_row(cls, rng)
        n_windows = int(rng.integers(4, 9))
        attack_at = int(rng.integers(1, n_windows)) if is_attack else -1
        for w in range(n_windows):
            attacking = is_attack and w == attack_at
            runtime = _runtime_row(cls if attacking else BENIGN, rng)
            # scan-only rows (neutral runtime) exist too: this is what a fresh scan produces
            if w == 0:
                runtime = dict(NEUTRAL_RUNTIME)
            # label: under attack, or statically exploitable code (static classes) -> 1
            label = int(attacking or (is_attack and cls in _STATIC_FLAGS and w == 0))
            if rng.random() < label_noise:
                label = 1 - label
            if label == 0:
                row_cls = BENIGN
            else:
                row_cls = cls if is_attack else str(rng.choice(ATTACK_CLASSES))  # noisy positive
            rows.append({**static, **runtime, "label": label,
                         "attack_class": row_cls,
                         "group": f"syn-{g:03d}", "source": "synthetic"})
    return pd.DataFrame(rows)[FEATURES + ["label", "attack_class", "group", "source"]]
