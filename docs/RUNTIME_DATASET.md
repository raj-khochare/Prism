# Collecting the runtime dataset (flash loan + oracle manipulation)

One command repeats the local replays, labels the time windows and builds `ml/data/dataset_runtime.csv`.
Rows come from the **production code path** (RuntimeMonitorService -> FeatureDumpWriter), not a Python re-implementation.

## Setup (once)
1. In `blockchain-env/`: `npm install` (Hardhat + the contracts in `contracts/sim/`).
2. **Alerts off:** Alerts page -> threshold 100, Telegram and Email unticked -> Save. (Every run would otherwise alert.)
3. Start the backend **with the dump** (a second compose file mounts `ml/data/runtime/`):
   ```powershell
   docker compose -f docker-compose.yml -f docker-compose.dataset.yml up -d --build backend
   docker compose up -d hardhat-node
   ```
4. `pip install -r ml/requirements.txt` (the collector only needs `requests`).

## Run it (about 40 s per run)
```powershell
cd ml
python collect/collect_runtime.py --username "your_username" --password "your_password" --runs 20 --build
```
Per run: fresh deployment -> register under a unique name (`rt_fl_...` / `rt_or_...`) -> 20 benign rounds -> pause -> attack -> pause
-> delete the contract. Console line per run, for example `benign rows: 18  attack rows: 2 (detector fired on 2)`.
- Warnings `!! no dump lines` -> the backend was not started with `docker-compose.dataset.yml`.
- Warnings `!! attack window is empty` -> raise `--settle 10`; check the printed clock offset (should be within ~2 s).
- Aim for `--runs 20` per scenario (~15 flash-loan + oracle positives per 10 runs is thin; 20+ is better).

Outputs: `data/runtime_labels.csv` (windows), `data/runtime/features.jsonl` (raw vectors), `data/dataset_runtime.csv`.

## Combine with the static rows and train
```powershell
copy data\dataset_static.csv data\dataset_all.csv
python build_dataset.py --dump data/runtime/features.jsonl --labels data/runtime_labels.csv --out data/dataset_all.csv --append
python train.py --data data/dataset_all.csv --out runs/all_v2
```
(The size-only baseline is skipped automatically on the combined file because runtime rows have no size columns.)
Restore the normal backend afterwards: `docker compose up -d --force-recreate backend`, and your alert settings.

## What these rows can and cannot show (say this in the report)
- **Labels come from the scenario, features come from the detectors.** Attack rows are exactly the rows where `flashLoanDetected` or
  `oracleDeviationPct` fires, so a model will separate them almost perfectly. That shows the pipeline works end to end; it is **not**
  detection accuracy on real attacks. Never quote runtime-only metrics as such.
- Benign traffic is mild and synthetic (small deposits/swaps). There are no benign-but-unusual events (a whale trade, a legitimate
  flash loan), so false positives on those are untested.
- The monitored contracts are registered without source, so static features are 0 (modelled as "unscanned").
- Two of the four runtime classes are covered (flash loan, oracle). Governance is neutral; liquidity manipulation is not collected.
- What the combined model can still legitimately show: how static and runtime signals combine, and that the static classes keep
  working when runtime features are present. Compare the combined model's static-class recall with `runs/static_v2`.

## Notes
- New backend endpoints used here (Developer only): `PUT /api/runtime/oracle-pools` `{contractAddress, poolAddress}` and
  `DELETE /api/runtime/oracle-pools/{contractAddress}`. They replace the `ORACLE_POOLS` env var + restart for the replays
  (the env var still works). In-memory only: cleared on backend restart. This is a sixth Developer-only write endpoint beyond the original four.
- Calm oracle blocks are now scored silently (no event) for contracts with a pool configured, so benign oracle baselines exist.
