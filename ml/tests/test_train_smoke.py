import subprocess
import sys
from pathlib import Path

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from prism_ml.synthetic import make_synthetic  # noqa: E402


def test_train_writes_all_report_sections(tmp_path):
    df = make_synthetic(60)
    rng = np.random.default_rng(0)
    df["meta_size_log"] = rng.normal(7, 1, len(df))
    df["meta_lines"] = rng.integers(20, 400, len(df))
    df["meta_functions"] = rng.integers(1, 30, len(df))
    # two "clean sources" so per-source and leave-one-source-out sections have content
    clean = df["label"] == 0
    df.loc[clean, "source"] = np.where(rng.random(clean.sum()) < 0.5, "synthetic", "synthetic-b")
    data = tmp_path / "d.csv"
    df.to_csv(data, index=False)
    out = tmp_path / "run"
    r = subprocess.run([sys.executable, str(ROOT / "train.py"), "--data", str(data), "--out", str(out),
                        "--allow-synthetic", "--runtime-source", "synthetic-b", "--repeats", "2"],
                       capture_output=True, text=True, cwd=ROOT)
    assert r.returncode == 0, r.stderr[-800:]
    rep = (out / "report.md").read_text()
    for section in ("Logistic regression", "Size-only", "Recall at XGBoost's false-positive rate",
                    "Clean files flagged, by source", "Leave-one-clean-source-out", "SYNTHETIC",
                    "Static rows vs runtime rows", "CV re-splits"):
        assert section in rep, section
    assert (out / "model.json").exists() and (out / "oof_predictions.csv").exists()
