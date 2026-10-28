# Static dataset card

Built by `collect/collect_static.py`, checked with `collect/verify_compiles.py` and `collect/pipeline_report.py`.
Use **`static_manifest_verified.csv`** (compiles with the analyzer's own Slither + solc selection).

## Contents (206 files, 182 groups)
| | Files | Source |
|---|---|---|
| Positives (label 1) | 112 | SmartBugs Curated: reentrancy 29, access_control 17, integer_overflow 15, unchecked_call 51 |
| Negatives (label 0) | 94 | flattened from npm: openzeppelin-solidity@1.12.0 (67), @openzeppelin/contracts@4.9.6 (16), solmate@6.2.0 (7), @uniswap/v2-core@1.0.1 (3), canonical-weth@1.4.0 (1) |

Excluded (see `excluded.csv`, `compile_report.csv`): 27 SmartBugs files in categories outside your four static classes
(bad_randomness, denial_of_service, front_running, time_manipulation, short_addresses, other) - they are vulnerable, so they are
NOT used as negatives; 4 files that do not compile (sb_access_control_parity_wallet_bug_1.sol, sb_reentrancy_reentrancy_bonus.sol, sb_reentrancy_reentrancy_cross_function.sol, sb_unchecked_low_level_calls_0x89c1b3807d4c67df034fffb62f3509561218d30b.sol); 1 missing entry file.

## Label rules
- Positive = the contract is statically exploitable in one of the four classes (SmartBugs' own category and line numbers).
- Negative = widely used audited library/protocol code: "no known vulnerability", NOT proven bug-free.
- Out-of-scope vulnerable categories are never labelled benign.
- `group` = near-duplicate cluster of the contract's OWN code (5-token-shingle Jaccard >= 0.8, tiny files never merged), so
  copies never straddle train/test. Old OpenZeppelin 1.x (Solidity 0.4) is included so negatives match SmartBugs' language era.

## What the static pipeline sees (Slither + custom detectors; `STATIC_PIPELINE_REPORT.md`)
Recall: reentrancy 100%, unchecked_call 100%, integer_overflow 93%, access_control 76%. On negatives the same detector families fire
20-38% of the time for reentrancy/access-control/overflow. Separating those false positives is the model's real job.

## Known limitations (state them in the report)
1. SmartBugs files are small, textbook examples; recall on them will not transfer to production contracts.
2. Positives are tiny application contracts, negatives are larger flattened library code: size/style is a confound. Check per-source
   results and a leave-one-source-out run before trusting any number.
3. 206 contracts and all the static rows have neutral runtime features; runtime classes come from the replay scripts.
4. Negatives were not manually audited; some may contain issues Slither also flags (that is the point of measuring FP rate).
5. Contract licences vary (see `license`/`origin` columns). Keep this folder to research use and cite SmartBugs Curated
   (Durieux et al., ICSE 2020) and the npm packages.

## Turn it into feature rows (run on YOUR machine, backend up)
1. **Disable alert delivery first**: Alerts page -> threshold 100, Telegram and Email off, Save. Each scan evaluates risk and
   would otherwise send a Telegram message for every high-risk file.
2. Add `GEMINI_MAX_FINDINGS=0` to `backend-services/static-analyzer/.env` and `docker compose up -d --force-recreate static-analyzer`
   (no Gemini calls for ~200 scans).
3. `cd ml; pip install -r requirements.txt`
4. `python build_dataset.py --static-manifest data/static_manifest_verified.csv --api http://localhost:8080 --username YOU --password PASS --out data/dataset_static.csv`
   (about 20-30 minutes; scanned contracts are deleted again; failures go to `data/static_scan_failures.csv`)
5. `python train.py --data data/dataset_static.csv --out runs/static_v1`
6. Restore your alert settings and remove `GEMINI_MAX_FINDINGS=0`.
