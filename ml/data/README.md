# Static dataset card (v2)

Built by `collect/collect_static.py`; checked by `collect/verify_compiles.py` and `collect/pipeline_report.py`.
Use **`static_manifest_verified.csv`** (241 files that compile with the analyzer's own Slither + solc selection; 211 groups).

## Contents
| | Files | Source |
|---|---|---|
| Positives (label 1) | 128 | SmartBugs Curated + SWC Registry. reentrancy 31, access_control 28, integer_overflow 17, unchecked_call 52 |
| Negatives (label 0) | 113 | openzeppelin-solidity@1.12.0 (67), swc-registry-fixed (19), @openzeppelin/contracts@4.9.6 (16), solmate@6.2.0 (7), @uniswap/v2-core@1.0.1 (3), canonical-weth@1.4.0 (1) |

**New in v2: size-matched negatives.** `swc-registry-fixed` are the patched versions of the SWC Registry's vulnerable samples:
same size and style as the positives, so "big file = clean" is no longer a shortcut.

Excluded (`excluded.csv`, `compile_report.csv`): 27 SmartBugs files in out-of-scope categories (vulnerable, so never used as negatives);
non-compiling files: sb_access_control_parity_wallet_bug_1.sol, sb_reentrancy_reentrancy_bonus.sol, sb_reentrancy_reentrancy_cross_function.sol, sb_unchecked_low_level_calls_0x89c1b3807d4c67df034fffb62f3509561218d30b.sol, swc_swc-103_semver_floating_pragma_fixed.sol, swc_swc-131_unused_state_variables_fixed.sol, swc_swc-133_access_control_fixed_1.sol.

## Label rules
- Positive = statically exploitable in one of the four classes (SmartBugs/SWC category and lines).
- Negative = audited library code or a patched SWC sample: "no known vulnerability", NOT proven bug-free.
- `group` = near-duplicate cluster of a contract's OWN code (5-token-shingle Jaccard >= 0.8; tiny files never merged). A vulnerable
  sample and its fixed version land in the same group, so they always sit in the same CV fold.

## Static pipeline vs labels (`STATIC_PIPELINE_REPORT.md`)
Recall: reentrancy 100%, unchecked_call 100%, integer_overflow 94%, access_control 71%. Clean files flagged by the same detector family:
reentrancy 19%, access_control 37%, integer_overflow 17%, unchecked_call 4%.

## Detector change made after the first results (disclose this in the report)
`prism-integer-overflow-legacy` used to flag any pre-0.8 contract that had any arithmetic and no SafeMath. It now flags only state-changing
arithmetic on non-constant operands in externally reachable functions, unless an earlier require/assert/if guards it (subtraction needs a
comparison on the value being decreased; addition/multiplication needs an overflow-style check; `x - y >= 0` is not a guard).

| | Before | After |
|---|---|---|
| Overflow recall on SmartBugs positives (n=15) | 93% | 93% |
| False positives on SmartBugs/npm negatives (n=94) | 5% | 1% |
| False positives on SWC fixed contracts (n=19, held out) | 58% | 21% |
| Other-class positives wrongly flagged as overflow | 57% | 31% |

How this was done: developed against SmartBugs + npm files; the SWC pairs were treated as held-out, but their aggregate numbers were
visible while iterating, so call them "mostly held-out". The one design change made between runs (operator-aware guards) was driven by a
missed SmartBugs positive, not by the SWC numbers. Only 2 SWC overflow positives exist, so recall there is not meaningful.
Remaining noise: Slither's own `uninitialized-state` (false positives on inherited OpenZeppelin 1.x tokens) and complex-contract detectors.

## Known limitations
1. SmartBugs/SWC files are small textbook examples; recall will not transfer to production contracts.
2. Even with matched negatives, size and style are not fully controlled. `train.py` now reports a size-only baseline and
   leave-one-clean-source-out; read those before any claim.
3. All static rows have neutral runtime features; runtime classes come from the replay scripts.
4. Negatives were not manually audited.
5. Licences vary (`license`/`origin` columns). Research use; cite SmartBugs Curated (Durieux et al., ICSE 2020) and the SWC Registry.

## Rebuild the rows (your machine, backend up) - the manifest and one detector changed, so redo it
1. `docker compose up --build -d static-analyzer backend` (the analyzer detector and the backend both changed).
2. **Disable alert delivery first**: Alerts page -> threshold 100, Telegram and Email off, Save.
3. Add `GEMINI_MAX_FINDINGS=0` to `backend-services/static-analyzer/.env`, then `docker compose up -d --force-recreate static-analyzer`.
4. `cd ml; python build_dataset.py --static-manifest data/static_manifest_verified.csv --api http://localhost:8080 --username YOU --password PASS --out data/dataset_static.csv`
5. `python train.py --data data/dataset_static.csv --out runs/static_v2`  (the report now includes the logistic-regression and
   size-only baselines, recall at matched FPR, false positives by source and leave-one-source-out).
6. Restore alert settings; remove the Gemini setting.
