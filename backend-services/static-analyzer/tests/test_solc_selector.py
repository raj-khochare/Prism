from app.services.solc_selector import pick_solc_version, relax_pragma


def test_caret_pragma_picks_satisfying_compiler():
    assert pick_solc_version("pragma solidity ^0.4.24;\ncontract A {}") == "0.4.26"
    assert pick_solc_version("pragma solidity ^0.8.0;\ncontract A {}") == "0.8.20"


def test_exact_old_pragma_uses_same_series_not_0_8():
    # used to fall back to 0.8.20, which cannot compile 0.4 code
    assert pick_solc_version("pragma solidity 0.4.25;\ncontract A {}") == "0.4.26"
    assert pick_solc_version("pragma solidity 0.5.2;\ncontract A {}") == "0.5.17"


def test_relax_pragma_only_when_needed():
    src = "pragma solidity 0.4.25;\ncontract A {}"
    assert "^0.4.0" in relax_pragma(src, "0.4.26")
    ok = "pragma solidity ^0.4.24;\ncontract A {}"
    assert relax_pragma(ok, "0.4.26") == ok


def test_no_pragma_uses_default():
    assert pick_solc_version("contract A {}") == "0.8.20"
