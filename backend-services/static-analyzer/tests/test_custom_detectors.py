from pathlib import Path

from app.services.custom_detectors import run_custom_detectors
from app.services.solc_selector import pick_solc_version

C = Path(__file__).resolve().parents[1] / "contracts" / "vulnerable"


def ids(name):
    src = (C / name).read_text()
    return {(f.detector_id, f.function) for f in run_custom_detectors(src, name)}


def test_intoverflow_flags_unchecked_arithmetic():
    found = ids("intoverflow.sol")
    assert ("prism-unchecked-arithmetic", "increase") in found


def test_delegatecall_flags_unprotected_setter():
    assert ("prism-missing-access-control", "setImplementation") in ids("delegatecall.sol")


def test_multivulnerable_flags_destroy_only_for_access_control():
    found = ids("multivulnerable.sol")
    assert ("prism-missing-access-control", "destroy") in found
    # tx.origin guarded function must not be reported as "no guard" by this rule
    assert ("prism-missing-access-control", "privilegedAction") not in found


def test_safe_contract_is_clean():
    src = """
    pragma solidity ^0.8.20;
    contract Safe {
        address public owner;
        modifier onlyOwner() { require(msg.sender == owner); _; }
        function setOwner(address a) external onlyOwner { owner = a; }
        function sum(uint256[] calldata xs) external pure returns (uint256 t) {
            for (uint256 i = 0; i < xs.length; ) { t += xs[i]; unchecked { ++i; } }
        }
    }"""
    assert run_custom_detectors(src, "Safe.sol") == []


def test_legacy_pragma_without_safemath():
    src = "pragma solidity ^0.6.0;\ncontract A { uint public x; function f(uint a) public { x = x + a; } }"
    assert any(f.detector_id == "prism-integer-overflow-legacy" for f in run_custom_detectors(src, "A.sol"))


def test_solc_selection():
    assert pick_solc_version("pragma solidity ^0.8.0;") == "0.8.20"
    assert pick_solc_version("pragma solidity 0.8.26;") == "0.8.26"
    assert pick_solc_version("pragma solidity >=0.6.0 <0.8.0;") == "0.7.6"
    assert pick_solc_version("pragma solidity ^0.4.24;") == "0.4.26"
    assert pick_solc_version("contract X {}") == "0.8.20"
