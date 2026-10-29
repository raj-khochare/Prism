import sys, argparse
import numpy as np, pandas as pd
from sklearn.metrics import average_precision_score, roc_auc_score
from sklearn.model_selection import StratifiedGroupKFold
from xgboost import XGBClassifier
from prism_ml.schema import FEATURES
from train import make_logreg, make_model, XGB_PARAMS

ap = argparse.ArgumentParser()
ap.add_argument("--data", default="data/dataset_all.csv")
ap.add_argument("--runtime-source", default="replay-local")
ap.add_argument("--seeds", type=int, default=5)
a = ap.parse_args()

df = pd.read_csv(a.data)
rt = (df.source == a.runtime_source).to_numpy()
y, g = df.label.to_numpy(), df.group.to_numpy()
THR = 0.55

def cv(make, cols, seed):
    X = df[cols].to_numpy(float); out = np.zeros(len(df))
    for tr, te in StratifiedGroupKFold(5, shuffle=True, random_state=seed).split(X, y, g):
        out[te] = make(y[tr]).fit(X[tr], y[tr]).predict_proba(X[te])[:, 1]
    return out

def split_report(p):
    s = ~rt
    return dict(
        static_prauc=average_precision_score(y[s], p[s]),
        static_roc=roc_auc_score(y[s], p[s]),
        static_FPR=(p[s & (y == 0)] > THR).mean(),
        static_recall=(p[s & (y == 1)] > THR).mean(),
        runtime_recall=(p[rt & (y == 1)] > THR).mean() if (rt & (y == 1)).any() else np.nan,
        runtime_FP=(p[rt & (y == 0)] > THR).mean() if (rt & (y == 0)).any() else np.nan)

xgb_nw = lambda yy: XGBClassifier(**XGB_PARAMS)           # no class weighting
variants = {
    "full (as trained)": (make_model, FEATURES),
    "no class weighting": (xgb_nw, FEATURES),
    "drop secondsSinceLastAnomaly": (make_model, [f for f in FEATURES if f != "secondsSinceLastAnomaly"]),
    "drop floatingPragma": (make_model, [f for f in FEATURES if f != "floatingPragma"]),
    "drop both": (make_model, [f for f in FEATURES if f not in ("secondsSinceLastAnomaly", "floatingPragma")]),
}
print("=== Static rows vs runtime rows, with ablations (XGBoost, seed 42) ===")
print(pd.DataFrame({k: split_report(cv(m, c, 42)) for k, (m, c) in variants.items()}).T.round(3).to_string())

print(f"\n=== XGBoost vs logistic regression over {a.seeds} different CV splits ===")
rows = []
for sd in range(a.seeds):
    px, pl = cv(make_model, FEATURES, sd), cv(lambda yy: make_logreg(), FEATURES, sd)
    s = ~rt
    rows.append(dict(seed=sd,
        xgb_all=average_precision_score(y, px), lr_all=average_precision_score(y, pl),
        xgb_static=average_precision_score(y[s], px[s]), lr_static=average_precision_score(y[s], pl[s])))
r = pd.DataFrame(rows)
print(r.round(3).to_string(index=False))
for sub in ("all", "static"):
    d = r[f"xgb_{sub}"] - r[f"lr_{sub}"]
    print(f"PR-AUC {sub}: XGB minus LR = {d.mean():+.3f} +/- {d.std(ddof=1):.3f}  (XGB better in {(d > 0).sum()}/{len(d)} splits)") 