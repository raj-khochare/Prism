# PRISM Automated Locust Load Testing Suite

Comprehensive, professional load testing and performance benchmarking suite designed specifically for the **PRISM** decentralized application security and anomaly detection platform.

---

## 1. Architecture & Discovered Services

The test harness targets the PRISM platform components:
- **Core API Gateway / Backend**: Spring Boot 4.x / Java 21 (`prism_project-backend-1` on port `8080`)
  - Secured via JWT Bearer authentication (`/api/auth/*`)
  - Endpoints: Dashboard overview, contracts registry, findings, alerts, runtime anomalies, telemetry, and risk assessment decomposition.
- **Static Analyzer**: FastAPI / Slither / Custom Detectors (`prism_project-static-analyzer-1` on port `8001`)
- **Blockchain Node**: Hardhat local JSON-RPC node (`prism_project-hardhat-node-1` on port `8545`)
- **Database**: PostgreSQL 17 (`prism_project-postgres-1` on port `5434:5432`)
- **Frontend**: Vite React SPA (`prism_project-frontend-1` on port `5173`)

---

## 2. Directory Structure

```text
load-tests/
├── locustfile.py           # Primary Locust user definitions (Visitor, Authenticated Operator)
├── config.py               # Central configuration, timeouts, URLs, and SLO definitions
├── requirements.txt        # Isolated Python testing dependencies
├── .env.example            # Environment configuration template
├── .env                    # Local runtime overrides (git-ignored)
├── README.md               # Complete operational guide
├── tasks/
│   ├── __init__.py
│   ├── public_api.py       # Health checks, unauthenticated 401 checks, login tests
│   └── authenticated_api.py# Overview, contracts, findings, alerts, telemetry, safe contract lifecycle
├── scenarios/
│   ├── __init__.py
│   ├── smoke_test.py       # Scenario A: 1-5 users, ~1 min (Sanity & endpoint verification)
│   ├── baseline_test.py    # Scenario B: 10 users, 3 min (Standard baseline metrics)
│   ├── load_test.py        # Scenario C: 10 -> 25 -> 50 -> 100 users (Stepped concurrency)
│   ├── stress_test.py      # Scenario D: Ramp up to 150 users with safety tripwires
│   └── soak_test.py        # Scenario E: 25 users sustained over 30-60 min (Leak detection)
├── results/                # Timestamped raw Locust CSV files
│   └── .gitkeep
├── reports/                # Generated Markdown (.md) and JSON (.json) analysis reports
│   └── .gitkeep
└── scripts/
    ├── run_tests.py        # Unified CLI test runner with pre-flight checks
    ├── run_smoke_test.py   # Quick-launch smoke test shortcut
    └── analyze_results.py  # Standalone CSV parser and SLO compliance evaluator
```

---

## 3. Installation & Virtual Environment Setup

To keep dependencies isolated from your host and production services, create a virtual environment inside `load-tests/`:

### Windows (PowerShell)
```powershell
cd d:\PROJECTS\major\PRISM_project\load-tests
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
```

### Linux / macOS (Bash)
```bash
cd load-tests
python3 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
```

---

## 4. Configuration

Copy the example template and adjust settings as required:
```powershell
Copy-Item .env.example .env
```

Key environment variables:
- `PRISM_BASE_URL`: Base target URL (default: `http://127.0.0.1:8080`)
- `PRISM_TEST_USERNAME`: Load test account username (default: `loadtest_user`)
- `PRISM_TEST_PASSWORD`: Load test account password (default: `Password123!`)
- `PRISM_TEST_ROLE`: User role (`DEVELOPER` or `REVIEWER`)
- `PRISM_REQUEST_TIMEOUT`: HTTP timeout in seconds (default: `15.0`)
- `SLO_MAX_FAILURE_RATE_PCT`: Maximum acceptable failure percentage (default: `1.0%`)
- `SLO_MAX_P95_LATENCY_MS`: Target p95 response time (default: `500.0ms`)
- `SLO_MAX_P99_LATENCY_MS`: Target p99 response time (default: `1500.0ms`)

---

## 5. Execution Commands

### Interactive Mode (Web UI)
Launch Locust with a real-time web dashboard accessible at `http://localhost:8089`:
```powershell
# Using the test runner:
python scripts/run_tests.py --web

# Or directly with Locust:
locust -f locustfile.py --host http://127.0.0.1:8080
```

### Headless Scenario Execution

#### A. Smoke Test (Sanity verification, 5 users, 1 minute)
```powershell
# Quick launcher:
python scripts/run_smoke_test.py

# Or via unified runner:
python scripts/run_tests.py --scenario smoke
```

#### B. Baseline Test (10 users, 3 minutes)
```powershell
python scripts/run_tests.py --scenario baseline
```

#### C. Stepped Load Test (Scales concurrency to 50 users over 5 minutes)
```powershell
python scripts/run_tests.py --scenario load --users 50 --duration 5m
```

#### D. Stress Test (Pushes to 150 users with automatic safety stops)
> ⚠️ **Resource Warning:** Ensure adequate CPU/memory before running high-concurrency stress tests.
```powershell
python scripts/run_tests.py --scenario stress --duration 5m
```

#### E. Soak Test (25 users sustained over 30 minutes)
```powershell
python scripts/run_tests.py --scenario soak --users 25 --duration 30m
```

#### F. High-Scale Pilot (100 users @ 10 users/sec ramp, 45 seconds sanity)
```powershell
python scripts/run_tests.py --scenario pilot
```

#### G. 100-User 50,000-Request Scale Test (100 users @ 10 users/sec, up to 60m)
```powershell
python scripts/run_tests.py --scenario scale_50k
```

---

## 6. Result Collection & Analysis

When a test completes, `analyze_results.py` automatically parses the generated CSV files and outputs:
1. **Markdown Report** (`reports/{scenario}_{timestamp}.md`): Human-readable tables, slowest endpoints, percentiles, and SLO pass/fail badge.
2. **JSON Summary** (`reports/{scenario}_{timestamp}.json`): Machine-readable metrics for automated CI/CD gating.

You can also run standalone analysis on any previous run:
```powershell
python scripts/analyze_results.py --csv-prefix results/smoke_20261027_115500 --scenario smoke
```

---

## 7. Resource & Dependency Monitoring

To monitor backend resource consumption during load tests:

### Docker Container Utilization
```powershell
# Live CPU, memory, and network I/O per container
docker stats prism_project-backend-1 prism_project-postgres-1 prism_project-static-analyzer-1
```

### PostgreSQL Connections & Slow Queries
```powershell
# Check active database connections:
docker exec -it prism_project-postgres-1 psql -U Prism -d prism -c "SELECT count(*), state FROM pg_stat_activity GROUP BY state;"
```

### Spring Boot Health & Metrics
- Health endpoint: `http://localhost:8080/actuator/health`
- JVM info (if enabled): `http://localhost:8080/actuator/metrics`

---

## 8. Safety & Data Protection Safeguards

1. **Non-destructive Testing**: Tests target read operations and isolated safe write/delete cycles.
2. **Zero Residual State**: Any test contract registered during the lifecycle task is immediately removed via `DELETE /api/contracts/{id}`.
3. **Safety Tripwires**: Stress tests monitor aggregate failure rates and abort automatically if error rates exceed 8% or average latency exceeds 2500ms.
4. **Host Notice**: Executing Locust on the same machine running Docker containers shares host CPU/RAM. For production-grade capacity planning, run Locust from an independent load-generating machine.
