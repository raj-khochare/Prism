"""PRISM rule-based detectors for the static attack classes Slither does not cover.

Scope (see project spec): reentrancy, access-control flaws, integer
overflow/underflow, unchecked external calls. Slither covers reentrancy and
unchecked calls well, but:

* Slither has no detector for `unchecked { ... }` arithmetic (Solidity >=0.8
  reverts on overflow, so the only overflow risk left is inside unchecked
  blocks or in pre-0.8 code), and
* it has no general "missing access control on a privileged setter" detector.

These are deliberately simple, explainable heuristics. They are labelled with
`prism-` detector ids so the UI/report can distinguish them from Slither, and
they carry medium confidence - say so honestly in the evaluation chapter.
"""
import hashlib
import json
import re

from app.schemas.finding import Finding

_FUNC_RE = re.compile(
    r"function\s+(?P<name>\w+)\s*\((?P<params>[^)]*)\)\s*(?P<header>[^{;]*)\{",
    re.S,
)
_VISIBILITY = {"public", "external", "internal", "private"}
_MUTABILITY = {"view", "pure", "payable", "virtual", "override"}
_GUARD_MODIFIER_RE = re.compile(
    r"^(only|auth|restricted|initializer|reinitializer|requires?|admin|owner|governance|role)", re.I
)
_SENSITIVE_NAME_RE = re.compile(
    r"^(set|update|change|upgrade|mint|pause|unpause|transferOwnership|renounce|destroy|kill|"
    r"initialize|init|sweep|rescue|grant|revoke|emergency|migrate)",
    re.I,
)
_SENSITIVE_ASSIGN_RE = re.compile(
    r"\b(owner|admin|oracle|implementation|treasury|governance|feeRecipient|guardian|operator)\w*\s*=(?!=)"
)
_GUARD_BODY_RE = re.compile(
    r"(msg\.sender\s*==|==\s*msg\.sender|_msgSender\(\)\s*==|onlyOwner|_checkOwner|_checkRole|hasRole|"
    r"revert\s+Unauthorized|require\s*\(\s*owner\s*==|isOwner|tx\.origin)"
)
_UNCHECKED_RE = re.compile(r"\bunchecked\s*\{")
_ARITH_ASSIGN_RE = re.compile(r"[+\-*]=")
_ARITH_BINARY_RE = re.compile(r"[A-Za-z_\]\)]\s*[+\-*]\s*[A-Za-z_\(]")
_LOOP_INC_RE = re.compile(r"^\s*(\+\+\s*\w+|\w+\s*\+\+|--\s*\w+|\w+\s*--)\s*;?\s*$")


def _blank_comments(src: str) -> str:
    """Replace comments with spaces (keeping newlines) so offsets/lines still match."""
    def blank(m):
        return re.sub(r"[^\n]", " ", m.group(0))
    src = re.sub(r"/\*.*?\*/", blank, src, flags=re.S)
    return re.sub(r"//[^\n]*", blank, src)


def _match_brace(src: str, open_idx: int) -> int:
    depth = 0
    for i in range(open_idx, len(src)):
        if src[i] == "{":
            depth += 1
        elif src[i] == "}":
            depth -= 1
            if depth == 0:
                return i
    return len(src) - 1


def _line_of(src: str, idx: int) -> int:
    return src.count("\n", 0, idx) + 1


def _snippet(lines: list[str], start: int, end: int) -> str:
    return "\n".join(lines[max(start - 1, 0): min(end, len(lines))])


def _finding_id(detector_id: str, function: str | None, start: int, end: int) -> str:
    raw = json.dumps(
        {"d": detector_id, "f": function, "s": start, "e": end}, sort_keys=True
    ).encode()
    return hashlib.sha256(raw).hexdigest()[:16]


def _contract_name_at(clean: str, idx: int) -> str | None:
    name = None
    for m in re.finditer(r"\b(?:contract|library)\s+(\w+)", clean):
        if m.start() < idx:
            name = m.group(1)
        else:
            break
    return name


def _functions(clean: str):
    for m in _FUNC_RE.finditer(clean):
        open_idx = m.end() - 1
        close_idx = _match_brace(clean, open_idx)
        yield m, open_idx, close_idx


def detect_missing_access_control(source: str, file_name: str) -> list[Finding]:
    clean = _blank_comments(source)
    lines = source.splitlines()
    findings: list[Finding] = []

    for m, open_idx, close_idx in _functions(clean):
        name = m.group("name")
        header_tokens = re.findall(r"[A-Za-z_]\w*", re.sub(r"returns\s*\([^)]*\)", "", m.group("header")))
        if not (set(header_tokens) & {"public", "external"}):
            continue
        if set(header_tokens) & {"view", "pure"}:
            continue

        modifiers = [t for t in header_tokens if t not in _VISIBILITY | _MUTABILITY]
        if any(_GUARD_MODIFIER_RE.match(t) for t in modifiers):
            continue

        body = clean[open_idx: close_idx + 1]
        if _GUARD_BODY_RE.search(body):
            continue

        sensitive = bool(_SENSITIVE_NAME_RE.match(name)) or bool(_SENSITIVE_ASSIGN_RE.search(body))
        if not sensitive:
            continue

        start, end = _line_of(clean, m.start()), _line_of(clean, close_idx)
        detector_id = "prism-missing-access-control"
        findings.append(
            Finding(
                finding_id=_finding_id(detector_id, name, start, end),
                detector_id=detector_id,
                vulnerability_family="access_control",
                title=detector_id,
                impact="High",
                confidence="Medium",
                contract=_contract_name_at(clean, m.start()),
                function=name,
                source_file=file_name,
                line_start=start,
                line_end=end,
                source_snippet=_snippet(lines, start, end),
                vulnerability_features={
                    "external_call": ".call(" in body or ".delegatecall(" in body,
                    "state_update_after_call": False,
                    "value_transfer": ".transfer(" in body or ".send(" in body or ".call{" in body,
                    "uses_msg_sender": "msg.sender" in body,
                    "uses_tx_origin": False,
                    "delegatecall": ".delegatecall(" in body,
                    "unchecked_external_call": False,
                    "unprotected_privileged_function": True,
                },
                description=(
                    f"Function `{name}` is publicly callable and changes privileged state "
                    "but has no access-control modifier or msg.sender check. Any account can call it."
                ),
            )
        )
    return findings


def detect_unchecked_arithmetic(source: str, file_name: str) -> list[Finding]:
    clean = _blank_comments(source)
    lines = source.splitlines()
    findings: list[Finding] = []

    funcs = list(_functions(clean))

    for m in _UNCHECKED_RE.finditer(clean):
        open_idx = clean.index("{", m.start())
        close_idx = _match_brace(clean, open_idx)
        body = clean[open_idx + 1: close_idx]

        statements = [s for s in body.split(";") if s.strip()]
        risky = [s for s in statements if not _LOOP_INC_RE.match(s + ";")]
        if not any(_ARITH_ASSIGN_RE.search(s) or _ARITH_BINARY_RE.search(s) for s in risky):
            continue  # only `i++`-style loop counters: the common safe gas optimisation

        enclosing = None
        for fm, fo, fc in funcs:
            if fo < m.start() < fc:
                enclosing = fm
        fn_name = enclosing.group("name") if enclosing else None
        params = []
        if enclosing:
            params = [p.strip().split()[-1] for p in enclosing.group("params").split(",") if p.strip()]
        public = bool(enclosing and re.search(r"\b(public|external)\b", enclosing.group("header")))
        uses_param = any(re.search(rf"\b{re.escape(p)}\b", body) for p in params)
        impact = "High" if (public and uses_param) else "Medium"

        start, end = _line_of(clean, m.start()), _line_of(clean, close_idx)
        detector_id = "prism-unchecked-arithmetic"
        findings.append(
            Finding(
                finding_id=_finding_id(detector_id, fn_name, start, end),
                detector_id=detector_id,
                vulnerability_family="integer_overflow",
                title=detector_id,
                impact=impact,
                confidence="Medium",
                contract=_contract_name_at(clean, m.start()),
                function=fn_name,
                source_file=file_name,
                line_start=start,
                line_end=end,
                source_snippet=_snippet(lines, start, end),
                vulnerability_features={
                    "external_call": False,
                    "state_update_after_call": False,
                    "value_transfer": False,
                    "uses_msg_sender": "msg.sender" in body,
                    "uses_tx_origin": False,
                    "delegatecall": False,
                    "unchecked_external_call": False,
                    "unchecked_arithmetic": True,
                },
                description=(
                    "Arithmetic inside an `unchecked` block disables Solidity 0.8's overflow/underflow "
                    "checks."
                    + (" The operation uses a caller-supplied value, so it can be overflowed on purpose."
                       if impact == "High" else "")
                ),
            )
        )
    return findings


def detect_legacy_overflow(source: str, file_name: str) -> list[Finding]:
    """Solidity < 0.8 has no built-in overflow checks; flag it unless SafeMath is used."""
    clean = _blank_comments(source)
    pragma = re.search(r"pragma\s+solidity\s+([^;]+);", clean)
    if not pragma:
        return []
    versions = re.findall(r"(\d+)\.(\d+)\.(\d+)", pragma.group(1))
    if not versions or min((int(a), int(b)) for a, b, _ in versions) >= (0, 8):
        return []
    if re.search(r"\bSafeMath\b", clean):
        return []
    if not re.search(r"[+\-*]=|\w\s*[+\-*]\s*\w", clean[pragma.end():]):
        return []

    line = _line_of(clean, pragma.start())
    detector_id = "prism-integer-overflow-legacy"
    return [
        Finding(
            finding_id=_finding_id(detector_id, None, line, line),
            detector_id=detector_id,
            vulnerability_family="integer_overflow",
            title=detector_id,
            impact="High",
            confidence="Medium",
            contract=_contract_name_at(clean, len(clean)),
            function=None,
            source_file=file_name,
            line_start=line,
            line_end=line,
            source_snippet=source.splitlines()[line - 1] if source.splitlines() else None,
            vulnerability_features={"unchecked_arithmetic": True},
            description=(
                "The contract targets Solidity < 0.8, which does not revert on integer overflow/"
                "underflow, and does not use SafeMath."
            ),
        )
    ]


def run_custom_detectors(source: str, file_name: str) -> list[Finding]:
    return (
        detect_missing_access_control(source, file_name)
        + detect_unchecked_arithmetic(source, file_name)
        + detect_legacy_overflow(source, file_name)
    )
