import json
import os
import time

from dotenv import load_dotenv
from google import genai
from google.genai import errors


# Load environment variables from the project root.
load_dotenv(".env")

api_key = os.getenv("GEMINI_API_KEY")

if not api_key:
    raise RuntimeError("GEMINI_API_KEY is not configured")


client = genai.Client(api_key=api_key)


PRIMARY_MODEL = "gemini-3.1-flash-lite"
FALLBACK_MODEL = "gemini-3.5-flash-lite"

MAX_RETRIES = 3


def _generate_response(prompt: str):
    """
    Call Gemini with retry and fallback handling.

    Gemini is an enhancement to the Slither analysis, so temporary
    Gemini availability issues are handled here rather than inside
    the API route.
    """

    models = [
        PRIMARY_MODEL,
        FALLBACK_MODEL,
    ]

    last_error = None

    for attempt in range(MAX_RETRIES):

        for model_name in models:

            try:
                response = client.models.generate_content(
                    model=model_name,
                    contents=prompt,
                )

                return response

            except errors.ServerError as exc:
                last_error = exc

                print(
                    f"Gemini server error using {model_name} "
                    f"(attempt {attempt + 1}/{MAX_RETRIES})"
                )

                continue

            except errors.APIError as exc:
                last_error = exc

                # Don't retry authentication / invalid-request errors.
                if getattr(exc, "code", None) not in {429, 500, 502, 503, 504}:
                    raise

                print(
                    f"Gemini API error using {model_name}: {exc}"
                )

                continue

        # Exponential backoff:
        # 1st retry → 1 second
        # 2nd retry → 2 seconds
        # 3rd retry → 4 seconds
        if attempt < MAX_RETRIES - 1:
            time.sleep(2 ** attempt)

    raise RuntimeError(
        f"Gemini unavailable after {MAX_RETRIES} attempts. "
        f"Last error: {last_error}"
    )


def analyze_finding(finding) -> dict:
    """
    Send a Slither finding and its relevant Solidity source context
    to Gemini for contextual validation and remediation.
    """

    prompt = f"""
You are the security analysis component of PRISM
(Protocol Risk Intelligence & Security Monitor).

Slither has already detected a potential Solidity vulnerability.

Your responsibility is to CONTEXTUALIZE and VALIDATE the Slither finding.

Do NOT perform an independent full-contract vulnerability scan.

Analyze only the supplied Slither finding and the relevant Solidity
source code.

SLITHER DETECTOR
----------------
{finding.detector_id}

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

RELEVANT SOLIDITY SOURCE
------------------------
{finding.source_snippet or "Source code unavailable"}

TASK
----
Determine whether the SPECIFIC Slither detector finding is applicable
to the provided Solidity code.

The Slither detector ID and Slither description define the exact issue
you must analyze.

IMPORTANT:
- Do not replace the detected issue with another vulnerability you notice.
- Do not reinterpret a low-level call finding as a reentrancy finding.
- Do not report a different vulnerability even if the same code could
  contribute to one.
- Analyze only the vulnerability represented by the supplied detector.

If the finding is valid:

- explain why the code is vulnerable
- describe a realistic attack scenario
- explain the security impact
- provide a concrete remediation
- provide corrected Solidity code when useful

If the finding is not valid:

- explain why the finding is likely a false positive or not applicable

IMPORTANT RULES
---------------
- Do not invent facts that are not supported by the supplied code.
- Do not claim an attack is possible if the supplied context does not
  support that conclusion.
- Do NOT assign or change the severity.
- Slither's impact value is authoritative.
- Return "severity": null.
- Do NOT calculate an overall contract risk score.
- The PRISM application calculates the overall risk score separately.
- Slither is the vulnerability detection engine.
- Gemini is responsible for contextual explanation, validation,
  attack scenario, impact, and remediation.

Return ONLY valid JSON.

Do not use Markdown.
Do not wrap the response in ```json.
Do not add any text before or after the JSON.

Return exactly this structure:

{{
    "is_valid": true,
    "confidence": "High",
    "severity": null,
    "explanation": "Concise explanation of the finding in this code.",
    "attack_scenario": "Concrete attack scenario, or explain why one is not applicable.",
    "impact": "Security impact.",
    "recommendation": "Concrete remediation.",
    "fixed_code": "Corrected Solidity code or null if unnecessary."
}}
"""

    response = _generate_response(prompt)

    if not response.text:
        raise RuntimeError("Gemini returned an empty response")

    text = response.text.strip()

    # Defensive handling in case Gemini ignores the
    # instruction and returns a Markdown JSON block.
    if text.startswith("```json"):
        text = text[len("```json"):].strip()

    elif text.startswith("```"):
        text = text[len("```"):].strip()

    if text.endswith("```"):
        text = text[:-3].strip()

    try:
        result = json.loads(text)

    except json.JSONDecodeError as exc:
        raise RuntimeError(
            f"Gemini returned invalid JSON:\n{text}"
        ) from exc

    required_fields = {
    "is_valid",
    "confidence",
    "explanation",
    "attack_scenario",
    "impact",
    "recommendation",
    "fixed_code",
}

    missing_fields = required_fields - set(result.keys())

    if missing_fields:
        raise RuntimeError(
            f"Gemini response missing fields: {sorted(missing_fields)}"
        )

    return result