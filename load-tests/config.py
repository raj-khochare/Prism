import os
from pathlib import Path
from dotenv import load_dotenv

# Locate load-tests directory and load .env if present
BASE_DIR = Path(__file__).resolve().parent
ENV_PATH = BASE_DIR / ".env"
if ENV_PATH.exists():
    load_dotenv(dotenv_path=ENV_PATH)
else:
    load_dotenv()  # Fallback to root or ambient env

class Config:
    """Central configuration for PRISM load test scenarios."""

    # Target service URLs
    BASE_URL = os.getenv("PRISM_BASE_URL", "http://127.0.0.1:8080").rstrip("/")
    STATIC_ANALYZER_URL = os.getenv("PRISM_STATIC_ANALYZER_URL", "http://127.0.0.1:8001").rstrip("/")
    ML_SERVICE_URL = os.getenv("PRISM_ML_SERVICE_URL", "http://127.0.0.1:8002").rstrip("/")

    # Authentication credentials
    TEST_USERNAME = os.getenv("PRISM_TEST_USERNAME", "loadtest_user")
    TEST_PASSWORD = os.getenv("PRISM_TEST_PASSWORD", "Password123!")
    TEST_ROLE = os.getenv("PRISM_TEST_ROLE", "DEVELOPER")
    AUTH_TOKEN = os.getenv("PRISM_AUTH_TOKEN", "").strip()

    # Request timeouts & wait times
    REQUEST_TIMEOUT = float(os.getenv("PRISM_REQUEST_TIMEOUT", "15.0"))
    MIN_WAIT = float(os.getenv("PRISM_MIN_WAIT_SECONDS", "1.0"))
    MAX_WAIT = float(os.getenv("PRISM_MAX_WAIT_SECONDS", "3.0"))

    # SLO Targets
    SLO_MAX_FAILURE_RATE_PCT = float(os.getenv("SLO_MAX_FAILURE_RATE_PCT", "1.0"))
    SLO_MAX_P95_LATENCY_MS = float(os.getenv("SLO_MAX_P95_LATENCY_MS", "500.0"))
    SLO_MAX_P99_LATENCY_MS = float(os.getenv("SLO_MAX_P99_LATENCY_MS", "1500.0"))

    # Output paths
    RESULTS_DIR = BASE_DIR / "results"
    REPORTS_DIR = BASE_DIR / "reports"

    # High Scale (50k Request Target) Parameters
    SCALE_MAX_USERS = int(os.getenv("SCALE_MAX_USERS", "100"))
    SCALE_SPAWN_RATE = int(os.getenv("SCALE_SPAWN_RATE", "10"))
    SCALE_MAX_DURATION = os.getenv("SCALE_MAX_DURATION", "60m")
    SCALE_TARGET_REQUESTS = int(os.getenv("SCALE_TARGET_REQUESTS", "50000"))

# Ensure directories exist
Config.RESULTS_DIR.mkdir(parents=True, exist_ok=True)
Config.REPORTS_DIR.mkdir(parents=True, exist_ok=True)
