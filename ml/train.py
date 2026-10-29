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
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import roc_curve
from sklearn.model_selection import StratifiedGroupKFold
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler
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


SIZE_COLS = ["meta_size_log", "meta_lines", "meta_functions"]


def make_logreg():
    return make_pipeline(StandardScaler(), LogisticRegression(C=1.0, class_weight="balanced", max_iter=2000))


def oof_predict(factory, X, y, groups, folds, seed=42):
    out = np.zeros(len(y))
    for tr, te in StratifiedGroupKFold(n_splits=folds, shuffle=True, random_state=seed).split(X, y, groups):
        out[te] = factory(y[tr]).fit(X[tr], y[tr]).predict_proba(X[te])[:, 1]
    return out


def recall_at_fpr(y, p, fpr_target):
    fpr, tpr, _ = roc_curve(y, p)
    ok = tpr[fpr <= fpr_target]
    return float(ok.max()) if len(ok) else 0.0


def make_model(y, weighted: bool = False) -> XGBClassifier:
    """Class weighting is OFF by default: on the combined static+runtime file it pushed scores up (positives are
    only ~18% of rows), tripling false positives on clean static code (12% -> 29%) with no gain in ranking quality
    (PR-AUC unchanged). Pass --class-weight to train.py to re-enable it."""
    if not weighted:
        return XGBClassifier(**XGB_PARAMS)
    pos = max(int(y.sum()), 1)
    return XGBClassifier(**XGB_PARAMS, scale_pos_weight=(len(y) - pos) / pos)


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--data", default="data/dataset.csv")
    ap.add_argument("--out", default="runs/latest")
    ap.add_argument("--export", help="directory to copy model.json/features.json/model_card.json into")
    ap.add_argument("--folds", type=int, default=5)
    ap.add_argument("--allow-synthetic", action="store_true")
    ap.add_argument("--class-weight", action="store_true", help="re-enable scale_pos_weight (off by default, see make_model)")
    ap.add_argument("--runtime-source", default="replay-local", help="source name of the runtime (replay) rows")
    ap.add_argument("--repeats", type=int, default=5, help="CV re-splits for the paired XGBoost vs logistic-regression test")
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
        m = make_model(y[tr], a.class_weight).fit(X.iloc[tr], y[tr])
        oof[te] = m.predict_proba(X.iloc[te])[:, 1]
    base = baseline_score(df) / 100.0
    Xv = X.to_numpy()
    lr_oof = oof_predict(lambda yy: make_logreg(), Xv, y, groups, folds)  # trained baseline on the SAME 20 features

    res = {"xgboost": metrics(y, oof, classes), "baseline": metrics(y, base, classes),
           "logreg": metrics(y, lr_oof, classes)}
    preds = {"xgboost": oof, "baseline": base, "logreg": lr_oof}
    # size-only model: tells you how much of the score is just "big file vs small file"
    size_ok = all(c in df.columns for c in SIZE_COLS) and df[SIZE_COLS].notna().all().all()
    if size_ok:
        size_oof = oof_predict(lambda yy: make_model(yy, a.class_weight), df[SIZE_COLS].to_numpy(float), y, groups, folds)
        res["size_only"] = metrics(y, size_oof, classes)
        preds["size_only"] = size_oof
    for k, v in preds.items():
        res[k]["pr_auc_ci95_group_bootstrap"] = group_bootstrap_ci(y, v, groups)
    # recall of every model at the false-positive rate XGBoost has at the operating point
    xgb_fpr = res["xgboost"]["false_positive_rate"]
    for k, v in preds.items():
        res[k]["recall_at_xgb_fpr"] = recall_at_fpr(y, v, xgb_fpr)

    # false positives by clean source, and leave-one-source-out
    neg_src = df.loc[y == 0, "source"]
    fp_by_source = {src: {"flagged": int((oof[(y == 0) & (df["source"] == src).to_numpy()] > THRESHOLD).sum()),
                          "files": int(n)} for src, n in neg_src.value_counts().items()}
    loso = {}
    for src, n in neg_src.value_counts().items():
        if n < 5:
            continue
        te = (df["source"] == src).to_numpy() & (y == 0)
        tr = ~((df["source"] == src).to_numpy())
        mdl = make_model(y[tr], a.class_weight).fit(Xv[tr], y[tr])
        loso[src] = {"files": int(te.sum()), "flagged": int((mdl.predict_proba(Xv[te])[:, 1] > THRESHOLD).sum()),
                     "clean_files_left_in_training": int(((y[tr] == 0)).sum())}
    res["false_positives_by_source"] = fp_by_source
    res["leave_one_clean_source_out"] = loso

    # static rows and runtime (replay) rows reported separately: a pooled number is dominated by whichever is larger
    rt = (df["source"] == a.runtime_source).to_numpy()
    split = {}
    if rt.any() and (~rt).any():
        st = ~rt
        pos_s, neg_s, pos_r, neg_r = st & (y == 1), st & (y == 0), rt & (y == 1), rt & (y == 0)
        split = {"static_rows": int(st.sum()), "runtime_rows": int(rt.sum()),
                 "static_pr_auc": float(average_precision_score(y[st], oof[st])),
                 "static_roc_auc": float(roc_auc_score(y[st], oof[st])) if len(set(y[st])) > 1 else None,
                 "static_recall": float((oof[pos_s] > THRESHOLD).mean()) if pos_s.any() else None,
                 "static_fpr": float((oof[neg_s] > THRESHOLD).mean()) if neg_s.any() else None,
                 "runtime_positives": int(pos_r.sum()),
                 "runtime_recall": float((oof[pos_r] > THRESHOLD).mean()) if pos_r.any() else None,
                 "runtime_false_positives": f"{int((oof[neg_r] > THRESHOLD).sum())}/{int(neg_r.sum())}"}
    res["static_vs_runtime"] = split

    # paired comparison over several CV re-splits (same data re-partitioned: the spread UNDERSTATES uncertainty)
    paired = []
    for sd in range(a.repeats):
        px = oof_predict(lambda yy: make_model(yy, a.class_weight), Xv, y, groups, folds, seed=sd)
        pl = oof_predict(lambda yy: make_logreg(), Xv, y, groups, folds, seed=sd)
        row = {"seed": sd, "xgb_all": float(average_precision_score(y, px)), "lr_all": float(average_precision_score(y, pl))}
        if rt.any() and (~rt).any():
            row.update(xgb_static=float(average_precision_score(y[~rt], px[~rt])),
                       lr_static=float(average_precision_score(y[~rt], pl[~rt])))
        paired.append(row)
    res["paired_xgb_vs_logreg"] = paired

    out = Path(a.out); out.mkdir(parents=True, exist_ok=True)
    pd.DataFrame({"group": groups, "label": y, "attack_class": classes, "source": df["source"].to_numpy(),
                  "xgb": oof, "baseline": base, "logreg": lr_oof}).to_csv(out / "oof_predictions.csv", index=False)

    # final model on all data + SHAP importance
    final = make_model(y, a.class_weight).fit(X, y)
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
    names = {"baseline": "Rule-based baseline", "logreg": "Logistic regression (20 features)",
             "size_only": "Size-only (bytes, lines, #functions)", "xgboost": "XGBoost"}
    lines = ["# Baseline vs XGBoost", "",
             ("> **SYNTHETIC DATA - pipeline smoke test only. Do not quote these numbers.**\n" if synthetic else ""),
             f"{len(df)} rows, {int(y.sum())} positives, {len(np.unique(groups))} groups, {folds}-fold grouped CV, "
             f"operating point: score > {int(THRESHOLD*100)}.", "",
             "| Model | PR-AUC (95% group-bootstrap CI) | ROC-AUC | Precision | Recall | F1 | FPR | Brier |",
             "|---|---|---|---|---|---|---|---|"]
    for k in ("baseline", "logreg", "size_only", "xgboost"):
        if k in res:
            lines.append(row(names[k], res[k]))
    lines += ["", "Chance PR-AUC = positive rate = %.3f. Brier scores are not calibration claims (class weighting, and the "
              "baseline score is not a probability)." % (y.mean()), "",
              f"## Recall at XGBoost's false-positive rate ({xgb_fpr:.3f})", "",
              "The fair way to compare models: same false-alarm rate, how many vulnerable contracts does each catch?", "",
              "| Model | Recall at that FPR |", "|---|---|"]
    for k in ("baseline", "logreg", "size_only", "xgboost"):
        if k in res:
            lines.append(f"| {names[k]} | {res[k]['recall_at_xgb_fpr']:.3f} |")
    lines += ["", "## Recall per attack class (positives only, at score > 55)", "",
              "| Class | Positives | Baseline recall | XGBoost recall |", "|---|---|---|---|"]
    for c, v in res["xgboost"]["per_class_recall"].items():
        b = res["baseline"]["per_class_recall"].get(c, {"recall": float("nan")})
        lines.append(f"| {c} | {v['positives']} | {b['recall']:.2f} | {v['recall']:.2f} |")
    lines += ["", "## Clean files flagged, by source (cross-validated)", "", "| Source | Flagged | Files |", "|---|---|---|"]
    for src, v in fp_by_source.items():
        lines.append(f"| {src} | {v['flagged']} | {v['files']} |")
    lines += ["", "## Leave-one-clean-source-out", "",
              "Train without any file from the source, then score its clean files. Compare with the table above: a big gap means "
              "the model learned the source's style, not vulnerability. Note the training set also loses that source's clean files.", "",
              "| Held-out source | Clean files | Flagged | Clean files left in training |", "|---|---|---|---|"]
    for src, v in loso.items():
        lines.append(f"| {src} | {v['files']} | {v['flagged']} ({v['flagged'] / v['files']:.0%}) | {v['clean_files_left_in_training']} |")
    if split:
        lines += ["", "## Static rows vs runtime rows (same model, evaluated separately)", "",
                  f"{split['static_rows']} static rows, {split['runtime_rows']} runtime rows ('{a.runtime_source}').", "",
                  "| | Value |", "|---|---|",
                  f"| Static PR-AUC / ROC-AUC | {split['static_pr_auc']:.3f} / {split['static_roc_auc']:.3f} |",
                  f"| Static recall / false-positive rate at score > 55 | {split['static_recall']:.3f} / {split['static_fpr']:.3f} |",
                  f"| Runtime positives / recall | {split['runtime_positives']} / {split['runtime_recall']} |",
                  f"| Runtime false positives | {split['runtime_false_positives']} |", "",
                  "Runtime labels come from the replay scenario and the runtime features are the detectors' own outputs, so "
                  "near-perfect runtime numbers show the pipeline reacts to those signals; they are not detection accuracy on real attacks."]
    if paired:
        d_all = np.array([r["xgb_all"] - r["lr_all"] for r in paired])
        lines += ["", f"## XGBoost vs logistic regression over {len(paired)} CV re-splits", "",
                  "Re-partitions of the SAME data, so the spread understates real uncertainty.", "",
                  f"- All rows, PR-AUC XGBoost minus LR: {d_all.mean():+.3f} +/- {d_all.std(ddof=1) if len(d_all) > 1 else 0:.3f} "
                  f"(XGBoost better in {(d_all > 0).sum()}/{len(d_all)})"]
        if "xgb_static" in paired[0]:
            d_st = np.array([r["xgb_static"] - r["lr_static"] for r in paired])
            lines.append(f"- Static rows, PR-AUC XGBoost minus LR: {d_st.mean():+.3f} +/- {d_st.std(ddof=1) if len(d_st) > 1 else 0:.3f} "
                         f"(XGBoost better in {(d_st > 0).sum()}/{len(d_st)})")
    lines += ["", "## Confusion matrices (rows pooled over CV folds)", "",
              f"- XGBoost: {res['xgboost']['confusion_matrix']}", f"- Baseline: {res['baseline']['confusion_matrix']}", "",
              "## Top SHAP features", "",
              "SHAP importance is not necessity: correlated features share credit, and removing a top feature may change nothing "
              "(ablations on this data showed that for secondsSinceLastAnomaly and floatingPragma).", ""] + [f"- {k}: {v}" for k, v in list(imp.items())[:8]]
    (out / "report.md").write_text("\n".join(lines))
    print("\n".join(lines))

    if a.export:
        dst = Path(a.export); dst.mkdir(parents=True, exist_ok=True)
        for f in ("model.json", "features.json", "model_card.json"):
            shutil.copy(out / f, dst / f)
        print(f"exported to {dst}")


if __name__ == "__main__":
    main()
