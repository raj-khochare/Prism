#!/usr/bin/env python
"""Rule-based baseline vs XGBoost on the PRISM dataset, evaluated with GROUPED cross-validation
(a protocol/incident never appears in both train and test), then a final fit + SHAP summary.

  python train.py --data data/dataset.csv --out runs/v1 --export ../ml-service/model

Outputs in --out: report.md, metrics.json, oof_predictions.csv, model.json, features.json,
model_card.json, shap_importance.json (+ .png). --export copies the three files the service needs.
"""
import argparse
import hashlib
import json
import shutil
import sys
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.metrics import (average_precision_score, brier_score_loss, confusion_matrix,
                             roc_auc_score)
from sklearn.model_selection import StratifiedGroupKFold
from xgboost import XGBClassifier

from prism_ml.baseline import baseline_score
from prism_ml.schema import FEATURES

THRESHOLD = 0.55  # score > 55 is the HIGH band in the product; this is the operating point we report
XGB_PARAMS = dict(n_estimators=300, max_depth=3, learning_rate=0.05, subsample=0.8,
                  colsample_bytree=0.8, min_child_weight=2, reg_lambda=2.0,
                  tree_method="hist", eval_metric="aucpr", random_state=42, n_jobs=1)


def metrics(y, p, classes, thr=THRESHOLD) -> dict:
    pred = (p > thr).astype(int)
    tn, fp, fn, tp = confusion_matrix(y, pred, labels=[0, 1]).ravel()
    prec = tp / (tp + fp) if tp + fp else 0.0
    rec = tp / (tp + fn) if tp + fn else 0.0
    f1 = 2 * prec * rec / (prec + rec) if prec + rec else 0.0
    out = {"pr_auc": float(average_precision_score(y, p)),
           "roc_auc": float(roc_auc_score(y, p)) if len(set(y)) > 1 else None,
           "brier": float(brier_score_loss(y, np.clip(p, 0, 1))),
           "threshold": thr, "precision": prec, "recall": rec, "f1": f1,
           "false_positive_rate": fp / (fp + tn) if fp + tn else 0.0,
           "confusion_matrix": {"tn": int(tn), "fp": int(fp), "fn": int(fn), "tp": int(tp)}}
    per = {}
    for c in sorted(set(classes[y == 1])):
        m = (y == 1) & (classes == c)
        per[c] = {"positives": int(m.sum()), "recall": float((p[m] > thr).mean())}
    out["per_class_recall"] = per
    return out


def group_bootstrap_ci(y, p, groups, n=300, seed=0):
    rng = np.random.default_rng(seed)
    ug = np.unique(groups)
    idx_by = {g: np.where(groups == g)[0] for g in ug}
    vals = []
    for _ in range(n):
        pick = rng.choice(ug, size=len(ug), replace=True)
        idx = np.concatenate([idx_by[g] for g in pick])
        if len(set(y[idx])) > 1:
            vals.append(average_precision_score(y[idx], p[idx]))
    return [float(np.percentile(vals, 2.5)), float(np.percentile(vals, 97.5))] if vals else None


def make_model(y) -> XGBClassifier:
    pos = max(int(y.sum()), 1)
    return XGBClassifier(**XGB_PARAMS, scale_pos_weight=(len(y) - pos) / pos)


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--data", default="data/dataset.csv")
    ap.add_argument("--out", default="runs/latest")
    ap.add_argument("--export", help="directory to copy model.json/features.json/model_card.json into")
    ap.add_argument("--folds", type=int, default=5)
    ap.add_argument("--allow-synthetic", action="store_true")
    a = ap.parse_args()

    df = pd.read_csv(a.data)
    synthetic = bool((df["source"] == "synthetic").any())
    if synthetic and not a.allow_synthetic:
        sys.exit("Dataset contains synthetic rows. Re-run with --allow-synthetic ONLY to smoke-test the "
                 "pipeline; never report those numbers.")
    X, y = df[FEATURES].astype(float), df["label"].to_numpy()
    groups, classes = df["group"].to_numpy(), df["attack_class"].to_numpy()
    folds = min(a.folds, len(np.unique(groups)))

    oof = np.zeros(len(df))
    for tr, te in StratifiedGroupKFold(n_splits=folds, shuffle=True, random_state=42).split(X, y, groups):
        m = make_model(y[tr]).fit(X.iloc[tr], y[tr])
        oof[te] = m.predict_proba(X.iloc[te])[:, 1]
    base = baseline_score(df) / 100.0

    res = {"xgboost": metrics(y, oof, classes), "baseline": metrics(y, base, classes)}
    res["xgboost"]["pr_auc_ci95_group_bootstrap"] = group_bootstrap_ci(y, oof, groups)
    res["baseline"]["pr_auc_ci95_group_bootstrap"] = group_bootstrap_ci(y, base, groups)

    out = Path(a.out); out.mkdir(parents=True, exist_ok=True)
    pd.DataFrame({"group": groups, "label": y, "attack_class": classes, "xgb": oof, "baseline": base}) \
        .to_csv(out / "oof_predictions.csv", index=False)

    # final model on all data + SHAP importance
    final = make_model(y).fit(X, y)
    final.save_model(out / "model.json")
    (out / "features.json").write_text(json.dumps(FEATURES))
    import shap
    sv = shap.TreeExplainer(final).shap_values(X)
    imp = dict(sorted(zip(FEATURES, np.abs(sv).mean(axis=0).round(5).tolist()), key=lambda t: -t[1]))
    (out / "shap_importance.json").write_text(json.dumps(imp, indent=2))
    try:
        import matplotlib; matplotlib.use("Agg")
        import matplotlib.pyplot as plt
        top = list(imp.items())[:12][::-1]
        plt.figure(figsize=(7, 4.5)); plt.barh([k for k, _ in top], [v for _, v in top])
        plt.xlabel("mean |SHAP| (log-odds)"); plt.tight_layout(); plt.savefig(out / "shap_importance.png", dpi=150)
    except Exception as e:  # plotting must never fail a training run
        print("plot skipped:", e)

    data_hash = hashlib.sha256(Path(a.data).read_bytes()).hexdigest()
    card = {"name": "XGBoost + SHAP" + (" (SYNTHETIC - NOT FOR REPORTING)" if synthetic else ""),
            "version": "xgb-" + datetime.now(timezone.utc).strftime("%Y%m%d-%H%M"),
            "description": ("Gradient-boosted trees over the 20 FeatureVector fields; contributions are SHAP "
                            "attributions rescaled to score points relative to the training base rate."),
            "trained_on": "synthetic smoke-test data" if synthetic else "real dataset",
            "rows": int(len(df)), "positives": int(y.sum()), "groups": int(len(np.unique(groups))),
            "cv_folds": folds, "data_sha256": data_hash, "threshold": THRESHOLD,
            "trained_at": datetime.now(timezone.utc).isoformat()}
    (out / "model_card.json").write_text(json.dumps(card, indent=2))
    (out / "metrics.json").write_text(json.dumps(res, indent=2))

    def row(name, r):
        ci = r["pr_auc_ci95_group_bootstrap"]
        return (f"| {name} | {r['pr_auc']:.3f} ({ci[0]:.2f}-{ci[1]:.2f}) | {r['roc_auc']:.3f} | {r['precision']:.3f} | "
                f"{r['recall']:.3f} | {r['f1']:.3f} | {r['false_positive_rate']:.3f} | {r['brier']:.3f} |") if ci and r["roc_auc"] is not None \
            else f"| {name} | {r['pr_auc']:.3f} | - | {r['precision']:.3f} | {r['recall']:.3f} | {r['f1']:.3f} | {r['false_positive_rate']:.3f} | {r['brier']:.3f} |"
    lines = ["# Baseline vs XGBoost", "",
             ("> **SYNTHETIC DATA - pipeline smoke test only. Do not quote these numbers.**\n" if synthetic else ""),
             f"{len(df)} rows, {int(y.sum())} positives, {len(np.unique(groups))} groups, {folds}-fold grouped CV, "
             f"operating point: score > {int(THRESHOLD*100)}.", "",
             "| Model | PR-AUC (95% group-bootstrap CI) | ROC-AUC | Precision | Recall | F1 | FPR | Brier |",
             "|---|---|---|---|---|---|---|---|", row("Rule-based baseline", res["baseline"]),
             row("XGBoost", res["xgboost"]), "", "## Recall per attack class (positives only)", "",
             "| Class | Positives | Baseline recall | XGBoost recall |", "|---|---|---|---|"]
    for c, v in res["xgboost"]["per_class_recall"].items():
        b = res["baseline"]["per_class_recall"].get(c, {"recall": float("nan")})
        lines.append(f"| {c} | {v['positives']} | {b['recall']:.2f} | {v['recall']:.2f} |")
    lines += ["", "## Confusion matrices (rows pooled over CV folds)", "",
              f"- XGBoost: {res['xgboost']['confusion_matrix']}", f"- Baseline: {res['baseline']['confusion_matrix']}", "",
              "## Top SHAP features", ""] + [f"- {k}: {v}" for k, v in list(imp.items())[:8]]
    (out / "report.md").write_text("\n".join(lines))
    print("\n".join(lines))

    if a.export:
        dst = Path(a.export); dst.mkdir(parents=True, exist_ok=True)
        for f in ("model.json", "features.json", "model_card.json"):
            shutil.copy(out / f, dst / f)
        print(f"exported to {dst}")


if __name__ == "__main__":
    main()
