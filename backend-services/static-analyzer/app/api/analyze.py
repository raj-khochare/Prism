from fastapi import APIRouter, HTTPException, UploadFile, File
from pathlib import Path
import tempfile

from app.services.slither_service import run_slither
from app.services.finding_processor import process_findings
from app.services.gemini_service import analyze_finding
from app.services.risk_scorer import calculate_risk_score
from app.services.exploit_service import run_exploit_verification
from app.schemas.exploit import ExploitRequest

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

@router.post("/prove-exploit")
async def prove_exploit(request: ExploitRequest):
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
                detail="Contract source is required"
            )

        if not finding:
            raise HTTPException(
                status_code=400,
                detail="Finding context is required"
            )

        detector_id = finding.get("detector_id") or finding.get("detector")
        contract_name = finding.get("contract")
        function_name = finding.get("function")

        return run_exploit_verification(
            contract_source=contract_source,
            finding={
                **finding,
                "detector_id": detector_id,
                "contract": contract_name,
                "function": function_name,
            },
        )

    except HTTPException:
        raise

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Exploit verification failed: {str(e)}"
        )