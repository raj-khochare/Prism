# Building the ML model (XGBoost + SHAP) - step by step

Everything below exists as code in `ml/` and `ml-service/`; the pipeline was exercised end to end on
**synthetic** data only (metrics from it are meaningless). You supply the real data.

## What the model is
Binary classifier over the fixed 20-field `FeatureVector` (11 static + 9 runtime). score = round(100 * P(label=1)).
**Label definition (write this in your report):** 1 = "contract is statically exploitable, or is being exploited in
this time window"; 0 = benign. Runtime-only classes (flash loan, oracle, governance, liquidity) are 1 only inside the
attack window; their pre-attack rows are 0.

## Steps
1. **Rotate secrets, get the stack running** (`docker compose up --build`, smoke test in `NEXT_PHASES.md` Phase 0).
2. **Runtime features:** flash loan and oracle deviation are done (`docs/PHASE1_RUNBOOK.md`); governance concentration is still neutral. Without them flash-loan/oracle/governance rows
   are indistinguishable from benign ones and the model cannot learn them.
3. **Static data is collected** (`ml/data/README.md`; v2 adds SWC size-matched negatives and a refined overflow detector). Still to collect: runtime rows and real incidents.
3b. **(Optional) more incidents** (DeFiHackLabs + De.Fi REKT): per incident note protocol, attack class (one of the 8), source
   (if available), exploit block range. Give every protocol/incident a `group` id.
4. **Collect negatives** at ~10:1: verified, popular contracts (static rows) and normal blocks of replayed benign
   contracts (runtime rows). Include contracts with Slither noise so false positives are measured honestly.
5. **Static rows**: write `data/static_manifest.csv` (`path,label,attack_class,group,source`) and run
   `python ml/build_dataset.py --static-manifest data/static_manifest.csv --api http://localhost:8080 --token <jwt>`.
   Features come from the backend's own code (`GET /api/contracts/{id}/features`), not a Python copy.
6. **Runtime rows** (automated: `docs/RUNTIME_DATASET.md`; the manual route below still works): start the backend with `PRISM_FEATURE_DUMP_PATH=/tmp/features.jsonl`, register the contract,
   run a Hardhat replay (benign traffic, then the attack). Write `data/labels.csv`
   (`contract,start,end,label,attack_class,group,source`, UTC ISO times) covering the attack window as 1 and the
   rest as 0, then `python ml/build_dataset.py --dump /tmp/features.jsonl --labels data/labels.csv --append`.
   Unlabelled lines are dropped, never guessed.
7. **Check the dataset**: `data/dataset.meta.json` (rows, groups, per-class counts). Aim for a few hundred rows,
   >= 10 groups, and several positives per class; say plainly which classes are thin.
8. **Train + evaluate**: `python ml/train.py --data data/dataset.csv --out ml/runs/v1 --export ml-service/model`.
   It uses stratified *grouped* CV (a protocol never sits in both train and test), compares to the rule-based
   baseline, and writes `report.md` (PR-AUC with group-bootstrap CI, precision/recall/F1/FPR at score > 55, per-class
   recall, confusion matrices, SHAP importance). Report these numbers as they come out, weak classes included.
9. **Sanity checks**: top SHAP features should make security sense (reentrancy flag, fund movement, flash loan); if
   `secondsSinceLastAnomaly` dominates, suspect leakage from how windows were labelled. Also run it on 10-20 verified
   contracts and report the false-positive rate.
10. **Serve**: `docker compose --profile ml up --build`; in `prism-Backend/.env` set `ML_ENABLED=true` and
    `ML_SERVICE_URL=http://ml-service:8002`. The Risk page's Model card should now show XGBoost and SHAP factors.
    If the service is down the backend falls back to the baseline automatically.
11. **Tests**: `cd ml && pytest`, `cd ml-service && pytest`, `./gradlew test`.

## Honesty notes for the panel
- Small, replay-heavy data: say so; CIs are wide. Forked-chain replays are not real incidents.
- `confidence` = max(p, 1-p), not a calibrated probability, unless you add calibration.
- SHAP contributions are rescaled to score points relative to the training base rate (additive, sum = p - base rate).
- The baseline is the anchor: if XGBoost does not beat it on a class, report that.
- Class weighting is OFF by default. On the combined static+runtime file it inflated false positives on clean static code from 12% to 29%
  with no ranking gain (diagnose_all ablation). The score is a dataset-relative risk score, not a calibrated probability: its meaning depends on
  the static/runtime row mix (positives are 53% of static rows but 18% of the combined file). Set alert thresholds from a false-positive target.
- Ablations showed `secondsSinceLastAnomaly` and `floatingPragma` are NOT shortcuts (dropping either changes nothing) even though SHAP ranks them high.
- XGBoost vs logistic regression: tied on all rows; XGBoost ahead by about +0.02 PR-AUC on static rows over 5 CV re-splits (same data, so uncertainty is understated).
