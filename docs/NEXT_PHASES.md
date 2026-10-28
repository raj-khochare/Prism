# Remaining build phases (in dependency order)

Each phase ends in something you can run and demo. Don't start a phase until the previous
"Done when" is true. Stack stays as locked (Spring Boot hub, FastAPI services, XGBoost/SHAP, Hardhat fork, STOMP, Docker Compose).

## Phase 0 - Make it run (1 day) - DO THIS FIRST
1. Rotate the Gemini key and JWT secret. Copy every `.env.example` to `.env` and fill it in
   (`.env`, `prism-Backend/.env`, `backend-services/static-analyzer/.env`, `Frontend/.env`).
2. `cd prism-Backend && ./gradlew compileJava test` - **I could not compile the Java**, so expect to fix a few
   small compile errors (typos/imports) here. Paste them back to me if any look odd.
3. `docker compose up --build`. Wait for all services to be healthy (first build is slow: Foundry + 7 solc).
4. Smoke test (this is your regression checklist, run it after every phase):
   - Register as Developer and as Reviewer (two browsers) -> Reviewer: Scan, Register, Dismiss and alert Save are disabled; `curl -X POST /api/scan` with the reviewer token returns **403**, not 500.
   - Scan `multivulnerable.sol` -> findings include reentrancy-eth (Critical), tx-origin, arbitrary-send, `prism-missing-access-control` (destroy). Risk page shows a score and factors. Overview is non-empty.
   - Scan `intoverflow.sol` -> `prism-unchecked-arithmetic` (High).
   - Findings -> pick reentrancy -> **Prove exploit** -> status `confirmed` with balances (needs a valid Gemini key).
5. Runtime: `docker compose up hardhat-node`; in `blockchain-env` run `npx hardhat run scripts/deploy-and-attack.js`; copy the printed address into Registry -> Register (name it exactly as you like). Activity appears under Runtime Monitor within ~2 s; the contract's tx counter in the registry goes up.
**Done when:** the whole checklist passes on a clean `docker compose down -v && up`.

## Phase 1 - Hardhat replay scripts (2-3 days)
Goal: reproducible runtime attacks on the *forked* chain (your locked demo strategy).
1. `hardhat.config.js`: add `hardhat: { forking: { url: process.env.MAINNET_RPC_URL, blockNumber: <pinned> } }` for the node service; pin the block so replays are repeatable.
2. `scripts/replay-reentrancy.js`: deploy `Reentrancy.sol` + an attacker contract, fund the victim, run the attack. (Your `exploit-engine/src/ReentrancyAttacker.sol` is the template.)
3. `scripts/replay-flashloan.js`: borrow a large amount from a forked lender (Aave/Balancer) into a helper, move it through the monitored contract, repay in the same block.
4. `scripts/replay-oracle.js`: manipulate a spot-price pool the monitored contract reads, call it, restore.
5. Each script prints the deployed address and block numbers so the demo is copy-paste.
**Done when:** each script, run against a fresh node, produces a distinct anomaly event in the dashboard.

## Phase 2 - Remaining runtime features (2 days)
In `RuntimeMonitorService.handleContract` fill the three neutral features:
- `flashLoanDetected`: in the block, the monitored contract's balance rose and fell by a similar large amount (net ~0) **or** a tx receipt logs a `FlashLoan` event from a known lender (decode logs with web3j `EventEncoder`).
- `oracleDeviationPct`: call the oracle's `latestRoundData()`/pool `getReserves()` with web3j each block; deviation = |spot - TWAP| / TWAP * 100 (keep a rolling TWAP like you keep `txHistory`).
- `governanceTokenConcentrationDelta`: change in top-holder share of the governance token between blocks (keep optional; spec lists governance + liquidity attacks as runtime classes).
Add unit tests that feed a fake `EthBlock` and assert the signals. Emit event types `FLASH_LOAN`, `ORACLE_DEVIATION`.
**Done when:** the Phase-1 flash-loan and oracle scripts flip those features and raise Critical alerts.

## Phase 3 - Dataset (3-4 days, can overlap with Phase 1)
1. Sources (as planned): De.Fi REKT database + DeFiHackLabs. For each incident record: contract source (if available), the exploit tx, and the attack class.
2. Build **labelled `FeatureVector` rows** with the *same* code path as production: static features by running your analyzer on the vulnerable source; runtime features by replaying the exploit (or from on-chain data of the incident block range). Write `ml/build_dataset.py`.
3. Negatives: verified, popular contracts and normal blocks (aim for a realistic ~10:1 ratio, not 1:1, and say so).
4. Save `dataset.csv` with a fixed 20-column schema matching `FeatureVector` exactly + `label` (+ `attack_class`). Version it.
5. Split **by protocol/incident**, not by row, so the same exploit never appears in train and test.
**Done when:** `dataset.csv` loads, has >= a few hundred rows, and a notebook shows class balance and per-feature distributions.

## Phase 4 - Baseline then model (3 days)
1. **Rule-based baseline first** (planned): the weighted score in `StubMlScoringClient`, tuned, evaluated on the held-out set. This is your honesty anchor for the panel.
2. XGBoost (`ml/train.py`): grouped CV, report precision/recall/F1/PR-AUC per attack class and overall, confusion matrix, and the baseline next to it. **Report the real numbers**, including weak classes, and list limitations (small data, label noise, forked-chain replays vs real incidents).
3. Export `model.json` + `features.json` (the ordered 20 names).
**Done when:** the notebook table "baseline vs XGBoost" exists and is reproducible from one command.

## Phase 5 - ML service (port 8002) and swap-in (2 days)
FastAPI service, stateless, same style as the analyzer:
```python
# ml-service/app/main.py
FEATURES = json.load(open("features.json"))          # the 20 names, in FeatureVector order
model = xgboost.XGBClassifier(); model.load_model("model.json")
explainer = shap.TreeExplainer(model)

@app.post("/score")
def score(f: dict):
    x = pd.DataFrame([[float(f[n]) for n in FEATURES]], columns=FEATURES)
    p = float(model.predict_proba(x)[0, 1])
    sv = explainer.shap_values(x)[0]
    top = sorted(zip(FEATURES, sv), key=lambda t: -abs(t[1]))[:6]
    score = round(p * 100)
    band = "CRITICAL" if score > 80 else "HIGH" if score > 55 else "MEDIUM" if score > 30 else "LOW"
    return {"score": score, "band": band, "confidence": max(p, 1 - p),
            "factors": [{"feature_name": n, "contribution": float(v)} for n, v in top]}
```
Java side (the interface already exists; callers do not change):
```java
@Component @Primary
public class RestMlScoringClient implements MlScoringClient {
    // RestClient to ${prism.services.ml-base-url}/score; Jackson snake_case on MlScoreResult
    @Override public String modelName() { return "XGBoost"; }
    @Override public String modelVersion() { return "v1"; }
}
```
Keep `StubMlScoringClient` as the fallback if the service is down (catch `RestClientException`, log, use the stub) so a demo never dies on the ML container. Add `ml-service` to `docker-compose.yml` with a healthcheck, and update `ML_SERVICE_URL=http://ml-service:8002`.
The factor names SHAP returns are the 20 `FeatureVector` names; `RiskPresentationService.isStatic` already splits them into static vs runtime columns.
**Done when:** the Risk page's "Model" card shows XGBoost, factors come from SHAP, and the stub is only a fallback.

## Phase 6 - Alerts completion (1 day)
- E-mail: add `spring-boot-starter-mail`, a `JavaMailSender` call in `AlertService` where the "SMTP not wired" log is; settings from env.
- Real Telegram: create a bot with @BotFather, put token/chat id in `prism-Backend/.env`, trigger the Phase-1 reentrancy script, confirm a message arrives.
- Optional: authenticate the STOMP CONNECT with the JWT (currently `/ws` is open and carries only dashboard events).

## Phase 7 - Hardening and tests (2 days)
- Backend: `@WebMvcTest` for the four `@PreAuthorize` endpoints (Developer 200, Reviewer 403, anonymous 401); `RuntimeMonitorService` signal tests; Testcontainers Postgres for a real `contextLoads`.
- Python: keep `tests/`, add a golden test per sample contract with Slither mocked.
- Replace `ddl-auto: update` with Flyway migrations (`V1__init.sql`).
- GitHub Actions: `./gradlew test`, `pytest`, `npm run build`.

## Phase 8 - Evaluation chapter and demo (2-3 days)
1. Report: architecture (hub-and-spoke, stub-first), the 8 attack classes with which are static vs runtime and **which are partially covered** (be explicit: access-control and overflow are heuristics; governance/liquidity are the thinnest), the baseline-vs-XGBoost table, limitations (forked-chain demo only, no sandwich/MEV, in-memory runtime store).
2. Demo script (rehearse, 8 minutes): login as Reviewer (show 403 behaviour) -> Developer scan of `multivulnerable.sol` -> findings + prove exploit -> register the Hardhat contract -> run the reentrancy replay -> live alert on screen and phone -> Risk page with SHAP factors -> baseline-vs-model slide.
3. Prepare the fallback: a recorded run, and `docker compose` snapshot with the Gemini calls cached in case the network fails on the day.
4. Anticipated panel questions: why Slither + heuristics instead of ML for static; how labels were produced; why replayed attacks are valid evidence; false-positive rate on safe contracts (measure it on 10-20 verified contracts - you already have the pipeline).
