"""Pick a solc version that satisfies a contract's `pragma solidity` line.

Slither (via solc-select) needs the *exact* compiler installed. The original
service hard-coded 0.8.20, so any contract with a different pragma failed.
"""
import os
import re
import shutil
import subprocess

# Versions pre-installed in the Docker image (see Dockerfile).
SUPPORTED_VERSIONS = ["0.8.26", "0.8.24", "0.8.20", "0.7.6", "0.6.12", "0.5.17", "0.4.26"]
DEFAULT_VERSION = os.getenv("DEFAULT_SOLC_VERSION", "0.8.20")

_PRAGMA_RE = re.compile(r"pragma\s+solidity\s+([^;]+);")
_COMPARATOR_RE = re.compile(r"(\^|~|>=|<=|>|<|=)?\s*v?(\d+)\.(\d+)(?:\.(\d+))?")


def _v(version: str) -> tuple[int, int, int]:
    major, minor, patch = (version.split(".") + ["0", "0"])[:3]
    return int(major), int(minor), int(patch)


def _satisfies(version: tuple[int, int, int], spec: str) -> bool:
    spec = spec.split("||")[0]  # keep it simple: first alternative only
    for op, major, minor, patch in _COMPARATOR_RE.findall(spec):
        target = (int(major), int(minor), int(patch or 0))
        if op in ("^", "~"):
            # Solidity semantics: ^0.8.2 and ~0.8.2 both mean >=0.8.2 <0.9.0
            upper = (target[0], target[1] + 1, 0)
            if not (target <= version < upper):
                return False
        elif op == ">=" and not version >= target:
            return False
        elif op == "<=" and not version <= target:
            return False
        elif op == ">" and not version > target:
            return False
        elif op == "<" and not version < target:
            return False
        elif op in ("=", "") and version != target:
            return False
    return True


def pick_solc_version(source: str) -> str:
    match = _PRAGMA_RE.search(source)
    if not match:
        return DEFAULT_VERSION
    spec = match.group(1).strip()
    candidates = [v for v in SUPPORTED_VERSIONS if _satisfies(_v(v), spec)]
    if not candidates:
        # An exact pragma such as `pragma solidity 0.4.25;` matches no pre-installed compiler, and
        # falling back to 0.8.20 can never compile 0.4 code. Use the newest installed compiler of
        # the same major.minor series; relax_pragma() makes the file acceptable to it.
        first = _COMPARATOR_RE.search(spec)
        if first:
            series = (int(first.group(2)), int(first.group(3)))
            same = [v for v in SUPPORTED_VERSIONS if _v(v)[:2] == series]
            if same:
                return same[0]
        return DEFAULT_VERSION
    return DEFAULT_VERSION if DEFAULT_VERSION in candidates else candidates[0]


def relax_pragma(source: str, version: str) -> str:
    """If the file's pragma rejects `version` (exact pins like `0.4.25`), widen it to `^major.minor.0`
    in the copy handed to the compiler. The text analysed elsewhere (e.g. the floating-pragma
    feature) still uses the original source."""
    match = _PRAGMA_RE.search(source)
    if not match or _satisfies(_v(version), match.group(1).strip()):
        return source
    major, minor, _ = _v(version)
    return source[: match.start()] + f"pragma solidity ^{major}.{minor}.0;" + source[match.end():]


def ensure_installed(version: str) -> None:
    """Best-effort install. Never raises: Slither will report a clear error."""
    if shutil.which("solc-select") is None:
        return
    try:
        installed = subprocess.run(
            ["solc-select", "versions"], capture_output=True, text=True, timeout=20
        ).stdout
        if version not in installed:
            subprocess.run(["solc-select", "install", version], capture_output=True, timeout=120)
    except Exception:
        pass
