from fastapi import APIRouter, HTTPException, UploadFile, File
from pathlib import Path
import tempfile

from app.services.slither_service import run_slither
from app.services.finding_processor import process_findings
from app.services.gemini_service import analyze_finding
from app.services.risk_scorer import calculate_risk_score

router = APIRouter()


@router.post("/analyze")
async def analyze_contract(file: UploadFile = File(...)):

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
        )

        risk_score = calculate_risk_score(findings)

        results = []

        for finding in findings:

            if finding.impact == "Informational":
                gemini_analysis = {
                    "available": False,
                    "skipped": True,
                    "reason": "Informational finding",
                }
            else:
                try:
                    gemini_analysis = analyze_finding(finding)
                except Exception as exc:
                    gemini_analysis = {
                        "available": False,
                        "error": str(exc),
                    }

            results.append(
                {
                    "finding": finding.model_dump(),
                    "analysis": gemini_analysis,
                    "severity": finding.impact,
                }
            )

        return {
            "success": True,
            "risk_score": risk_score,
            "findings": results,
        }

    finally:
        Path(contract_path).unlink(missing_ok=True)