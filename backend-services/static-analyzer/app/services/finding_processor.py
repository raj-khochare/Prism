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

    lines = path.read_text().splitlines()

    start = max(line_start - 1, 0)
    end = min(line_end, len(lines))

    return "\n".join(lines[start:end])


def process_findings(
    slither_data: dict,
    contract_path: str,
) -> list[Finding]:

    findings = []

    detectors = slither_data.get("results", {}).get("detectors", [])

    for detector in detectors:
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

            source_file = source_mapping.get("filename_short")

            if element.get("type") == "function":
                function = element.get("name")

                parent = element.get(
                    "type_specific_fields", {}
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

        findings.append(
            Finding(
                detector_id=detector.get("check", "unknown"),
                title=detector.get("check", "unknown"),
                impact=detector.get("impact", "Unknown"),
                confidence=detector.get("confidence", "Unknown"),
                contract=contract,
                function=function,
                source_file=source_file,
                line_start=line_start,
                line_end=line_end,
                source_snippet=snippet,
                description=detector.get("description", ""),
            )
        )

    return findings