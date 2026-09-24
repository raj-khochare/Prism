import json
import os

from dotenv import load_dotenv
from google import genai

load_dotenv(".env")

api_key = os.getenv("GEMINI_API_KEY")

if not api_key:
    raise RuntimeError("GEMINI_API_KEY is not configured")

client = genai.Client(api_key=api_key)

MODEL_NAME = "gemini-3.1-flash-lite"

def analyze_finding(finding) -> dict:
    prompt = f"""
You are the security analysis component of PRISM
(Protocol Risk Intelligence & Security Monitor).

Slither has already detected a potential Solidity vulnerability.

Your responsibility is to CONTEXTUALIZE and VALIDATE the Slither finding.
Do NOT perform an independent full-contract vulnerability scan.

Analyze only the supplied Slither finding and relevant Solidity source.

SLITHER FINDING
---------------
Detector: {finding.detector_id}
Impact: {finding.impact}
Confidence: {finding.confidence}
Contract: {finding.contract}
Function: {finding.function}
Source File: {finding.source_file}
Lines: {finding.line_start}-{finding.line_end}

SLITHER DESCRIPTION
-------------------
{finding.description}

RELEVANT SOURCE CODE
--------------------
{finding.source_snippet or "Source code unavailable"}

TASK
----
Determine whether the Slither finding is actually applicable to the
provided code.

If it is valid:
- explain why the code is vulnerable
- describe a realistic attack scenario
- explain the security impact
- provide a concrete remediation
- provide corrected code when useful

If it is not valid:
- explain why the finding is likely a false positive or not applicable

IMPORTANT:
- Do not invent facts that are not supported by the provided code.
- Do not claim that an attack is possible if the supplied context does not
  support that conclusion.
- Severity must describe the finding, not an overall contract risk score.
- The overall PRISM risk score will be calculated separately by deterministic
  application logic.

Return ONLY valid JSON.
Do not use Markdown.
Do not wrap the JSON in ```.

Use exactly this structure:

{{
  "is_valid": true,
  "confidence": "High",
  "severity": "High",
  "explanation": "Concise explanation of the finding in this code.",
  "attack_scenario": "Concrete attack scenario, or explain why one is not applicable.",
  "impact": "Security impact.",
  "recommendation": "Concrete remediation.",
  "fixed_code": "Corrected Solidity code or null if unnecessary."
}}
"""

    response = client.models.generate_content(
        model=MODEL_NAME,
        contents=prompt,
    )

    if not response.text:
        raise RuntimeError("Gemini returned an empty response")

    text = response.text.strip()

    # Gemini should return plain JSON, but defensively handle
    # accidental Markdown code fences.
    if text.startswith("```json"):
        text = text[7:]

    elif text.startswith("```"):
        text = text[3:]

    if text.endswith("```"):
        text = text[:-3]

    text = text.strip()

    try:
        result = json.loads(text)
    except json.JSONDecodeError as exc:
        raise RuntimeError(
            f"Gemini returned invalid JSON:\n{text}"
        ) from exc

    required_fields = {
        "is_valid",
        "confidence",
        "severity",
        "explanation",
        "attack_scenario",
        "impact",
        "recommendation",
        "fixed_code",
    }

    missing_fields = required_fields - result.keys()

    if missing_fields:
        raise RuntimeError(
            f"Gemini response missing fields: {missing_fields}"
        )

    return result