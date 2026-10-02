import json
import subprocess
import tempfile
from pathlib import Path


def run_slither(contract_path: str) -> dict:
    """
    Run Slither against a Solidity contract.

    Each invocation uses a unique temporary output path so
    results from previous scans cannot leak into the current scan.
    """

    with tempfile.TemporaryDirectory() as temp_dir:
        output_path = Path(temp_dir) / "slither-output.json"

        command = [
            "slither",
            contract_path,
            "--json",
            str(output_path),
        ]

        result = subprocess.run(
            command,
            capture_output=True,
            text=True,
        )

        # Slither may return a non-zero exit code when findings
        # are detected. The JSON output is what we actually need.
        if not output_path.exists():
            raise RuntimeError(
                "Slither analysis failed to produce output.\n"
                f"STDOUT:\n{result.stdout}\n"
                f"STDERR:\n{result.stderr}"
            )

        if output_path.stat().st_size == 0:
            raise RuntimeError(
                "Slither produced an empty JSON output.\n"
                f"STDOUT:\n{result.stdout}\n"
                f"STDERR:\n{result.stderr}"
            )

        try:
            with output_path.open("r") as file:
                return json.load(file)

        except json.JSONDecodeError as exc:
            raise RuntimeError(
                "Slither produced invalid JSON output.\n"
                f"STDOUT:\n{result.stdout}\n"
                f"STDERR:\n{result.stderr}"
            ) from exc