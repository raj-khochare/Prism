#!/usr/bin/env python
"""Collect RUNTIME training rows by repeating the local replays and labelling the time windows.

For every run (a fresh deployment each time):
  1. deploy the scenario with Hardhat (FRESH=1)            -> new vault / lender address
  2. register it in the backend under a UNIQUE name         (and, for oracle, point the detector at its pool)
  3. benign phase: benign-traffic.js                        -> window labelled 0
  4. pause so the monitor has processed every benign block  (monitor polls every ~2 s)
  5. attack: replay-*.js with WARMUP=0                      -> window labelled 1 (flash_loan / oracle_manipulation)
  6. pause, delete the contract from the registry
Cooldown lines after the attack window are intentionally left unlabelled (build_dataset drops them).

PREREQUISITES
  * backend started WITH the dump:  docker compose -f docker-compose.yml -f docker-compose.dataset.yml up -d --build backend
  * Hardhat node running (docker compose up hardhat-node) and `npm install` done in blockchain-env/
  * alert delivery OFF (Alerts page: threshold 100, Telegram/Email off) - every run triggers alerts otherwise
  * a Developer account

  python collect/collect_runtime.py --username raj --password "..." --runs 10
  python collect/collect_runtime.py ... --runs 10 --build        # also writes data/dataset_runtime.csv

Rows come from the production code path (RuntimeMonitorService -> FeatureDumpWriter); nothing is re-implemented here.
Static features of these rows are zero: the contracts are registered without source (modelled as "unscanned").
"""
import argparse
import csv
import email.utils
import json
import os
import subprocess
import sys
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parents[1]                 # ml/
SCENARIOS = {
    "flashloan": {"script": "scripts/replay-flashloan.js", "short": "fl", "klass": "flash_loan",
                  "address_key": "vault"},
    "oracle": {"script": "scripts/replay-oracle.js", "short": "or", "klass": "oracle_manipulation",
               "address_key": "lender"},
}


def iso(dt: datetime) -> str:
    return dt.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z"


class Collector:
    def __init__(self, a):
        self.a = a
        self.chain_dir = Path(a.chain_dir).resolve()
        self.dump = Path(a.dump)
        self.hdr = {}
        self.offset = timedelta(0)  # backend clock minus this machine's clock

    # ---- backend API
    def login(self):
        r = requests.post(f"{self.a.api}/api/auth/login", timeout=30,
                          json={"identifier": self.a.username, "password": self.a.password})
        r.raise_for_status()
        self.hdr = {"Authorization": f"Bearer {r.json()['token']}"}

    def calibrate_clock(self):
        """Dump timestamps come from the backend's clock (a container whose clock can drift on Docker Desktop)."""
        t0 = datetime.now(timezone.utc)
        r = requests.get(f"{self.a.api}/actuator/health", timeout=10)
        t1 = datetime.now(timezone.utc)
        server = email.utils.parsedate_to_datetime(r.headers["Date"])
        self.offset = server - (t0 + (t1 - t0) / 2)
        print(f"clock offset backend-local: {self.offset.total_seconds():+.1f}s (Date header has 1 s resolution)")

    def now(self) -> datetime:
        """Local time expressed on the backend's clock."""
        return datetime.now(timezone.utc) + self.offset

    def api(self, method, path, **kw):
        r = requests.request(method, f"{self.a.api}{path}", headers=self.hdr, timeout=60, **kw)
        r.raise_for_status()
        return r

    # ---- hardhat
    def hardhat(self, script, **env):
        cmd = self.a.hardhat_cmd.format(script=script)
        e = {**os.environ, **{k: str(v) for k, v in env.items()}}
        r = subprocess.run(cmd, cwd=self.chain_dir, env=e, shell=True, capture_output=True, text=True)
        if r.returncode != 0:
            sys.exit(f"hardhat failed: {cmd}\n{r.stdout[-600:]}\n{r.stderr[-800:]}")
        return r.stdout

    def dump_lines(self):
        if not self.dump.exists():
            return []
        out = []
        for ln in self.dump.read_text(errors="ignore").splitlines():
            try:
                out.append(json.loads(ln))
            except ValueError:
                pass
        return out

    # ---- one run
    def run_one(self, scen: str, i: int, stamp: str):
        s = SCENARIOS[scen]
        name = f"rt_{s['short']}_{stamp}_{i:03d}"
        group = f"rt-{scen}-{stamp}-{i:03d}"
        print(f"\n=== {name} ({scen}) ===")
        self.hardhat(s["script"], FRESH=1)                                  # deploy only (first run of the script)
        dep = json.loads((self.chain_dir / "deployments" / f"{scen}.json").read_text())
        addr = dep[s["address_key"]]
        cid = None
        try:
            cid = self.api("POST", "/api/contracts", json={"name": name, "address": addr,
                                                           "chain": "Local (Hardhat)"}).json()["id"]
            if scen == "oracle":
                self.api("PUT", "/api/runtime/oracle-pools", json={"contractAddress": addr, "poolAddress": dep["pool"]})
            time.sleep(self.a.poll_wait)                                    # let the monitor pick the contract up
            t_registered = self.now()

            self.hardhat("scripts/benign-traffic.js", SCENARIO=scen, ROUNDS=self.a.benign_rounds,
                         DELAY_MS=self.a.benign_delay_ms)
            time.sleep(self.a.settle)                                       # every benign block processed
            t_attack = self.now()
            out = self.hardhat(s["script"], WARMUP=0)                       # the attack
            blocks = [ln for ln in out.splitlines() if ln.startswith("ATTACK_BLOCKS")]
            time.sleep(self.a.settle)
            t_end = self.now()
        finally:
            if cid:
                try:
                    if scen == "oracle":
                        self.api("DELETE", f"/api/runtime/oracle-pools/{addr}")
                    self.api("DELETE", f"/api/contracts/{cid}")
                except Exception as e:  # noqa: BLE001 - cleanup must never hide the real error
                    print("  cleanup warning:", e)

        rows = [
            {"contract": name, "start": iso(t_registered), "end": iso(t_attack), "label": 0,
             "attack_class": "benign", "group": group, "source": "replay-local"},
            {"contract": name, "start": iso(t_attack), "end": iso(t_end), "label": 1,
             "attack_class": s["klass"], "group": group, "source": "replay-local"},
        ]
        self.report(name, rows, blocks)
        return rows

    def report(self, name, rows, blocks):
        lines = [d for d in self.dump_lines() if d.get("contract") == name]

        def inside(d, r):
            ts = datetime.fromisoformat(d["ts"].replace("Z", "+00:00"))
            return datetime.fromisoformat(r["start"].replace("Z", "+00:00")) <= ts < datetime.fromisoformat(
                r["end"].replace("Z", "+00:00"))
        b = [d for d in lines if inside(d, rows[0])]
        a = [d for d in lines if inside(d, rows[1])]
        hit = [d for d in a if d.get("flashLoanDetected") or d.get("oracleDeviationPct", 0) > self.a.oracle_threshold]
        print(f"  benign rows: {len(b)}   attack rows: {len(a)} (detector fired on {len(hit)})   {' '.join(blocks)}")
        if not lines:
            print("  !! no dump lines for this contract: is the backend running with docker-compose.dataset.yml?")
        elif not a:
            print("  !! attack window is empty: raise --settle or check the clock offset")


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--api", default="http://localhost:8080")
    ap.add_argument("--username", required=True)
    ap.add_argument("--password", required=True)
    ap.add_argument("--runs", type=int, default=10, help="runs per scenario")
    ap.add_argument("--scenarios", default="flashloan,oracle")
    ap.add_argument("--chain-dir", default=str(ROOT.parent / "blockchain-env"))
    ap.add_argument("--hardhat-cmd", default="npx hardhat run {script}")
    ap.add_argument("--dump", default=str(ROOT / "data" / "runtime" / "features.jsonl"))
    ap.add_argument("--labels", default=str(ROOT / "data" / "runtime_labels.csv"))
    ap.add_argument("--benign-rounds", type=int, default=20)
    ap.add_argument("--benign-delay-ms", type=int, default=800)
    ap.add_argument("--poll-wait", type=float, default=4.0, help="seconds after registering before traffic starts")
    ap.add_argument("--settle", type=float, default=6.0, help="seconds to let the monitor catch up (poll is ~2 s)")
    ap.add_argument("--oracle-threshold", type=float, default=5.0)
    ap.add_argument("--build", action="store_true", help="afterwards write data/dataset_runtime.csv")
    a = ap.parse_args()

    c = Collector(a)
    c.login()
    c.calibrate_clock()
    stamp = datetime.now(timezone.utc).strftime("%m%d%H%M")
    new = not Path(a.labels).exists()
    Path(a.labels).parent.mkdir(parents=True, exist_ok=True)
    with open(a.labels, "a", newline="") as fh:
        w = csv.DictWriter(fh, fieldnames=["contract", "start", "end", "label", "attack_class", "group", "source"])
        if new:
            w.writeheader()
        for scen in [s.strip() for s in a.scenarios.split(",") if s.strip()]:
            for i in range(1, a.runs + 1):
                w.writerows(c.run_one(scen, i, stamp))
                fh.flush()
                time.sleep(2)
    print(f"\nlabels written to {a.labels}")
    if a.build:
        subprocess.run([sys.executable, str(ROOT / "build_dataset.py"), "--dump", a.dump, "--labels", a.labels,
                        "--out", str(ROOT / "data" / "dataset_runtime.csv")], cwd=ROOT, check=True)


if __name__ == "__main__":
    main()
