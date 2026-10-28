#!/usr/bin/env python
"""Collect the STATIC dataset: labelled vulnerable contracts (SmartBugs Curated) + clean contracts
(flattened from audited npm packages), and write ml/data/static_manifest.csv.

  python collect/collect_static.py            # needs git, node/npm and internet
  python collect/collect_static.py --offline  # reuse an existing ml/data/_cache

Labelling rules (write these in the report):
  * Positives: SmartBugs files whose single category maps to one of OUR four static classes
    reentrancy / access_control / arithmetic->integer_overflow / unchecked_low_level_calls->unchecked_call.
    The other SmartBugs categories (bad_randomness, denial_of_service, front_running, time_manipulation,
    short_addresses, other) are NOT labelled benign - they are vulnerable - they are simply out of scope and
    excluded from the dataset entirely.
  * Negatives: contracts from widely used, audited packages. NOT guaranteed bug-free; they are "no known
    vulnerability" examples. Old OpenZeppelin 1.x (Solidity 0.4) is included so negatives are the same
    language era as SmartBugs (otherwise the model could learn "0.4 syntax = vulnerable").
  * group = cluster of near-duplicate files (token-shingle Jaccard >= 0.8), so near-copies never straddle
    the train/test split.
"""
import argparse
import csv
import json
import re
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent          # ml/
DATA = ROOT / "data"
CACHE = DATA / "_cache"
OUT = DATA / "static"

CLASS_MAP = {"reentrancy": "reentrancy", "access_control": "access_control",
             "arithmetic": "integer_overflow", "unchecked_low_level_calls": "unchecked_call"}

IMPORT_RE = re.compile(r'^\s*import\s+(?:[^"\';]*?\s+from\s+)?["\']([^"\']+)["\']\s*;[ \t]*\r?$', re.M)
PRAGMA_RE = re.compile(r'^\s*pragma\s+solidity\s+[^;]+;[ \t]*\r?$', re.M)
SPDX_RE = re.compile(r'^\s*//\s*SPDX-License-Identifier:.*$', re.M)

# package -> (npm spec, license, entry-file selector)
NEG_PACKAGES = {
    "oz1": ("openzeppelin-solidity@1.12.0", "MIT"),
    "oz4": ("@openzeppelin/contracts@4.9.6", "MIT"),
    "solmate": ("solmate@6.2.0", "AGPL-3.0/MIT"),
    "uniswap": ("@uniswap/v2-core@1.0.1", "GPL-3.0"),
    "weth": ("canonical-weth@1.4.0", "GPL-3.0"),
}
OZ4_ENTRIES = ["token/ERC20/ERC20.sol", "token/ERC20/extensions/ERC4626.sol", "token/ERC20/extensions/ERC20Permit.sol",
               "token/ERC20/extensions/ERC20Votes.sol", "token/ERC20/extensions/ERC20FlashMint.sol",
               "security/ReentrancyGuard.sol", "security/Pausable.sol", "access/Ownable.sol",
               "access/AccessControl.sol", "governance/TimelockController.sol", "finance/VestingWallet.sol",
               "finance/PaymentSplitter.sol", "token/ERC721/ERC721.sol", "token/ERC1155/ERC1155.sol",
               "utils/cryptography/MerkleProof.sol", "utils/escrow/Escrow.sol"]
SOLMATE_ENTRIES = ["tokens/ERC20.sol", "tokens/ERC4626.sol", "tokens/WETH.sol", "tokens/ERC721.sol",
                   "auth/Owned.sol", "utils/ReentrancyGuard.sol", "utils/SafeTransferLib.sol", "tokens/ERC1155.sol"]
UNISWAP_ENTRIES = ["UniswapV2ERC20.sol", "UniswapV2Pair.sol", "UniswapV2Factory.sol"]


def run(cmd, cwd=None):
    r = subprocess.run(cmd, cwd=cwd, capture_output=True, text=True, shell=(sys.platform == "win32"))
    if r.returncode != 0:
        sys.exit(f"command failed: {' '.join(cmd)}\n{r.stderr[-800:]}")
    return r.stdout


def fetch():
    CACHE.mkdir(parents=True, exist_ok=True)
    if not (CACHE / "smartbugs-curated").exists():
        run(["git", "clone", "--depth", "1", "https://github.com/smartbugs/smartbugs-curated.git",
             str(CACHE / "smartbugs-curated")])
    nm = CACHE / "npm"
    nm.mkdir(exist_ok=True)
    if not (nm / "package.json").exists():
        (nm / "package.json").write_text('{"name":"neg","version":"1.0.0"}')
    for _, (spec, _) in NEG_PACKAGES.items():
        run(["npm", "install", "--no-audit", "--no-fund", "--ignore-scripts", spec], cwd=str(nm))


def flatten(entry: Path, remap: dict):
    emitted, parts = set(), []
    root_pragma = None
    own = ""

    def resolve(cur: Path, target: str) -> Path | None:
        if target.startswith("."):
            return (cur.parent / target).resolve()
        for prefix, base in remap.items():
            if target.startswith(prefix):
                return (base / target[len(prefix):]).resolve()
        return None

    def visit(f: Path):
        nonlocal root_pragma, own
        f = f.resolve()
        if f in emitted:
            return
        emitted.add(f)
        text = f.read_text(errors="ignore")
        if root_pragma is None:
            m = PRAGMA_RE.search(text)
            root_pragma = m.group(0).strip() if m else None
        for imp in IMPORT_RE.findall(text):
            dep = resolve(f, imp)
            if dep is None or not dep.exists():
                raise FileNotFoundError(f"{f.name}: cannot resolve import {imp}")
            visit(dep)
        body = IMPORT_RE.sub("", text)
        body = PRAGMA_RE.sub("", body)
        body = SPDX_RE.sub("", body)
        if f == entry.resolve():
            own = body.strip()  # the contract's OWN code, used for near-duplicate grouping
        parts.append(f"// ---- {f.name} ----\n{body.strip()}\n")

    visit(entry)
    head = (root_pragma or "pragma solidity ^0.8.0;") + "\n"
    return head + "\n".join(parts), own


def tokens(src: str) -> set:
    src = re.sub(r"//.*|/\*.*?\*/", " ", src, flags=re.S)
    toks = re.findall(r"[A-Za-z_]\w*|\d+|[^\sA-Za-z_\d]", src)
    return {" ".join(toks[i:i + 5]) for i in range(max(len(toks) - 4, 1))}


def cluster(paths, sources, thr=0.8):
    sets = {p: tokens(sources[p]) for p in paths}
    parent = {p: p for p in paths}

    def find(x):
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x
    for i, a in enumerate(paths):
        for b in paths[i + 1:]:
            sa, sb = sets[a], sets[b]
            if len(sa) < 25 or len(sb) < 25:
                continue  # tiny files share shingles by chance; never merge on that evidence
            if len(sa & sb) / len(sa | sb) >= thr:
                parent[find(a)] = find(b)
    ids, out = {}, {}
    for p in paths:
        out[p] = ids.setdefault(find(p), f"g{len(ids):03d}")
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--offline", action="store_true")
    a = ap.parse_args()
    if not a.offline:
        fetch()
    if OUT.exists():
        shutil.rmtree(OUT)
    OUT.mkdir(parents=True)
    rows, sources, excluded = [], {}, []

    # ---- positives: SmartBugs Curated
    sb = CACHE / "smartbugs-curated"
    for rec in json.loads((sb / "vulnerabilities.json").read_text()):
        cats = {v["category"] for v in rec["vulnerabilities"]}
        cat = next(iter(cats)) if len(cats) == 1 else None
        if cat not in CLASS_MAP:
            excluded.append((rec["path"], ",".join(sorted(cats)), "category out of scope"))
            continue
        src = (sb / rec["path"]).read_text(errors="ignore")
        name = "sb_" + cat + "_" + re.sub(r"[^A-Za-z0-9_.-]", "_", rec["name"])
        rel = f"static/smartbugs/{name}"
        (OUT / "smartbugs").mkdir(exist_ok=True)
        (OUT / "smartbugs" / name).write_text(src)
        lines = sorted({ln for v in rec["vulnerabilities"] for ln in v["lines"]})
        rows.append({"path": f"data/{rel}", "label": 1, "attack_class": CLASS_MAP[cat], "source": "smartbugs-curated",
                     "origin": rec.get("source", ""), "smartbugs_category": cat,
                     "vuln_lines": " ".join(map(str, lines)), "license": "see origin / SmartBugs LICENSE"})
        sources[f"data/{rel}"] = src

    # ---- negatives: flattened audited packages
    nm = CACHE / "npm" / "node_modules"
    negs = []  # (tag, entry path, remap)
    oz1 = nm / "openzeppelin-solidity" / "contracts"
    skip = ("mocks", "examples", "Migrations", "mock")
    for f in sorted(oz1.rglob("*.sol")):
        if any(s in f.parts for s in skip) or "Mock" in f.name or f.name.startswith("I") and f.stem[1:2].isupper():
            continue
        negs.append(("oz1", f, {}))
    oz4 = nm / "@openzeppelin" / "contracts"
    for e in OZ4_ENTRIES:
        negs.append(("oz4", oz4 / e, {"@openzeppelin/contracts/": oz4}))
    for e in SOLMATE_ENTRIES:
        negs.append(("solmate", nm / "solmate" / "src" / e, {}))
    for e in UNISWAP_ENTRIES:
        negs.append(("uniswap", nm / "@uniswap" / "v2-core" / "contracts" / e, {}))
    negs.append(("weth", nm / "canonical-weth" / "contracts" / "WETH9.sol", {}))

    for tag, f, remap in negs:
        if not f.exists():
            excluded.append((str(f), "", "entry file not found in package"))
            continue
        try:
            flat, own = flatten(f, remap)
        except Exception as e:  # keep going; unresolved imports are reported
            excluded.append((str(f), "", f"flatten failed: {e}"))
            continue
        if not re.search(r"\b(contract|library)\s+\w+", flat):
            continue
        name = f"neg_{tag}_{f.stem}.sol"
        (OUT / "negatives").mkdir(exist_ok=True)
        (OUT / "negatives" / name).write_text(f"// source: {NEG_PACKAGES[tag][0]} / {f.name} (flattened by collect_static.py)\n{flat}")
        rel = f"data/static/negatives/{name}"
        rows.append({"path": rel, "label": 0, "attack_class": "benign", "source": f"npm:{NEG_PACKAGES[tag][0]}",
                     "origin": f"https://www.npmjs.com/package/{NEG_PACKAGES[tag][0].rsplit('@', 1)[0]}",
                     "smartbugs_category": "", "vuln_lines": "", "license": NEG_PACKAGES[tag][1]})
        sources[rel] = own or flat  # grouping looks at the entry file's own code, not shared dependencies

    groups = cluster([r["path"] for r in rows], sources)
    for r in rows:
        r["group"] = groups[r["path"]]
    cols = ["path", "label", "attack_class", "group", "source", "origin", "smartbugs_category", "vuln_lines", "license"]
    with open(DATA / "static_manifest.csv", "w", newline="") as fh:
        w = csv.DictWriter(fh, fieldnames=cols)
        w.writeheader()
        w.writerows(rows)
    with open(DATA / "excluded.csv", "w", newline="") as fh:
        csv.writer(fh).writerows([("path", "categories", "reason")] + excluded)
    pos = sum(r["label"] for r in rows)
    print(f"{len(rows)} files: {pos} positives, {len(rows) - pos} negatives, {len(set(groups.values()))} groups, "
          f"{len(excluded)} excluded (see data/excluded.csv)")


if __name__ == "__main__":
    main()
