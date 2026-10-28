import hashlib
import os
import tempfile
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.dependencies import get_db
from app.schemas.exploit import ExploitRequest
from app.schemas.finding import Finding
from app.services.custom_detectors import run_custom_detectors
from app.services.exploit_service import run_exploit_verification
from app.services.finding_processor import process_findings
from app.services.gemini_service import analyze_finding
from app.services.risk_scorer import calculate_risk_score
from app.services.slither_service import run_slither
from app.services.static_analysis_service import (
    create_exploit_verification,
    create_finding_analysis,
    create_static_analysis,
    create_static_finding,
)

router = APIRouter()

MAX_SOURCE_BYTES = int(os.getenv("MAX_SOURCE_BYTES", str(512 * 1024)))
# Gemini is slow (seconds per call). Analysing every finding sequentially made the
# Java client's 60s read timeout fire on any contract with more than a few findings.
MAX_AI_FINDINGS = int(os.getenv("GEMINI_MAX_FINDINGS", "8"))
AI_WORKERS = int(os.getenv("GEMINI_WORKERS", "4"))

_SEVERITY_ORDER = {"High": 0, "Medium": 1, "Low": 2, "Informational": 3}


def _skipped_analysis(impact: str, reason: str) -> dict:
    return {
        "available": False,
        "is_valid": False,
        "confidence": "Unknown",
        "severity": impact,
        "explanation": reason,
        "attack_scenario": "",
        "impact": impact,
        "recommendation": "",
        "fixed_code": "",
        "skipped": True,
    }


def _safe_ai_analysis(finding: Finding) -> dict:
    try:
        raw = analyze_finding(finding)
    except Exception as exc:  # network/quota/model errors must not fail the scan
        return {
            **_skipped_analysis(finding.impact, "Gemini analysis is temporarily unavailable."),
            "skipped": False,
            "error": str(exc),
        }
    if not isinstance(raw, dict):
        raw = {}
    # The DB columns are NOT NULL and Gemini sometimes returns null fields.
    for key in ("explanation", "attack_scenario", "impact", "recommendation", "fixed_code"):
        if raw.get(key) is None:
            raw[key] = ""
    raw.setdefault("available", "error" not in raw)
    return raw


@router.post("/analyze")
def analyze_contract(
    file: UploadFile = File(...),
    # BUG FIX: this used to be a bare `UUID | None = None`, which FastAPI treats as a
    # *query* parameter. The Java backend sends it as a multipart *form* field, so the
    # value was silently dropped and every analysis was stored with contract_id = NULL.
    contract_id: UUID | None = Form(None),
    db: Session = Depends(get_db),
):
    if not file.filename or not file.filename.endswith(".sol"):
        raise HTTPException(status_code=400, detail="Only Solidity (.sol) files are supported")

    content = file.file.read()
    if len(content) > MAX_SOURCE_BYTES:
        raise HTTPException(status_code=413, detail="Source file is too large")
    try:
        source_text = content.decode("utf-8")
    except UnicodeDecodeError:
        raise HTTPException(status_code=400, detail="Source file must be UTF-8 text")

    with tempfile.NamedTemporaryFile(suffix=".sol", delete=False) as temp_file:
        temp_file.write(content)
        contract_path = temp_file.name

    try:
        slither_data = run_slither(contract_path, source_text)

        findings = process_findings(slither_data, contract_path, file.filename)
        findings += run_custom_detectors(source_text, file.filename)

        # Drop exact duplicates (same detector + function + lines).
        seen, unique = set(), []
        for f in findings:
            if f.finding_id in seen:
                continue
            seen.add(f.finding_id)
            unique.append(f)
        findings = unique

        risk_score = calculate_risk_score(findings)

        # Which findings get an AI explanation: most severe first, capped.
        ai_candidates = sorted(
            (f for f in findings if f.impact != "Informational"),
            key=lambda f: _SEVERITY_ORDER.get(f.impact, 9),
        )[:MAX_AI_FINDINGS]
        ai_ids = {f.finding_id for f in ai_candidates}

        analyses: dict[str, dict] = {}
        if ai_candidates:
            with ThreadPoolExecutor(max_workers=AI_WORKERS) as pool:
                for f, result in zip(ai_candidates, pool.map(_safe_ai_analysis, ai_candidates)):
                    analyses[f.finding_id] = result

        results = []
        for finding in findings:
            if finding.finding_id in ai_ids:
                analysis = analyses[finding.finding_id]
            elif finding.impact == "Informational":
                analysis = _skipped_analysis(finding.impact, "Gemini analysis skipped for informational finding.")
            else:
                analysis = _skipped_analysis(finding.impact, "Gemini analysis skipped: per-scan AI limit reached.")
            results.append({"finding": finding.model_dump(), "analysis": analysis, "severity": finding.impact})

        stored = create_static_analysis(
            db=db,
            contract_id=contract_id,
            source_hash=hashlib.sha256(content).hexdigest(),
            source_file=file.filename,
            analyzer_version="1.1.0",
            analysis_status="completed",
            overall_risk_score=risk_score,
        )

        for result in results:
            static_finding = create_static_finding(
                db=db,
                analysis_id=stored.analysis_id,
                contract_id=contract_id,
                finding=Finding(**result["finding"]),
                severity=result["severity"],
                risk_score=risk_score,
            )
            result["finding"]["database_finding_id"] = str(static_finding.finding_id)
            create_finding_analysis(db=db, finding_id=static_finding.finding_id, gemini_analysis=result["analysis"])

        db.commit()

        return {
            "success": True,
            "analysis_id": str(stored.analysis_id),
            "risk_score": risk_score,
            "findings": results,
        }

    except HTTPException:
        raise
    except Exception:
        db.rollback()
        raise
    finally:
        Path(contract_path).unlink(missing_ok=True)


# NOTE: plain `def`, not `async def`. This endpoint blocks for minutes (Gemini + forge).
# As `async def` it froze the whole event loop, including /health and /analyze.
@router.post("/prove-exploit")
def prove_exploit(request: ExploitRequest, db: Session = Depends(get_db)):
    """Attempt to reproduce a specific finding against the uploaded source with Foundry."""
    try:
        if not request.contract_source.strip():
            raise HTTPException(status_code=400, detail="Contract source is required")
        if not request.finding:
            raise HTTPException(status_code=400, detail="Finding context is required")

        finding = request.finding
        result = run_exploit_verification(
            contract_source=request.contract_source,
            finding={
                **finding,
                "detector_id": finding.get("detector_id") or finding.get("detector"),
                "contract": finding.get("contract"),
                "function": finding.get("function"),
            },
        )

        if request.finding_id:
            create_exploit_verification(db=db, finding_id=request.finding_id, result=result)
            db.commit()

        return result

    except HTTPException:
        raise
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Exploit verification failed: {exc}")
