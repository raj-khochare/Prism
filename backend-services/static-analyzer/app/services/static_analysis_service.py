from sqlalchemy.orm import Session

from app.models.static_analysis import StaticAnalysis
from app.models.static_finding import StaticFinding
from app.models.finding_analysis import FindingAnalysis

from app.models.exploit_verification import ExploitVerification


def create_static_analysis(
    db: Session,
    contract_id,
    source_hash: str,
    source_file: str,
    analyzer_version: str,
    analysis_status: str,
    overall_risk_score: int,
):
    analysis = StaticAnalysis(
        contract_id=contract_id,
        source_hash=source_hash,
        source_file=source_file,
        analyzer_version=analyzer_version,
        analysis_status=analysis_status,
        overall_risk_score=overall_risk_score,
    )

    db.add(analysis)
    db.flush()

    return analysis


def calculate_finding_risk_score(severity: str) -> int:
    scores = {
        "Critical": 40,
        "High": 25,
        "Medium": 15,
        "Low": 5,
        "Informational": 0,
    }

    return scores.get(severity, 0)

def create_static_finding(
    db: Session,
    analysis_id,
    contract_id,
    finding,
    severity: str,
    risk_score: int,
):
    static_finding = StaticFinding(
        analysis_id=analysis_id,
        contract_id=contract_id,
        detector_id=finding.detector_id,
        vulnerability_family=finding.vulnerability_family,
        severity=severity,
        risk_score=calculate_finding_risk_score(severity),
        confidence=_confidence_to_float(finding.confidence),
        source_file=finding.source_file or "",
        function_name=finding.function,
        line_start=finding.line_start,
        line_end=finding.line_end,
        source_snippet=finding.source_snippet,
        vulnerability_features=finding.vulnerability_features,
    )

    db.add(static_finding)
    db.flush()

    return static_finding


def create_finding_analysis(
    db: Session,
    finding_id,
    gemini_analysis: dict,
):
    analysis = FindingAnalysis(
        finding_id=finding_id,
        model_name="gemini",
        description=gemini_analysis.get(
            "explanation",
            gemini_analysis.get(
                "error",
                "Gemini analysis unavailable",
            ),
        ),
        impact=gemini_analysis.get(
            "impact",
            "",
        ),
        attack_scenario=gemini_analysis.get(
            "attack_scenario",
            "",
        ),
        remediation=gemini_analysis.get(
            "recommendation",
            "",
        ),
        validation=(
            gemini_analysis.get("confidence")
            if gemini_analysis.get("is_valid") is not None
            else None
        ),
        raw_response=gemini_analysis,
    )

    db.add(analysis)
    

    return analysis


def _confidence_to_float(confidence: str) -> float:
    mapping = {
        "High": 0.9,
        "Medium": 0.6,
        "Low": 0.3,
    }

    return mapping.get(confidence, 0.0)

def create_exploit_verification(
    db: Session,
    finding_id,
    result: dict,
):
    evidence_keys = (
        "victim_balance_before_eth",
        "victim_balance_after_eth",
        "attacker_balance_before_eth",
        "attacker_balance_after_eth",
    )

    evidence = {
        key: result[key]
        for key in evidence_keys
        if key in result
    }

    verification = ExploitVerification(
        finding_id=finding_id,
        vulnerability_family=result.get(
            "vulnerability_family",
            "unknown",
        ),
        detector_id=result.get(
            "detector_id",
            "unknown",
        ),
        status=result.get(
            "status",
            "error",
        ),
        exploit_confirmed=bool(
            result.get("exploit_confirmed", False)
        ),
        generated_poc=result.get("generated_poc"),
        execution_output=result.get("output"),
        execution_error=(
            result.get("message")
            if result.get("status") == "error"
            else None
        ),
        evidence=evidence or None,
    )

    db.add(verification)
    db.flush()

    return verification