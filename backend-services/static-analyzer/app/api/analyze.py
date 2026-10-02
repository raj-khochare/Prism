from fastapi import APIRouter, HTTPException, UploadFile, File, Depends
from pathlib import Path
import tempfile
import hashlib

from sqlalchemy.orm import Session

from app.dependencies import get_db

from app.services.slither_service import run_slither
from app.services.finding_processor import process_findings
from app.services.gemini_service import analyze_finding
from app.services.risk_scorer import calculate_risk_score
from app.services.exploit_service import run_exploit_verification

from app.services.static_analysis_service import (
    create_static_analysis,
    create_static_finding,
    create_finding_analysis,
)

from app.schemas.exploit import ExploitRequest
from app.schemas.finding import Finding
from app.services.static_analysis_service import (
    create_static_analysis,
    create_static_finding,
    create_finding_analysis,
    create_exploit_verification,
)


router = APIRouter()


@router.post("/analyze")
async def analyze_contract(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    if not file.filename or not file.filename.endswith(".sol"):
        raise HTTPException(
            status_code=400,
            detail="Only Solidity (.sol) files are supported",
        )

    content = await file.read()

    with tempfile.NamedTemporaryFile(
        suffix=".sol",
        delete=False,
    ) as temp_file:
        temp_file.write(content)
        contract_path = temp_file.name

    try:
        slither_data = run_slither(contract_path)

        findings = process_findings(
            slither_data,
            contract_path,
            file.filename,
        )

        risk_score = calculate_risk_score(findings)

        results = []

        for finding in findings:

            if finding.impact == "Informational":
                gemini_analysis = {
                    "available": False,
                    "is_valid": False,
                    "confidence": "Unknown",
                    "severity": finding.impact,
                    "explanation": (
                        "Gemini analysis skipped for informational finding."
                    ),
                    "attack_scenario": "",
                    "impact": finding.impact,
                    "recommendation": "",
                    "fixed_code": "",
                    "skipped": True,
                }

            else:
                try:
                    gemini_analysis = analyze_finding(finding)

                except Exception as exc:
                    gemini_analysis = {
                        "available": False,
                        "is_valid": False,
                        "confidence": "Unknown",
                        "severity": finding.impact,
                        "explanation": (
                            "Gemini analysis is temporarily unavailable."
                        ),
                        "attack_scenario": "",
                        "impact": finding.impact,
                        "recommendation": "",
                        "fixed_code": "",
                        "error": str(exc),
                    }

            results.append(
                {
                    "finding": finding.model_dump(),
                    "analysis": gemini_analysis,
                    "severity": finding.impact,
                }
            )

        analysis = create_static_analysis(
            db=db,
            contract_id=None,
            source_hash=hashlib.sha256(content).hexdigest(),
            source_file=file.filename,
            analyzer_version="1.0.0",
            analysis_status="completed",
            overall_risk_score=risk_score,
        )

        for result in results:
            finding = result["finding"]

            static_finding = create_static_finding(
                db=db,
                analysis_id=analysis.analysis_id,
                contract_id=None,
                finding=Finding(**finding),
                severity=result["severity"],
                risk_score=risk_score,
            )

            result["finding"]["database_finding_id"] = str(
                    static_finding.finding_id
                    )

            create_finding_analysis(
                db=db,
                finding_id=static_finding.finding_id,
                gemini_analysis=result["analysis"],
            )

        db.commit()

        return {
            "success": True,
            "analysis_id": str(analysis.analysis_id),
            "risk_score": risk_score,
            "findings": results,
        }

    except Exception:
        db.rollback()
        raise

    finally:
        Path(contract_path).unlink(missing_ok=True)


@router.post("/prove-exploit")
async def prove_exploit(
    request: ExploitRequest,
    db: Session = Depends(get_db),
):
    """
    Attempt to prove a specific Slither finding against
    the uploaded Solidity contract.
    """

    try:
        contract_source = request.contract_source
        finding = request.finding

        if not contract_source.strip():
            raise HTTPException(
                status_code=400,
                detail="Contract source is required",
            )

        if not finding:
            raise HTTPException(
                status_code=400,
                detail="Finding context is required",
            )

        detector_id = finding.get("detector_id") or finding.get("detector")
        contract_name = finding.get("contract")
        function_name = finding.get("function")

        result = run_exploit_verification(
            contract_source=contract_source,
            finding={
                **finding,
                "detector_id": detector_id,
                "contract": contract_name,
                "function": function_name,
            },
        )

        if request.finding_id:
            create_exploit_verification(
                db=db,
                finding_id=request.finding_id,
                result=result,
            )

            db.commit()

        return result

    except HTTPException:
        raise

    except Exception as exc:
        db.rollback()

        raise HTTPException(
            status_code=500,
            detail=f"Exploit verification failed: {str(exc)}",
        )