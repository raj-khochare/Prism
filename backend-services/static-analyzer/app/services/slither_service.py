import json
import subprocess
from pathlib import Path


def run_slither(contract_path: str) -> dict:
    """
    Run Slither against a Solidity contract and return
    the parsed JSON output.
    """

    output_file = Path("slither-output.json")

    command = [
        "slither",
        contract_path,
        "--json",
        str(output_file),
    ]

    result = subprocess.run(
        command,
        capture_output=True,
        text=True,
    )

    if not output_file.exists():
        raise RuntimeError(
            f"Slither failed to produce output.\n"
            f"STDOUT:\n{result.stdout}\n"
            f"STDERR:\n{result.stderr}"
        )

    with open(output_file, "r") as file:
        data = json.load(file)

    return data