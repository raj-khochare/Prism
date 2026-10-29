from app.services.custom_detectors import detect_legacy_overflow


def flagged(body: str, pragma: str = "^0.4.24") -> bool:
    return bool(detect_legacy_overflow(f"pragma solidity {pragma};\ncontract C {{\n{body}\n}}", "C.sol"))


def test_unguarded_add_with_caller_value_is_flagged():
    assert flagged("uint public total; function add(uint x) public { total += x; }")


def test_classic_transfer_overflow_is_still_flagged():
    # the subtraction is guarded, the ADDITION to the receiver is not
    assert flagged("""mapping(address=>uint) bal;
        function transfer(address to, uint v) public { require(bal[msg.sender] >= v); bal[msg.sender] -= v; bal[to] += v; }""")


def test_guarded_subtraction_alone_is_not_flagged():
    assert not flagged("""mapping(address=>uint) bal;
        function spend(uint v) public { require(bal[msg.sender] >= v); bal[msg.sender] -= v; }""")


def test_always_true_underflow_check_is_not_a_guard():
    assert flagged("""mapping(address=>uint) bal;
        function spend(uint v) public { require(bal[msg.sender] - v >= 0); bal[msg.sender] -= v; }""")


def test_overflow_style_check_guards_addition():
    assert not flagged("uint total; function add(uint x) public { require(total + x >= total); total += x; }")


def test_safemath_constants_counters_and_views_are_ignored():
    assert not flagged("using SafeMath for uint; uint t; function f(uint x) public { t = t.add(x); t += x; }")
    assert not flagged("uint t; function f() public { t += 1; }")
    assert not flagged("uint t; function f() public { t = 2 * 3600; }")
    assert not flagged("uint t; function f(uint x) public view returns (uint) { return t + x; }")
    assert not flagged("uint t; function f(uint x) internal { t += x; }")


def test_solidity_0_8_is_not_legacy():
    assert not flagged("uint t; function f(uint x) public { t += x; }", pragma="^0.8.0")
