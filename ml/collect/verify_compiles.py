#!/usr/bin/env python
"""Run the analyzer's own Slither wrapper over every manifest file and keep only those that compile.

Uses backend-services/static-analyzer/app (same Slither + solc selection as the Docker image), so
"compiles here" == "the backend can scan it". Resumable: re-run to continue.
Needs: pip install -r backend-services/static-analyzer/requirements.txt and the solc versions installed
(solc-select install 0.4.26 0.5.17 0.6.12 0.7.6 0.8.20 0.8.24 0.8.26, or run it inside the analyzer container).

  python collect/verify_compiles.py [--limit 40] [--workers 4]
Outputs: data/compile_report.csv, data/static_manifest_verified.csv
"""
import argparse
import csv
import sys
import time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT.parent / "backend-services" / "static-analyzer"))
from app.services.slither_service import run_slither  # noqa: E402

REPORT = ROOT / "data" / "compile_report.csv"


def check(path: str):
    t0 = time.time()
    try:
        data = run_slither(str(ROOT / path))
        dets = (data.get("results") or {}).get("detectors") or []
        return path, "ok", len(dets), round(time.time() - t0, 1), ""
    except Exception as e:  # noqa: BLE001 - we want every failure reason recorded
        return path, "fail", 0, round(time.time() - t0, 1), str(e).replace("\n", " ")[:300]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=0)
    ap.add_argument("--workers", type=int, default=4)
    a = ap.parse_args()
    man = pd.read_csv(ROOT / "data" / "static_manifest.csv")
    done = set(pd.read_csv(REPORT)["path"]) if REPORT.exists() else set()
    todo = [p for p in man["path"] if p not in done]
    if a.limit:
        todo = todo[: a.limit]
    new = not REPORT.exists()
    with open(REPORT, "a", newline="") as fh, ThreadPoolExecutor(a.workers) as pool:
        w = csv.writer(fh)
        if new:
            w.writerow(["path", "status", "detector_hits", "seconds", "error"])
        for row in pool.map(check, todo):
            w.writerow(row)
            fh.flush()
    rep = pd.read_csv(REPORT)
    ok = man.merge(rep[rep.status == "ok"][["path", "detector_hits"]], on="path")
    ok.to_csv(ROOT / "data" / "static_manifest_verified.csv", index=False)
    print(f"checked {len(rep)}/{len(man)}: {int((rep.status == 'ok').sum())} compile, {int((rep.status == 'fail').sum())} fail")


if __name__ == "__main__":
    main()
