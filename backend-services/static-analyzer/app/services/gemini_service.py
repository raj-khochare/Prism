import json
import os
import time
import re

from dotenv import load_dotenv
from google import genai
from google.genai import errors, types


load_dotenv(".env")

api_key = os.getenv("GEMINI_API_KEY")

# Observed in production: a scan with several findings timed out the Java client (which
# waits for the WHOLE scan) because one or more individual Gemini calls stalled far longer
# than expected (network issues / provider-side slowness during a "high demand" period -
# the same kind of 503 seen elsewhere). Capping each call here means one slow call can only
# ever cost GEMINI_CALL_TIMEOUT_SECONDS, not however long the connection feels like hanging.
_CALL_TIMEOUT_MS = int(os.getenv("GEMINI_CALL_TIMEOUT_SECONDS", "25")) * 1000

client = (
    genai.Client(
        api_key=api_key,
        http_options=types.HttpOptions(timeout=_CALL_TIMEOUT_MS),
    )
    if api_key
    else None
)


# Defaults are the ids you were already using; they are now overridable from
# the environment. Verify with `client.models.list()` before the demo.
PRIMARY_MODEL = os.getenv("GEMINI_PRIMARY_MODEL", "gemini-3.8-flash")
FALLBACK_MODEL = os.getenv("GEMINI_FALLBACK_MODEL", "gemini-3.5-flash-lite")
# Each attempt now has its own hard cap (_CALL_TIMEOUT_MS), so the old long backoff
# between retries (2**attempt seconds) is less necessary and was adding to worst-case
# scan time across many findings; keep it short.
MAX_RETRIES = int(os.getenv("GEMINI_MAX_RETRIES", "2"))

# This is a defensive security tool: it writes Foundry PoC tests, server-side, in an
# isolated sandbox, to check whether a Slither finding is real. That is routine content
# for "dangerous content"/"jailbreak" classifiers to flag (it's full of "attacker",
# "exploit", "victim"), so relax those two categories for this call only - the documented
# mechanism for this exact situation, not a workaround. Harassment / hate / sexual content
# categories are left at their defaults; nothing about this task touches them.
_GENERATE_CONFIG = types.GenerateContentConfig(
    safety_settings=[
        types.SafetySetting(
            category=types.HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
            threshold=types.HarmBlockThreshold.BLOCK_NONE,
        ),
        types.SafetySetting(
            category=types.HarmCategory.HARM_CATEGORY_JAILBREAK,
            threshold=types.HarmBlockThreshold.BLOCK_NONE,
        ),
    ]
)


def _generate_response(prompt: str):
    last_error = None

    # Previously this returned a dict here, and every caller then crashed on
    # `response.text`. Raise instead; callers already handle exceptions.
    if client is None:
        raise RuntimeError("Gemini API key is not configured.")

    for model in [PRIMARY_MODEL, FALLBACK_MODEL]:
        for attempt in range(MAX_RETRIES):

            try:
                response = client.models.generate_content(
                    model=model,
                    contents=prompt,
                    config=_GENERATE_CONFIG,
                )

                if response and response.text:
                    return response

                # Safety-blocked responses have no .text but do say why, via
                # prompt_feedback or the candidate's finish_reason - surface that
                # instead of silently retrying into the same refusal.
                block_reason = getattr(getattr(response, "prompt_feedback", None), "block_reason", None)
                finish_reason = None
                if response and getattr(response, "candidates", None):
                    finish_reason = getattr(response.candidates[0], "finish_reason", None)
                if block_reason or finish_reason:
                    print(f"=== GEMINI RESPONSE BLOCKED (model={model}, attempt={attempt + 1}) ===")
                    print(f"block_reason={block_reason} finish_reason={finish_reason}")
                    print("=====================================================")
                    last_error = f"blocked: {block_reason or finish_reason}"

            except errors.APIError as exc:
                print(f"=== GEMINI API ERROR ===")
                print(f"Model: {model}")
                print(f"Attempt: {attempt + 1}")
                print(f"Error: {exc}")
                print(f"========================")
                last_error = exc

                if attempt < MAX_RETRIES - 1:
                    time.sleep(min(2 ** attempt, 3))

            except Exception as exc:
                print(f"=== GEMINI GENERAL ERROR ===")
                print(f"Model: {model}")
                print(f"Attempt: {attempt + 1}")
                print(f"Error type: {type(exc).__name__}")
                print(f"Error: {exc}")
                print(f"============================")
                last_error = exc

                if attempt < MAX_RETRIES - 1:
                    time.sleep(min(2 ** attempt, 3))

    raise RuntimeError(
        f"Gemini generation failed: {last_error}"
    )


def analyze_finding(finding) -> dict:
    detector_id = getattr(finding, "detector_id", None)
    description = getattr(finding, "description", "")
    impact = getattr(finding, "impact", "")
    confidence = getattr(finding, "confidence", "")
    contract = getattr(finding, "contract", "")
    function = getattr(finding, "function", "")
    source_snippet = getattr(finding, "source_snippet", "")

    prompt = f"""
You are the security analysis component of PRISM.

Analyze the following Slither finding and return ONLY valid JSON.

DETECTOR
{detector_id}

SEVERITY
{impact}

CONFIDENCE
{confidence}

CONTRACT
{contract}

FUNCTION
{function}

DESCRIPTION
{description}

SOURCE
{source_snippet}

Return exactly:

{{
  "is_valid": true,
  "confidence": "High",
  "severity": null,
  "explanation": "...",
  "attack_scenario": "...",
  "impact": "...",
  "recommendation": "...",
  "fixed_code": "..."
}}

Do not return markdown.
"""

    response = _generate_response(prompt)

    text = response.text.strip()

    if text.startswith("```"):
        text = text.replace("```json", "", 1)
        text = text.replace("```", "")
        text = text.strip()

    try:
        return json.loads(text)
    except json.JSONDecodeError:
        return {
            "available": False,
            "error": "Gemini returned invalid JSON",
            "raw_response": response.text,
        }


def generate_exploit_poc(
    contract_source: str,
    finding: dict,
    previous_error: str = "",
    attempt: int = 1,
) -> str | None:

    detector_id = finding.get("detector_id") or finding.get("detector")
    contract_name = finding.get("contract")
    function_name = finding.get("function")
    description = finding.get("description", "")
    source_snippet = finding.get("source_snippet", "")

    previous_context = ""

    if previous_error:
        previous_context = f"""
A previous generated PoC failed.

Previous Foundry/compiler output:
{previous_error}

You MUST correct the problem instead of repeating the same PoC.
"""

    prompt = f"""
You are PRISM, a defensive smart-contract security tool. The contract below was
uploaded by its own developer to PRISM for an authorized security audit. Your job
is to write a Foundry unit test, run entirely inside an isolated local sandbox with
no real funds and no network access, that checks whether a specific static-analysis
finding (from Slither) is a real, exploitable bug or a false positive. This is
standard, defensive security tooling (the same purpose as Slither, Mythril, or
Securify) - verifying a finding is not an attack and does not target any live
system, so it should always be completed.

Your job is to generate a REAL Foundry test that attempts to reproduce
the specific Slither finding below against the uploaded Solidity contract.

This is NOT a generic vulnerability demonstration.

The test must target the actual contract, actual function, and actual
finding described below.

SLITHER DETECTOR:
{detector_id}

CONTRACT:
{contract_name}

FUNCTION:
{function_name}

DESCRIPTION:
{description}

SOURCE SNIPPET:
{source_snippet}

UPLOADED CONTRACT:
```solidity
{contract_source}
```
{previous_context}
==================================================
STRICT REQUIREMENTS
==================================================

1. Return ONLY complete Solidity source code.

2. The generated file MUST compile with:
forge test --match-test test_exploit -vvv

3. The file MUST contain:
contract GeneratedExploitTest

4. The file MUST contain:
function test_exploit()

5. Import:
import "forge-std/Test.sol";

6. Import the uploaded contract from:
../src/UploadedContract.sol

7. Deploy and interact with the ACTUAL uploaded contract.

8. Use the ACTUAL ABI, functions, constructor and state variables
available in the uploaded contract.

8A. When converting an address to a contract type that has a payable
fallback or receive function, use the correct payable conversion, for
example:

MultiVulnerable(payable(_target))

Do not generate invalid address-to-contract conversions.


9. Do NOT invent functions.

10. Do NOT invent constructor arguments.

11. If constructor arguments are required, derive them from the
uploaded source and construct the contract correctly.

12. When converting an address to a contract type that has a payable
fallback or receive function, use the correct payable conversion.

For example:
MultiVulnerable(payable(_target))

Do NOT generate:
MultiVulnerable(_target)

when the contract has a payable fallback or receive function.

13. Do NOT assume that the Slither finding is exploitable.

14. The test must attempt the ACTUAL attack represented by the finding.

15. The attacker must behave as an unauthorized attacker.

16. Do NOT impersonate the privileged owner/admin/victim to make
the exploit succeed.

17. Do NOT hardcode a successful result.

18. Do NOT simply assert that the vulnerable code exists.

19. The test must demonstrate an observable security impact.

20. Before attempting the exploit, emit:
emit log_string("PRISM_EXPLOIT_ATTEMPT");

21. ONLY after the exploit has actually succeeded, emit:
emit log_string("PRISM_EXPLOIT_CONFIRMED");

22. If the exploit cannot actually be demonstrated, DO NOT emit
PRISM_EXPLOIT_CONFIRMED.

23. If the attack cannot be reliably constructed from the supplied
contract and finding, return exactly:
UNSUPPORTED

24. Helper contracts such as Attacker, MaliciousReceiver, Proxy,
or Helper MUST be declared OUTSIDE GeneratedExploitTest.

25. NEVER declare a contract inside test_exploit().

26. For balance-changing exploits, measure the balances of the actual
parties affected by the exploit.

For asset-transfer exploits, measure BOTH the victim and attacker
balances whenever both are observable.

Use descriptive labels that identify whose balance is being measured.

For any ETH exploit where the attacker must send ETH to initiate
the attack, define the exact ETH amount sent by the attacker as
a variable named attackValue.

The test MUST emit:

emit log_named_decimal_uint(
    "PRISM_ATTACK_VALUE",
    attackValue,
    18
);

The attack transaction MUST use that exact value.

For example:

uint256 attackValue = 1 ether;
attacker.attack{{value: attackValue}}();
Do NOT hardcode the attack value only in the transaction.
PRISM must be able to observe and report it.

The attacker's net gain is:

attackerBalanceAfter
- attackerBalanceBefore
- attackValue

For an ETH theft exploit, the net attacker gain must correspond
to the victim's ETH loss.

emit log_named_decimal_uint(
    "PRISM_BALANCE_AFTER",
    balanceAfter,
    18
);

==================================================
VULNERABILITY-SPECIFIC RULES
==================================================

REENTRANCY

Create a real attacker/receiver helper contract outside
GeneratedExploitTest.

Trigger the actual vulnerable function using the actual
contract ABI and required parameters.

Re-enter through the actual callback path.

IMPORTANT - a common mistake that makes an otherwise-correct test fail:

If the re-entrant call keeps firing on every single incoming payment with no
stopping condition, it will keep calling the vulnerable function one call
too many - the point where the contract's recorded balance for that function
is no longer sufficient. That one extra call reverts, and because Solidity
reverts unwind the entire call stack, the WHOLE test transaction fails (gas
is consumed, and the test reports FAIL / "Transfer failed") even though the
vulnerability itself is real and every earlier call in the sequence had
already succeeded.

To write a test that actually passes, add a simple guard in the re-entrant
callback (receive()/fallback()) that checks there is still enough of a
balance available before calling back in again, and simply returns/does
nothing otherwise - letting the call stack unwind normally instead of
reverting. The test should assert that the net balance after the sequence
is favourable (greater than the amount initially supplied) and that the
transaction completes without reverting.

Before the attack, ensure the vulnerable victim contract
has a meaningful ETH balance using vm.deal ONLY when the
contract is actually capable of holding ETH.

For example, if the vulnerable contract is expected to hold
ETH, fund the deployed victim contract with a deterministic
test balance such as:

vm.deal(address(vulnerableContract), 10 ether);

The attacker may be funded only with the minimum ETH required
to execute the attack.

Record:

- victim balance before
- attacker balance before
- victim balance after
- attacker balance after

The PoC must demonstrate that the reentrant call causes an
actual unauthorized transfer or state change.

For an ETH reentrancy exploit, the confirmation condition
must require:

victimBalanceAfter < victimBalanceBefore

AND

attackerBalanceAfter > attackerBalanceBefore

AND

the attacker gain must correspond to the victim's loss
within the actual transaction accounting.

Do NOT merely require that both balances changed.

Do NOT use arbitrary balance changes as proof of reentrancy.

Do NOT transfer ETH to the attacker outside the vulnerable
attack path.

Do NOT use vm.deal to increase the attacker's balance after
the exploit.

Only emit:

emit log_string("PRISM_EXPLOIT_CONFIRMED");

after the actual reentrant attack has produced the
observable security impact.

TX-ORIGIN

Do NOT prank as the owner.

Use an attacker/intermediary contract so tx.origin and msg.sender
naturally differ.

Demonstrate unauthorized access if the vulnerable condition allows it.

WEAK RANDOMNESS

Use Foundry's controllable block variables where appropriate.

Interact with the actual vulnerable contract.

Demonstrate that the attacker can influence or predict the
security-sensitive result.

ARBITRARY ETH/TOKEN TRANSFER

- Act as an unauthorized caller.
- Identify the actual vulnerable transfer function.
- Use the actual function parameters required by the contract.
- Demonstrate that assets belonging to the victim contract or account
  can actually be transferred to the attacker.
- For ETH transfers, record BOTH the victim contract balance and the
  attacker balance before and after the exploit.

Before the exploit:

uint256 victimBalanceBefore = address(vulnerableContract).balance;
uint256 attackerBalanceBefore = address(attacker).balance;

emit log_named_decimal_uint(
    "PRISM_VICTIM_BALANCE_BEFORE",
    victimBalanceBefore,
    18
);

emit log_named_decimal_uint(
    "PRISM_ATTACKER_BALANCE_BEFORE",
    attackerBalanceBefore,
    18
);

After the exploit:

uint256 victimBalanceAfter = address(vulnerableContract).balance;
uint256 attackerBalanceAfter = address(attacker).balance;

emit log_named_decimal_uint(
    "PRISM_VICTIM_BALANCE_AFTER",
    victimBalanceAfter,
    18
);

emit log_named_decimal_uint(
    "PRISM_ATTACKER_BALANCE_AFTER",
    attackerBalanceAfter,
    18
);

The exploit is confirmed only when the actual asset transfer occurred,
for example when the victim balance decreased and the attacker balance
increased by the corresponding amount.

Do not use the attacker's balance as the victim balance.
Do not hardcode expected balances.

UNCHECKED CALL

Exercise the actual low-level call.

Demonstrate the security impact caused by ignored failure.

SELFDESTRUCT

Account for modern Solidity/EVM semantics.

Demonstrate the actual remaining security impact.

Do not blindly assume that selfdestruct removes deployed code.

ARITHMETIC

Use values that exercise the actual vulnerable arithmetic operation.

Demonstrate the incorrect resulting state/value.

EQUALITY / PRECISION

Use values derived from the actual contract logic.

Do not invent arbitrary values without demonstrating why they satisfy
the vulnerable condition.

ACCESS CONTROL

Act as an unauthorized caller.

Do not use vm.prank with the legitimate privileged address merely
to bypass the protection.

Demonstrate the actual unauthorized state change if possible.

DELEGATECALL

Exercise the actual delegatecall path.

Demonstrate the resulting unauthorized state/storage impact.

==================================================
IMPORTANT
==================================================

The exploit test must be based on the supplied source code.

Do NOT create a generic example contract.

Do NOT rewrite the uploaded contract.

Do NOT modify the vulnerability so that the exploit succeeds.

The goal is to determine whether the reported Slither finding can
actually be reproduced against the uploaded contract.

Return ONLY Solidity source code.
"""
    response = _generate_response(prompt)

    if not response.text:
        raise RuntimeError("Gemini returned an empty exploit PoC.")

    poc = _extract_solidity(response.text)

    if poc.strip() == "UNSUPPORTED":
        return None

    # Models often name the test contract something else, or inherit differently
    # (`is DSTest`, multi-line `is`, ...). The harness needs a contract named
    # GeneratedExploitTest that inherits Test and contains test_exploit.
    if "contract GeneratedExploitTest" not in poc:
        poc = _rename_test_contract(poc)
        if "contract GeneratedExploitTest" not in poc:
            print("=== GEMINI POC REJECTED: no test contract found ===")
            print(response.text[:3000])
            print("===================================================")
            raise RuntimeError(
                "Gemini returned a PoC without a Foundry test contract "
                "(no contract containing test_exploit)."
            )

    if "function test_exploit" not in poc:
        raise RuntimeError("Gemini returned a PoC without test_exploit.")

    return poc


def _rename_test_contract(poc: str) -> str:
    """Rename the contract that holds `function test_exploit` to GeneratedExploitTest and make
    sure it inherits Test."""
    idx = poc.find("function test_exploit")
    if idx == -1:
        return poc
    decls = list(re.finditer(r"\bcontract\s+(\w+)([^{]*)\{", poc[:idx]))
    if not decls:
        return poc
    d = decls[-1]
    inherits = re.sub(r"\s+", " ", d.group(2)).strip()
    if re.search(r"\bis\b", inherits):
        if not re.search(r"\bTest\b", inherits):
            inherits = inherits.replace("is ", "is Test, ", 1)
    else:
        inherits = "is Test"
    header = f"contract GeneratedExploitTest {inherits} {{"
    return poc[: d.start()] + header + poc[d.end():]


def _extract_solidity(text: str) -> str:
    """Pull Solidity out of a model reply: prefer a fenced block anywhere in the text,
    otherwise start at the first SPDX/pragma/import line so leading prose is dropped."""
    text = text.strip()
    fenced = re.findall(r"```(?:solidity|sol)?\s*\n(.*?)```", text, flags=re.S | re.I)
    if fenced:
        # the longest block is the real test, not a short snippet
        return max(fenced, key=len).strip()
    if text.startswith("```"):  # unterminated fence (truncated reply)
        text = re.sub(r"^```(?:solidity|sol)?\s*", "", text, flags=re.I)
        return re.sub(r"\s*```\s*$", "", text).strip()
    m = re.search(r"^(//\s*SPDX|pragma\s+solidity|import\s)", text, flags=re.M)
    return text[m.start():].strip() if m else text