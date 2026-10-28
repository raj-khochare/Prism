#!/usr/bin/env python3
"""
PRISM Unified Load Test Runner
Supports all 5 scenarios (smoke, baseline, load, stress, soak) in both headless
and interactive web UI modes, performs pre-flight checks, and generates reports.
"""

import os
import sys
import argparse
import subprocess
from datetime import datetime
from pathlib import Path
import urllib.request
import urllib.error
import json

# Add parent directory to path
BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

from config import Config
from scenarios.smoke_test import SmokeTestConfig
from scenarios.baseline_test import BaselineTestConfig
from scenarios.load_test import LoadTestConfig
from scenarios.stress_test import StressTestConfig
from scenarios.soak_test import SoakTestConfig
from scenarios.scale_50k_test import Scale50kConfig
from scripts.analyze_results import generate_reports


def check_target_health(host: str) -> bool:
    """Verifies that the target backend service is responsive before starting load."""
    health_url = f"{host.rstrip('/')}/actuator/health"
    print(f"[*] Pre-flight check: probing {health_url}...")
    try:
        req = urllib.request.Request(
            health_url,
            headers={"User-Agent": "PRISM-LoadTest-Prober"}
        )
        with urllib.request.urlopen(req, timeout=5) as response:
            if response.status == 200:
                body = response.read().decode("utf-8")
                try:
                    data = json.loads(body)
                    status = data.get("status", "UNKNOWN")
                    print(f"[+] Target is HEALTHY (Actuator status: {status})")
                    return True
                except json.JSONDecodeError:
                    print(f"[+] Target is reachable (HTTP 200)")
                    return True
    except urllib.error.HTTPError as e:
        print(f"[!] Target returned HTTP error {e.code}: {e.reason}")
        return False
    except Exception as e:
        print(f"[-] Target connectivity check failed: {e}")
        return False
    return False


def run_scenario(
    scenario: str,
    host: str = None,
    users: int = None,
    spawn_rate: int = None,
    duration: str = None,
    headless: bool = True,
    web_port: int = 8089
):
    target_host = host or Config.BASE_URL
    locustfile = BASE_DIR / "locustfile.py"

    # Pre-flight check
    if not check_target_health(target_host):
        print("\n[ERROR] Target service is not reachable. Aborting load test for safety.")
        print("Please ensure the PRISM backend service is running (e.g. `docker compose ps`).")
        sys.exit(1)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    csv_prefix = Config.RESULTS_DIR / f"{scenario}_{timestamp}"

    # Build Locust CLI command
    cmd = [
        sys.executable, "-m", "locust",
        "-f", str(locustfile),
        "--host", target_host
    ]

    if not headless:
        print(f"\n[+] Starting Locust Web UI mode for '{scenario}' scenario...")
        print(f"[+] Open your browser at: http://localhost:{web_port}")
        cmd.extend(["--web-port", str(web_port)])
        try:
            subprocess.run(cmd, cwd=str(BASE_DIR))
        except KeyboardInterrupt:
            print("\n[*] Locust session stopped by user.")
        return

    env = os.environ.copy()

    # Headless mode: apply scenario parameters
    if scenario == "load" and users is None and duration is None:
        env["USE_STEPPED_SHAPE"] = "true"
        cmd.extend([
            "--headless",
            "--csv", str(csv_prefix),
            "--only-summary"
        ])

        print(f"\n==================================================")
        print(f" Launching Scenario: STEPPED LOAD TEST (3 STAGES)")
        print(f" Target Host:        {target_host}")
        print(f" Stage 1 (0-60s):    10 users (spawn rate: 2/s)")
        print(f" Stage 2 (60-180s):  25 users (spawn rate: 5/s)")
        print(f" Stage 3 (180-300s): 50 users (spawn rate: 5/s)")
        print(f" Total Duration:     5 minutes (300 seconds)")
        print(f" Max Concurrency:    50 users (safely capped)")
        print(f" Results Prefix:     {csv_prefix}")
        print(f" Command:            {' '.join(cmd)}")
        print(f"==================================================\n")
    else:
        if scenario == "smoke":
            cfg = SmokeTestConfig
            u = users or cfg.USERS
            sr = spawn_rate or cfg.SPAWN_RATE
            dur = duration or cfg.DURATION
        elif scenario == "baseline":
            cfg = BaselineTestConfig
            u = users or cfg.USERS
            sr = spawn_rate or cfg.SPAWN_RATE
            dur = duration or cfg.DURATION
        elif scenario == "load":
            cfg = LoadTestConfig
            u = users or cfg.DEFAULT_USERS
            sr = spawn_rate or cfg.DEFAULT_SPAWN_RATE
            dur = duration or cfg.DEFAULT_DURATION
        elif scenario == "stress":
            cfg = StressTestConfig
            u = users or cfg.MAX_USERS
            sr = spawn_rate or cfg.SPAWN_RATE
            dur = duration or cfg.DURATION
        elif scenario == "soak":
            cfg = SoakTestConfig
            u = users or cfg.DEFAULT_USERS
            sr = spawn_rate or cfg.DEFAULT_SPAWN_RATE
            dur = duration or cfg.DEFAULT_DURATION
        elif scenario in ("scale_50k", "scale"):
            cfg = Scale50kConfig
            u = users or cfg.MAX_USERS
            sr = spawn_rate or cfg.SPAWN_RATE
            dur = duration or cfg.MAX_DURATION
            env["TARGET_REQUESTS"] = str(cfg.TARGET_REQUESTS)
        elif scenario in ("scale_pilot", "pilot"):
            cfg = Scale50kConfig
            u = users or cfg.PILOT_USERS
            sr = spawn_rate or cfg.PILOT_SPAWN_RATE
            dur = duration or cfg.PILOT_DURATION
        else:
            print(f"[ERROR] Unknown scenario '{scenario}'. Available: smoke, baseline, load, stress, soak, scale_50k, pilot")
            sys.exit(1)

        cmd.extend([
            "--headless",
            "--users", str(u),
            "--spawn-rate", str(sr),
            "--run-time", str(dur),
            "--csv", str(csv_prefix),
            "--only-summary"
        ])

        print(f"\n==================================================")
        print(f" Launching Scenario: {scenario.upper()}")
        print(f" Target Host:        {target_host}")
        print(f" Simulated Users:    {u}")
        print(f" Spawn Rate:         {sr} user(s)/sec")
        print(f" Duration:           {dur}")
        print(f" Results Prefix:     {csv_prefix}")
        print(f" Command:            {' '.join(cmd)}")
        print(f"==================================================\n")

    result = subprocess.run(cmd, cwd=str(BASE_DIR), env=env)

    if result.returncode != 0:
        print(f"\n[!] Locust execution exited with code: {result.returncode}")

    # Generate analysis reports
    stats_file = Config.RESULTS_DIR / f"{csv_prefix.name}_stats.csv"
    if stats_file.exists():
        print("[*] Generating comprehensive benchmark reports...")
        generate_reports(csv_prefix=str(csv_prefix), scenario_name=scenario)
    else:
        print(f"[!] No CSV output was produced at {stats_file}.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="PRISM Automated Locust Load Test Runner")
    parser.add_argument(
        "--scenario",
        choices=["smoke", "baseline", "load", "stress", "soak", "scale_50k", "pilot"],
        default="smoke",
        help="Select scenario to execute (default: smoke)"
    )
    parser.add_argument("--host", default=None, help="Target backend base URL (default: PRISM_BASE_URL from .env)")
    parser.add_argument("--users", type=int, default=None, help="Override number of simulated concurrent users")
    parser.add_argument("--spawn-rate", type=int, default=None, help="Override user spawn rate (users per second)")
    parser.add_argument("--duration", default=None, help="Override test duration (e.g. 30s, 1m, 3m)")
    parser.add_argument("--web", action="store_true", help="Launch interactive Locust Web UI instead of headless run")
    parser.add_argument("--web-port", type=int, default=8089, help="Port for the interactive Web UI (default: 8089)")

    args = parser.parse_args()

    run_scenario(
        scenario=args.scenario,
        host=args.host,
        users=args.users,
        spawn_rate=args.spawn_rate,
        duration=args.duration,
        headless=not args.web,
        web_port=args.web_port
    )
