SEVERITY_WEIGHTS = {
    "Critical": 40,
    "High": 25,
    "Medium": 15,
    "Low": 5,
    "Informational": 0,
}


def calculate_risk_score(findings) -> int:
    raw_score = sum(
        SEVERITY_WEIGHTS.get(finding.impact, 0)
        for finding in findings
    )

    return min(raw_score, 100)