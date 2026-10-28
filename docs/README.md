# PRISM (Argus)

AI-assisted DeFi smart-contract security: static analysis (Slither + PRISM detectors + Gemini explanations),
Foundry exploit verification, runtime monitoring of a forked chain, and a fused, explainable risk score.

```
Frontend (React/Vite, :5173) -> prism-Backend (Spring Boot, :8080) -> static-analyzer (FastAPI, :8001)
                                      |  \-> ML scorer (stub now, FastAPI :8002 later)
                                      |-> PostgreSQL (:5434 on the host)
                                      \-> hardhat-node (:8545)   STOMP /ws pushes alerts + runtime events
```

## Run
```bash
cp .env.example .env                                   # POSTGRES_*, GEMINI_API_KEY
cp prism-Backend/.env.example prism-Backend/.env       # JWT_SECRET_KEY, Telegram, URLs
cp backend-services/static-analyzer/.env.example backend-services/static-analyzer/.env
docker compose up --build
# open http://localhost:5173 and register (pick Developer or Reviewer)
```
Use a DB password without `@ : /` characters (it is embedded in a URL).

## Develop without Docker
- Backend: `cd prism-Backend && ./gradlew bootRun` (needs Postgres, `DB_PASSWORD`, `JWT_SECRET_KEY`)
- Analyzer: `cd backend-services/static-analyzer && pip install -r requirements.txt && uvicorn app.main:app --port 8001` (needs Slither, solc-select, Foundry)
- Frontend: `cd Frontend && npm i && npm run dev`
- Python tests: `cd backend-services/static-analyzer && pip install pytest && pytest tests`

See `docs/FIXES.md` (what was wrong and what changed) and `docs/NEXT_PHASES.md` (what to build next).

## ML (optional until the model exists)
`ml/` = dataset builder + training; `ml-service/` = FastAPI scoring service. Without a model the backend uses its
rule-based baseline. See `docs/ML_BUILD_GUIDE.md`; start the service with `docker compose --profile ml up --build`.
`docs/AUDIT_2026-10.md` lists what was fixed in the latest review.
