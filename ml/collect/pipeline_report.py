#!/usr/bin/env python
"""How well does the STATIC pipeline (Slither + custom detectors) actually see each labelled class?

Runs the analyzer pipeline on every verified file (no Gemini) and records the detector ids that
fired. Evidence families per class (report-only mapping; the real model features come from the Java
FeatureExtractionService):
  reentrancy       reentrancy-*
  access_control   prism-missing-access-control, suicidal, arbitrary-send-*, tx-origin, controlled-delegatecall
  integer_overflow prism-integer-overflow-legacy, prism-unchecked-arithmetic
  unchecked_call   unchecked-lowlevel, unchecked-send, unchecked-transfer, unused-return
Outputs data/pipeline_detections.csv and data/STATIC_PIPELINE_REPORT.md. Resumable.

  python collect/pipeline_report.py [--limit N] [--workers 4]
"""
import argparse
import csv
import sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT.parent / "backend-services" / "static-analyzer"))
from app.services.custom_detectors import run_custom_detectors  # noqa: E402
from app.services.finding_processor import process_findings  # noqa: E402
from app.services.slither_service import run_slither  # noqa: E402

OUT = ROOT / "data" / "pipeline_detections.csv"
FAMILIES = {
    "reentrancy": lambda d: d.startswith("reentrancy"),
    "access_control": lambda d: d in {"prism-missing-access-control", "suicidal", "tx-origin", "controlled-delegatecall"}
    or d.startswith("arbitrary-send"),
    "integer_overflow": lambda d: d in {"prism-integer-overflow-legacy", "prism-unchecked-arithmetic"},
    "unchecked_call": lambda d: d in {"unchecked-lowlevel", "unchecked-send", "unchecked-transfer", "unused-return"},
}


def analyse(path: str):
    p = str(ROOT / path)
    src = Path(p).read_text(errors="ignore")
    try:
        f = process_findings(run_slither(p, src), p, Path(p).name) + run_custom_detectors(src, Path(p).name)
        ids = sorted({x.detector_id for x in f})
        return path, "ok", ";".join(ids), sum(x.impact == "High" for x in f), len(f)
    except Exception as e:  # noqa: BLE001
        return path, "fail:" + str(e).replace("\n", " ")[:80], "", 0, 0


def rate(xs):
    return sum(xs) / len(xs) if len(xs) else 0.0


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=0)
    ap.add_argument("--workers", type=int, default=4)
    a = ap.parse_args()
    ver = pd.read_csv(ROOT / "data" / "static_manifest_verified.csv")
    done = set(pd.read_csv(OUT)["path"]) if OUT.exists() else set()
    todo = [p for p in ver["path"] if p not in done]
    if a.limit:
        todo = todo[: a.limit]
    new = not OUT.exists()
    with open(OUT, "a", newline="") as fh, ThreadPoolExecutor(a.workers) as pool:
        w = csv.writer(fh)
        if new:
            w.writerow(["path", "status", "detectors", "high", "total"])
        for r in pool.map(analyse, todo):
            w.writerow(r)
            fh.flush()
    det = pd.read_csv(OUT).fillna("")
    d = ver.merge(det, on="path")
    d = d[d.status == "ok"]
    lines = [f"# Static pipeline vs labels ({len(d)} compiled files)", "",
             "Share of files in which a detector from the class's evidence family fired. "
             "Positives = recall of the static pipeline; negatives = false-positive rate.", "",
             "| Class | Positives | Detected (recall) | Negatives flagged for this family (FP rate) |", "|---|---|---|---|"]
    neg = d[d.label == 0]
    for cls, fam in FAMILIES.items():
        pos = d[d.attack_class == cls]
        hit = [any(fam(x) for x in s.split(";") if x) for s in pos.detectors]
        nh = [any(fam(x) for x in s.split(";") if x) for s in neg.detectors]
        lines.append(f"| {cls} | {len(pos)} | {sum(hit)} ({rate(hit):.0%}) | {sum(nh)}/{len(neg)} ({rate(nh):.0%}) |")
    anyp = rate([bool(s) for s in d[d.label == 1].detectors])
    anyn = rate([bool(s) for s in neg.detectors])
    lines += ["", f"Any detector at all: positives {anyp:.0%}, negatives {anyn:.0%}.", "",
              "A class the pipeline cannot see (low recall) cannot be learned from static features, whatever the model."]
    (ROOT / "data" / "STATIC_PIPELINE_REPORT.md").write_text("\n".join(lines))
    print("\n".join(lines))


if __name__ == "__main__":
    main()
