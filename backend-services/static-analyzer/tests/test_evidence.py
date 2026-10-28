from app.services.exploit_service import extract_evidence

ETH = """
[PASS] test_exploit() (gas: 1)
  PRISM_VICTIM_BALANCE_BEFORE: 10.000000000000000000
  PRISM_VICTIM_BALANCE_AFTER: 0.000000000000000000
  PRISM_ATTACKER_BALANCE_BEFORE: 1.000000000000000000
  PRISM_ATTACKER_BALANCE_AFTER: 12.000000000000000000
  PRISM_ATTACK_VALUE: 1.000000000000000000
  PRISM_EXPLOIT_CONFIRMED
"""


def test_reentrancy_confirmed_with_balances():
    assert extract_evidence(ETH, "reentrancy")["confirmed"] is True


def test_reentrancy_not_confirmed_without_balances():
    assert extract_evidence("[PASS] test_exploit()\nPRISM_EXPLOIT_CONFIRMED", "reentrancy")["confirmed"] is False


def test_tx_origin_confirmed_by_marker_only():
    out = "[PASS] test_exploit() (gas: 1)\n  PRISM_EXPLOIT_CONFIRMED"
    assert extract_evidence(out, "tx_origin")["confirmed"] is True


def test_marker_without_pass_is_rejected():
    assert extract_evidence("PRISM_EXPLOIT_CONFIRMED", "tx_origin")["confirmed"] is False
