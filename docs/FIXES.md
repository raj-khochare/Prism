# PRISM / Argus - issue log and fixes

Legend: **P0** = project cannot work, **P1** = feature broken, **P2** = quality / demo risk.
Verification: **[T]** covered by an automated test I ran, **[B]** frontend production build passed,
**[R]** reviewed by reading only - please run it (Java was NOT compiled in my sandbox).

Constraints respected: tech stack unchanged, the six entities and the 20-field `FeatureVector` unchanged.
The one schema-adjacent change is listed under "Decisions for you".

## 0. Secrets (do first)
| # | Issue | Fix |
|---|---|---|
| S1 P0 | The zip contained real `.env` files: a Gemini API key and the JWT signing secret. | **Rotate both now.** `.env` files are removed from this copy; `.env.example` files added. The keys were never in git history, only in the zip. |

## 1. Why the app could not run end to end
| # | Where | Problem | Fix | Status |
|---|---|---|---|---|
| A1 P0 | Frontend -> Backend | Scan POSTed to `/api/scan`, which did not exist (backend only had `/api/contracts/{id}/scan`, needing a contract id the UI never had) | New `POST /api/scan` creates the registry entry and scans | [R] |
| A2 P0 | Frontend | Scan read the token from `localStorage['token']`; login stores `prism_token` -> every scan was unauthenticated | One request helper using `prism_token` | [B] |
| A3 P0 | Frontend | Scan score read `staticRiskContribution`; backend returns `riskScore` -> always 0 | Fixed mapping | [B] |
| A4 P0 | Frontend -> Backend | Prove-exploit sent `finding.function`/`finding.contract`; cards have `functionName`/`solidityContractName` -> backend always 400 | Payload built from the right fields | [B] |
| A5 P0 | Backend DTO | `ProveExploitRequest` is snake_case, browser sends camelCase -> `contractSource` arrived null | `@JsonAlias` for both spellings; server can load stored source via `contractId` | [R] |
| A6 P0 | Python | `contract_id` was a bare param = *query* param, but Java sends a multipart *form* field -> every analysis stored `contract_id = NULL` | `Form(None)` | [T] |
| A7 P0 | Docker | Backend `Dockerfile` copied `build/libs/*.jar` but Gradle also emits `*-plain.jar` -> `COPY` fails; JDK 21 build vs toolchain 22; deprecated `openjdk:22` runtime | `jar` disabled, toolchain 21, Temurin 21 JRE, explicit jar name | [R] |
| A8 P0 | Hardhat script | `network.create()` = private in-process chain, not your node | `network.create("localhost")` | [R] |
| A9 P1 | Everything else | Overview, Registry, Findings, Risk, Runtime, Alerts all ran on mock data (`apiClient.js`, a second `api/client.js`, fake client-side analyzer) | Real API client with the same `{success,data}` shape; mock layers and the fake analyzer deleted | [B] |

## 2. Security / roles (spec: DEVELOPER vs REVIEWER, enforced server-side)
| # | Problem | Fix |
|---|---|---|
| B1 P0 | No `@EnableMethodSecurity`, no `@PreAuthorize` anywhere, `UserPrincipal.getAuthorities()` returned an empty list: **roles did not exist** | `Role` enum, `AppUser.role`, authorities, `@PreAuthorize("hasRole('DEVELOPER')")` on exactly the four writes: scan, register, configureAlerts, dismissAlerts |
| B2 P0 | The `configureAlerts` endpoint did not exist and the Alerts page "Save" was a no-op | `GET/PUT /api/alerts/config` (+ UI wired) |
| B3 P1 | A forbidden call would have been a **500** (the catch-all handler swallowed `AccessDeniedException`) | Explicit 403/401/404/502 handlers |
| B4 P1 | `/ws` required a JWT but browsers can't send headers on a WebSocket handshake | `/ws/**` and `/actuator/health` permitted |
| B5 P2 | CORS hard-coded to `localhost:5173` | `CORS_ALLOWED_ORIGINS` property (also used for `/ws`) |
| B6 P2 | Role self-selection at sign-up | Kept **for demo only** (so a panel can try both roles); marked in code - remove before real use |

## 3. Static analysis
| # | Problem | Fix | Status |
|---|---|---|---|
| C1 P1 | Slither always ran with solc 0.8.20; other pragmas failed | `solc_selector` picks a version from the pragma; Docker pre-installs 7 versions | [T] |
| C2 P1 | Gemini called sequentially per finding in a sync request; Java's 60 s timeout fired on real contracts | Thread pool, cap of 8 AI findings/scan (`GEMINI_MAX_FINDINGS`), 180 s client timeout | [T] |
| C3 P1 | `_generate_response` returned a dict when no API key, callers then crashed on `.text` | Raises; scan degrades gracefully | [T] |
| C4 P1 | Gemini `null` fields violated `NOT NULL` columns -> whole scan 500 | Coalesced | [T] |
| C5 P1 | Two of your four static classes were not detected: Slither has **no** unchecked-arithmetic or missing-access-control detector (your `intoverflow.sol` sample was never flagged) | `custom_detectors.py`: `prism-unchecked-arithmetic`, `prism-integer-overflow-legacy`, `prism-missing-access-control` | [T] on your 8 samples |
| C6 P1 | Slither never emits "Critical" so the Critical tier and its 40-pt weight were dead | Fund-draining detectors (reentrancy-eth, arbitrary-send-eth, suicidal, ...) promoted to CRITICAL | [R] + unit test |
| C7 P1 | `Finding.sourceSnippet` was `VARCHAR(255)`; `Alert.message` was `@Lob` (Postgres `oid`) | `TEXT` columns | [R] |
| C8 P1 | Scan deleted findings by loading the whole table; no transaction; held a DB connection during the slow call | `deleteByContractId` inside a `TransactionTemplate`, analyzer call outside it | [R] |
| C9 P2 | Slither noise (naming, solc-version) inflated scores | `--exclude-informational --exclude-optimization`; floating pragma computed from source | [R] |
| C10 P2 | `unchecked-arithmetic` would have been classified as an unchecked *call* | Family ordering fixed | [T] |

## 4. Exploit verification (Foundry)
| # | Problem | Fix | Status |
|---|---|---|---|
| D1 P1 | `async def` endpoint doing minutes of blocking work froze the whole analyzer (even `/health`) | plain `def` | [T] |
| D2 P1 | Shared `UploadedContract.sol`/`GeneratedExploit.t.sol`: concurrent runs overwrote each other | `threading.Lock` around write/run/cleanup | [R] |
| D3 P1 | A PoC was only "confirmed" if it logged **ETH balances**, so tx.origin / access-control / unchecked-call / randomness / arithmetic PoCs could never confirm | Value families keep the balance maths; others need `PRISM_EXPLOIT_CONFIRMED` **and** a `[PASS]` | [T] |
| D4 P1 | Verification rows were never stored (`finding_id` not forwarded) | forwarded end to end | [R] |
| D5 P2 | forge 60 s timeout, compiler downloaded at demo time | 180 s, `solc` pinned in `foundry.toml`, cache pre-warmed in Docker | [R] |
| D6 P2 | LLM-written code runs on your machine | `ffi=false`, `fs_permissions=[]`; still run it only inside the container, and note prompt-injection via contract comments as a known limitation | |

## 5. Risk engine, runtime, alerts
| # | Problem | Fix |
|---|---|---|
| E1 P0 | **Nothing ever built a `FeatureVector`** - a score needed a hand-typed Postman body | `FeatureExtractionService` (11 static features from findings; 9 runtime from the monitor). A scan now auto-produces a RiskAssessment. |
| E2 P0 | `RuntimeMonitorService` subscribed in `@PostConstruct` and did nothing; app crashed at startup if the node was down | Scheduled polling that survives outages; computes tx z-score, gas anomaly, fund movement, liquidity delta, unique callers, time since anomaly; pushes `/topic/runtime`; re-scores on activity |
| E3 P1 | Alerts only wrote a row ("wired in Phase 10") | Telegram send (token never logged), STOMP push `/topic/alerts`, per-contract cooldown, runtime-editable threshold |
| E4 P1 | UI says "reaches or exceeds" the threshold, code used `>` | `>=` |
| E5 P1 | Contract stayed `CRITICAL` forever | Resets when the score drops |
| E6 P1 | `tx24h` was the number of risk rows; alert `riskScore` hard-coded 0; `/api/system/status` always "Operational" | Real tx counts, real score, real health checks |
| E7 P1 | No read endpoints for Risk / Runtime / Overview; Findings/Registry had no filters | Added; paginated lists filter server-side |
| E8 P2 | `docker-compose` hard-coded DB creds for the analyzer, no healthchecks, no frontend | env-driven, healthchecks, frontend container (nginx, SPA fallback) |
| E9 P2 | Frontend showed mock numbers when data was empty (`score || 72`, `|| 3 || 2 || 1`) and a fake network switcher | `??` with real zeros; switcher removed |

## Decisions for you (flag, don't hide)
1. **`AppUser.role`** - the spec requires DEVELOPER/REVIEWER enforcement but `AppUser` had nowhere to store the role. It is one nullable column on an existing entity (null = DEVELOPER). Revert if you consider that a schema change; you would then need another role source.
2. **Alert settings and runtime events are in memory** (the locked schema has no table for them). They reset on restart. Fine for the demo; say so in the report.
3. **CRITICAL promotion list** (C6) and **detector heuristics** (C5) are editorial choices. Describe them honestly as heuristics with medium confidence.
4. **Not changed on purpose:** `ddl-auto: update` (use Flyway before any real deployment), Gemini model ids (now overridable by env - verify they exist for your key).

## Known gaps (not bugs in what exists - work still to do)
`flashLoanDetected`, `oracleDeviationPct`, `governanceTokenConcentrationDelta` stay neutral; the ML scorer is still the stub; e-mail delivery is not wired; attack-scenario / fixed-code text from Gemini is stored by the analyzer but not shown (no column in the locked `Finding`). See `NEXT_PHASES.md`.
