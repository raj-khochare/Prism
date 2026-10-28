import hashlib
import json
from pathlib import Path

from app.schemas.finding import Finding


def _get_source_snippet(
    source_file: str | None,
    line_start: int | None,
    line_end: int | None,
) -> str | None:
    if not source_file or not line_start or not line_end:
        return None

    path = Path(source_file)

    if not path.exists():
        return None

    lines = path.read_text(errors="ignore").splitlines()

    start = max(line_start - 1, 0)
    end = min(line_end, len(lines))

    return "\n".join(lines[start:end])


def _get_vulnerability_family(detector_id: str) -> str:
    """Map a Slither detector id to the PRISM vulnerability family.

    Order matters: arithmetic is checked before "unchecked" so that
    `unchecked-arithmetic` is not mistaken for `unchecked-lowlevel`.
    """
    detector = detector_id.lower()

    if "reentrancy" in detector:
        return "reentrancy"

    if "tx-origin" in detector or "txorigin" in detector:
        return "tx_origin"

    if "delegatecall" in detector:
        return "delegatecall"

    if "overflow" in detector or "underflow" in detector or "arithmetic" in detector:
        return "integer_overflow"

    if "unchecked" in detector:
        return "unchecked_call"

    if "arbitrary-send" in detector or "arbitrary_send" in detector:
        return "arbitrary_send"

    if "weak-prng" in detector or "randomness" in detector:
        return "weak_randomness"

    if (
        "access-control" in detector
        or "suicidal" in detector
        or "unprotected" in detector
    ):
        return "access_control"

    return "unknown"


def _get_vulnerability_features(
    detector_id: str,
    source_snippet: str | None,
) -> dict:
    detector = detector_id.lower()
    source = (source_snippet or "").lower()

    return {
        "external_call": (
            "reentrancy" in detector
            or "unchecked" in detector
            or "delegatecall" in detector
            or ".call(" in source
            or ".delegatecall(" in source
            or ".send(" in source
            or ".transfer(" in source
        ),
        "state_update_after_call": (
            "reentrancy" in detector
        ),
        "value_transfer": (
            "reentrancy-eth" in detector
            or ".call{" in source
            or ".transfer(" in source
            or ".send(" in source
        ),
        "uses_msg_sender": "msg.sender" in source,
        "uses_tx_origin": (
            "tx-origin" in detector
            or "tx.origin" in source
        ),
        "delegatecall": (
            "delegatecall" in detector
            or ".delegatecall(" in source
        ),
        "unchecked_external_call": (
            "unchecked" in detector
        ),
    }


def _generate_finding_id(
    detector_id: str,
    source_file: str | None,
    line_start: int | None,
    line_end: int | None,
    function: str | None,
) -> str:
    identity = {
        "detector_id": detector_id,
        "source_file": source_file,
        "line_start": line_start,
        "line_end": line_end,
        "function": function,
    }

    raw = json.dumps(
        identity,
        sort_keys=True,
    ).encode()

    return hashlib.sha256(raw).hexdigest()[:16]


def process_findings(
    slither_data: dict,
    contract_path: str,
    source_filename: str,
) -> list[Finding]:

    findings = []

    detectors = slither_data.get("results", {}).get("detectors", [])

    for detector in detectors:
        detector_id = detector.get("check", "unknown")

        elements = detector.get("elements", [])

        function = None
        contract = None
        source_file = None
        line_start = None
        line_end = None

        for element in elements:
            source_mapping = element.get("source_mapping", {})
            lines = source_mapping.get("lines", [])

            if not lines:
                continue

            source_file = source_filename

            if element.get("type") == "function":
                function = element.get("name")

                parent = element.get(
                    "type_specific_fields",
                    {},
                ).get("parent", {})

                if parent.get("type") == "contract":
                    contract = parent.get("name")

                line_start = min(lines)
                line_end = max(lines)

                break

            if element.get("type") == "node":
                parent = (
                    element.get("type_specific_fields", {})
                    .get("parent", {})
                )

                if parent.get("type") == "function":
                    function = parent.get("name")

                    contract_parent = (
                        parent.get("type_specific_fields", {})
                        .get("parent", {})
                    )

                    if contract_parent.get("type") == "contract":
                        contract = contract_parent.get("name")

                    line_start = min(lines)
                    line_end = max(lines)

        snippet = _get_source_snippet(
            contract_path,
            line_start,
            line_end,
        )

        vulnerability_family = _get_vulnerability_family(
            detector_id
        )

        vulnerability_features = _get_vulnerability_features(
            detector_id,
            snippet,
        )

        finding_id = _generate_finding_id(
            detector_id=detector_id,
            source_file=source_file,
            line_start=line_start,
            line_end=line_end,
            function=function,
        )

        findings.append(
            Finding(
                finding_id=finding_id,
                detector_id=detector_id,
                vulnerability_family=vulnerability_family,
                title=detector_id,
                impact=detector.get("impact", "Unknown"),
                confidence=detector.get("confidence", "Unknown"),
                contract=contract,
                function=function,
                source_file=source_file,
                line_start=line_start,
                line_end=line_end,
                source_snippet=snippet,
                vulnerability_features=vulnerability_features,
                description=detector.get("description", ""),
            )
        )

    return findings