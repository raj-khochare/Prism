import json
import os
import subprocess
import tempfile
from pathlib import Path

from app.services.solc_selector import ensure_installed, pick_solc_version, relax_pragma

SLITHER_TIMEOUT_SECONDS = int(os.getenv("SLITHER_TIMEOUT_SECONDS", "120"))


def run_slither(contract_path: str, source: str | None = None) -> dict:
    """Run Slither against a Solidity contract.

    * Picks the solc version from the contract's pragma (SOLC_VERSION env var,
      honoured by solc-select) instead of always using one hard-coded compiler.
    * Excludes informational/optimization detectors: they are pure noise for a
      risk score (naming-convention, solc-version, ...). The floating-pragma
      feature is computed from the source text by the Java backend instead.
    * Each call uses its own temp output path so scans can't leak into each other.
    """
    if source is None:
        source = Path(contract_path).read_text(errors="ignore")

    solc_version = pick_solc_version(source)
    ensure_installed(solc_version)
    env = {**os.environ, "SOLC_VERSION": solc_version}

    with tempfile.TemporaryDirectory() as temp_dir:
        output_path = Path(temp_dir) / "slither-output.json"

        compile_path = contract_path
        relaxed = relax_pragma(source, solc_version)
        if relaxed != source:
            compile_path = str(Path(temp_dir) / "Contract.sol")
            Path(compile_path).write_text(relaxed)

        command = [
            "slither",
            compile_path,
            "--json",
            str(output_path),
            "--exclude-informational",
            "--exclude-optimization",
        ]

        try:
            result = subprocess.run(
                command,
                capture_output=True,
                text=True,
                env=env,
                timeout=SLITHER_TIMEOUT_SECONDS,
            )
        except subprocess.TimeoutExpired as exc:
            raise RuntimeError(
                f"Slither timed out after {SLITHER_TIMEOUT_SECONDS}s (solc {solc_version})."
            ) from exc

        # Slither exits non-zero when it finds issues; the JSON is what matters.
        if not output_path.exists() or output_path.stat().st_size == 0:
            raise RuntimeError(
                f"Slither produced no output (solc {solc_version}).\n"
                f"STDOUT:\n{result.stdout}\nSTDERR:\n{result.stderr}"
            )

        try:
            with output_path.open("r") as file:
                data = json.load(file)
        except json.JSONDecodeError as exc:
            raise RuntimeError(
                "Slither produced invalid JSON output.\n"
                f"STDOUT:\n{result.stdout}\nSTDERR:\n{result.stderr}"
            ) from exc

        if data.get("success") is False:
            raise RuntimeError(
                f"Slither reported a compilation failure (solc {solc_version}): "
                f"{data.get('error')}"
            )
        return data
