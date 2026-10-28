#!/usr/bin/env python
"""Build data/dataset.csv: 20 FeatureVector columns + label, attack_class, group, source.

Three ways to get rows (combine them with repeated runs and --append):

  1. --dump FILE --labels FILE   Join the backend's feature dump (JSONL written when the backend runs
                                 with PRISM_FEATURE_DUMP_PATH=...) with a labels file. This is the
                                 main path for RUNTIME rows: run a Hardhat replay, the dump holds the
                                 vectors the production code built, labels.csv says which time
                                 windows were attacks. labels.csv columns:
                                   contract,start,end,label,attack_class,group,source
                                 (start/end ISO-8601 UTC; a dump line is labelled when
                                  start <= ts < end and its contract name matches)

  2. --static-manifest FILE      For STATIC rows from source code: each manifest row is scanned via
                                 the running backend (POST /api/scan) and the static features are read
                                 back from GET /api/contracts/{id}/features, i.e. the production
                                 feature code, not a Python re-implementation. Log in with
                                 --username/--password (a Developer account). Each scanned contract is
                                 deleted again afterwards (--keep to retain). Manifest columns:
                                   path,label,attack_class,group,source   (extra columns are ignored)
                                 Use unique file names (the backend names the contract after the file).
                                 TIP: start the analyzer with GEMINI_MAX_FINDINGS=0 so scans do not call
                                 Gemini for ~200 files (slow, burns quota; the features do not use it).

  3. --synthetic N               Fake rows for smoke-testing the pipeline ONLY (see synthetic.py).
"""
import argparse
import hashlib
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd

from prism_ml.schema import ATTACK_CLASSES, BENIGN, FEATURES, META_COLUMNS, NEUTRAL_RUNTIME


def _parse_ts(s: str) -> datetime:
    return datetime.fromisoformat(s.replace("Z", "+00:00")).astimezone(timezone.utc)


def rows_from_dump(dump: Path, labels: Path) -> pd.DataFrame:
    lab = pd.read_csv(labels)
    lab["start"] = lab["start"].map(_parse_ts)
    lab["end"] = lab["end"].map(_parse_ts)
    out = []
    for line in dump.read_text().splitlines():
        if not line.strip():
            continue
        rec = json.loads(line)
        ts = _parse_ts(rec["ts"])
        hit = lab[(lab["contract"] == rec["contract"]) & (lab["start"] <= ts) & (ts < lab["end"])]
        if hit.empty:
            continue  # unlabelled lines are dropped on purpose; never guess a label
        h = hit.iloc[0]
        out.append({**{k: rec[k] for k in FEATURES}, "label": int(h["label"]),
                    "attack_class": h["attack_class"], "group": h["group"], "source": h["source"]})
    return pd.DataFrame(out, columns=FEATURES + META_COLUMNS)


def rows_from_static_manifest(manifest: Path, api: str, token: str, username: str, password: str,
                              keep: bool, out_failed: Path) -> pd.DataFrame:
    import requests
    if not token:
        r = requests.post(f"{api}/api/auth/login", json={"identifier": username, "password": password}, timeout=30)
        r.raise_for_status()
        token = r.json()["token"]
    hdr = {"Authorization": f"Bearer {token}"}
    man = pd.read_csv(manifest)
    out, failed = [], []
    for i, m in man.iterrows():
        src = Path(m["path"])
        name = src.stem
        cid = None
        try:
            r = requests.post(f"{api}/api/scan", headers=hdr, timeout=600,
                              json={"sourceCode": src.read_text(errors="ignore"), "fileName": src.name})
            r.raise_for_status()
            lst = requests.get(f"{api}/api/contracts", headers=hdr, timeout=30,
                               params={"search": name, "pageSize": 50}).json()["items"]
            cid = next(c["id"] for c in lst if c["name"].lower() == name.lower())
            fv = requests.get(f"{api}/api/contracts/{cid}/features", headers=hdr, timeout=30)
            fv.raise_for_status()
            fv = fv.json()
            row = {k: fv[k] for k in FEATURES}
            row.update(NEUTRAL_RUNTIME)  # static-only row: runtime side neutral, exactly like a fresh scan
            row.update(label=int(m["label"]), attack_class=m["attack_class"], group=m["group"], source=m["source"])
            out.append(row)
        except Exception as e:  # noqa: BLE001 - record and continue; one bad file must not stop 200
            failed.append({"path": m["path"], "error": str(e)[:200]})
        finally:
            if cid and not keep:  # do not leave 200 dataset contracts in the Registry
                try:
                    requests.delete(f"{api}/api/contracts/{cid}", headers=hdr, timeout=30)
                except Exception:  # noqa: BLE001
                    pass
        if (i + 1) % 10 == 0 or i + 1 == len(man):
            print(f"  {i + 1}/{len(man)} scanned, {len(failed)} failed")
    if failed:
        pd.DataFrame(failed).to_csv(out_failed, index=False)
        print(f"failures written to {out_failed}")
    return pd.DataFrame(out, columns=FEATURES + META_COLUMNS)


def validate(df: pd.DataFrame) -> None:
    missing = [c for c in FEATURES + META_COLUMNS if c not in df.columns]
    assert not missing, f"missing columns: {missing}"
    assert not df[FEATURES].isna().any().any(), "NaN in feature columns"
    assert set(df["label"].unique()) <= {0, 1}, "label must be 0/1"
    bad = set(df["attack_class"].unique()) - set(ATTACK_CLASSES) - {BENIGN}
    assert not bad, f"unknown attack_class values: {bad}"
    assert not ((df["label"] == 1) & (df["attack_class"] == BENIGN)).any(), "positive rows need an attack_class"
    assert not ((df["label"] == 0) & (df["attack_class"] != BENIGN)).any(), "label 0 rows must use attack_class=benign"
    assert df["group"].nunique() >= 10, "need >= 10 distinct groups (protocols/incidents) for grouped CV"


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--dump"); ap.add_argument("--labels")
    ap.add_argument("--static-manifest"); ap.add_argument("--api", default="http://localhost:8080")
    ap.add_argument("--token", default="", help="JWT; or give --username/--password and the script logs in")
    ap.add_argument("--username", default=""); ap.add_argument("--password", default="")
    ap.add_argument("--keep", action="store_true", help="do not delete scanned contracts from the Registry afterwards")
    ap.add_argument("--synthetic", type=int, help="number of fake groups (smoke test only)")
    ap.add_argument("--out", default="data/dataset.csv")
    ap.add_argument("--append", action="store_true", help="add to an existing --out instead of replacing")
    a = ap.parse_args()

    parts = []
    if a.dump:
        parts.append(rows_from_dump(Path(a.dump), Path(a.labels)))
    if a.static_manifest:
        parts.append(rows_from_static_manifest(Path(a.static_manifest), a.api, a.token, a.username, a.password,
                                              a.keep, Path("data/static_scan_failures.csv")))
    if a.synthetic:
        from prism_ml.synthetic import make_synthetic
        parts.append(make_synthetic(a.synthetic))
    if not parts:
        sys.exit("nothing to do: pass --dump/--labels, --static-manifest or --synthetic")

    df = pd.concat(parts, ignore_index=True)
    out = Path(a.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    if a.append and out.exists():
        df = pd.concat([pd.read_csv(out), df], ignore_index=True)
    validate(df)
    df.to_csv(out, index=False)
    meta = {"rows": len(df), "positives": int(df["label"].sum()), "groups": int(df["group"].nunique()),
            "sources": df["source"].value_counts().to_dict(),
            "attack_class_counts": df[df["label"] == 1]["attack_class"].value_counts().to_dict(),
            "sha256": hashlib.sha256(out.read_bytes()).hexdigest(),
            "built_at": datetime.now(timezone.utc).isoformat()}
    out.with_suffix(".meta.json").write_text(json.dumps(meta, indent=2))
    print(json.dumps(meta, indent=2))


if __name__ == "__main__":
    main()
