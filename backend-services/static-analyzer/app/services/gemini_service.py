import json
import os
import time
import re

from dotenv import load_dotenv
from google import genai
from google.genai import errors


load_dotenv(".env")

api_key = os.getenv("GEMINI_API_KEY")

if not api_key:
    raise RuntimeError("GEMINI_API_KEY is not configured")

client = genai.Client(api_key=api_key)

PRIMARY_MODEL = "gemini-3.1-flash-lite"
FALLBACK_MODEL = "gemini-3.5-flash-lite"
MAX_RETRIES = 3


def _generate_response(prompt: str):
    last_error = None

    for model in [PRIMARY_MODEL, FALLBACK_MODEL]:
        for attempt in range(MAX_RETRIES):
            try:
                response = client.models.generate_content(
                    model=model,
                    contents=prompt,
                )

                if response and response.text:
                    return response

            except errors.APIError as exc:
                last_error = exc

                if attempt < MAX_RETRIES - 1:
                    time.sleep(2 ** attempt)

            except Exception as exc:
                last_error = exc

                if attempt < MAX_RETRIES - 1:
                    time.sleep(2 ** attempt)

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
You are PRISM's executable exploit-generation engine.

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

    poc = response.text.strip()

    if poc.startswith("```"):   
        poc = re.sub(r"^```(?:solidity)?\s*", "", poc)
        poc = re.sub(r"\s*```$", "", poc)

    if poc.strip() == "UNSUPPORTED":    
        return None

    if "contract GeneratedExploitTest" not in poc:  
        raise RuntimeError(
                "Gemini returned a PoC without GeneratedExploitTest."
            )

    if "function test_exploit" not in poc:
        raise RuntimeError(
            "Gemini returned a PoC without test_exploit."
        )

    return poc