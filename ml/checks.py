import pandas as pd
from sklearn.metrics import roc_curve

d = pd.read_csv("data/dataset_static.csv")
o = pd.read_csv("runs/static_v1/oof_predictions.csv")
assert len(d) == len(o), "dataset and predictions have different row counts"
d["xgb"] = o["xgb"].values
d["baseline"] = o["baseline"].values
d["flagged"] = d["xgb"] > 0.55

print("=== CHECK 1: which clean contracts does XGBoost flag? ===")
neg = d[d.label == 0]
print(neg.groupby("source").flagged.agg(["sum", "count", "mean"]).round(2))
print("\nFlagged clean files:")
print(neg[neg.flagged][["source", "group", "xgb"]].round(2).to_string())

print("\n=== CHECK 2: baseline at the same false-positive rate as XGBoost ===")
fpr_x = ((d.label == 0) & d.flagged).sum() / (d.label == 0).sum()
fpr, tpr, _ = roc_curve(d.label, d.baseline)
print(f"XGBoost false-positive rate: {fpr_x:.3f}")
print(f"Baseline recall at that same FPR: {tpr[fpr <= fpr_x].max():.3f}")
print(f"XGBoost recall: {((d.label == 1) & d.flagged).sum() / (d.label == 1).sum():.3f}")

print("\n=== CHECK 3 prep: writing shuffled-label dataset ===")
s = d.drop(columns=["xgb", "baseline", "flagged"]).copy()
s["label"] = s["label"].sample(frac=1, random_state=0).values
s.to_csv("data/shuffled.csv", index=False)
print("wrote data/shuffled.csv")