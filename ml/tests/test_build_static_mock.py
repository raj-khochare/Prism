"""Exercises build_dataset's static path against a tiny fake backend (login, scan, list, features, delete)."""
import json
import sys
import threading
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from build_dataset import rows_from_static_manifest  # noqa: E402
from prism_ml.schema import FEATURES  # noqa: E402

STATE = {"contracts": {}, "deleted": []}


class H(BaseHTTPRequestHandler):
    def log_message(self, *a):
        pass

    def _send(self, code, body=None):
        data = json.dumps(body).encode() if body is not None else b""
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_POST(self):
        n = int(self.headers.get("Content-Length", 0))
        body = json.loads(self.rfile.read(n) or b"{}")
        if self.path == "/api/auth/login":
            return self._send(200, {"token": "t", "username": body["identifier"]})
        if self.path == "/api/scan":
            if "BROKEN" in body["sourceCode"]:
                return self._send(500, {"message": "boom"})
            name = body["fileName"].removesuffix(".sol")
            STATE["contracts"][name] = f"id-{name}"
            return self._send(200, {"fileName": body["fileName"], "findings": []})
        self._send(404)

    def do_GET(self):
        if self.path.startswith("/api/contracts?"):
            items = [{"id": i, "name": n} for n, i in STATE["contracts"].items()]
            return self._send(200, {"items": items})
        if self.path.endswith("/features"):
            fv = {k: 0 for k in FEATURES}
            fv["reentrancyPattern"] = True
            fv["staticRiskContribution"] = 40.0
            return self._send(200, fv)
        self._send(404)

    def do_DELETE(self):
        STATE["deleted"].append(self.path)
        self._send(204)


def test_static_rows_login_scan_cleanup_and_failure_log(tmp_path):
    srv = HTTPServer(("127.0.0.1", 0), H)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    ok, bad = tmp_path / "good_one.sol", tmp_path / "bad_one.sol"
    ok.write_text("contract A {}")
    bad.write_text("BROKEN")
    man = tmp_path / "m.csv"
    pd.DataFrame([
        {"path": str(ok), "label": 1, "attack_class": "reentrancy", "group": "g1", "source": "t"},
        {"path": str(bad), "label": 0, "attack_class": "benign", "group": "g2", "source": "t"},
    ]).to_csv(man, index=False)
    failed = tmp_path / "failed.csv"
    df = rows_from_static_manifest(man, f"http://127.0.0.1:{srv.server_port}", "", "u", "p", False, failed)
    srv.shutdown()
    assert len(df) == 1 and df.iloc[0]["label"] == 1 and df.iloc[0]["group"] == "g1"
    assert df.iloc[0]["flashLoanDetected"] == 0 and df.iloc[0]["gasAnomalyIndex"] == 1.0  # neutral runtime side
    assert STATE["deleted"] == ["/api/contracts/id-good_one"]           # cleaned up
    assert "bad_one" in failed.read_text()                              # failure recorded, run continued
