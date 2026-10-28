import numpy as np, pandas as pd
from pathlib import Path
from sklearn.metrics import average_precision_score, roc_auc_score
from sklearn.model_selection import StratifiedGroupKFold
from prism_ml.schema import FEATURES
from train import make_model

d = pd.read_csv("data/dataset_static.csv")
o = pd.read_csv("runs/static_v1/oof_predictions.csv")
man = pd.read_csv("data/static_manifest_verified.csv")
fail = Path("data/static_scan_failures.csv")
if fail.exists():
    man = man[~man.path.isin(pd.read_csv(fail).path)].reset_index(drop=True)
assert len(man) == len(d), f"row mismatch: manifest {len(man)} vs dataset {len(d)}"
d["path"] = man.path.values
d["xgb"] = o["xgb"].values

# --- 1. what drives the false positives
det = pd.read_csv("data/pipeline_detections.csv").fillna("")
fp = d[(d.label == 0) & (d.xgb > 0.55)].merge(det[["path", "detectors"]], on="path")
print("=== False positives and the detectors that fired ===")
for _, r in fp.iterrows():
    print(f"{Path(r.path).name:55s} xgb={r.xgb:.2f}  {r.detectors}")

# --- 2. how much does file size alone explain?
def stats(p):
    t = Path(p).read_text(errors="ignore")
    return [np.log1p(len(t)), t.count("\n"), t.count("function "), t.count("contract ")]
S = np.array([stats(p) for p in d.path])
y, g = d.label.values, d.group.values
oof = np.zeros(len(d))
for tr, te in StratifiedGroupKFold(5, shuffle=True, random_state=42).split(S, y, g):
    oof[te] = make_model(y[tr]).fit(S[tr], y[tr]).predict_proba(S[te])[:, 1]
print("\n=== Size-only model (bytes, lines, #functions, #contracts) ===")
print(f"PR-AUC {average_precision_score(y, oof):.3f}   ROC-AUC {roc_auc_score(y, oof):.3f}   (chance: PR 0.547, ROC 0.500)")

# --- 3. does it generalise to a clean source it never saw?
print("\n=== Leave-one-source-out (false-positive rate on the held-out clean source) ===")
X = d[FEATURES].astype(float)
for src in d[d.label == 0].source.unique():
    te = (d.source == src).values
    tr = ~te
    m = make_model(y[tr]).fit(X[tr], y[tr])
    p = m.predict_proba(X[te])[:, 1]
    print(f"{src:36s} held out {te.sum():3d} files -> flagged {(p > 0.55).mean():.0%}")