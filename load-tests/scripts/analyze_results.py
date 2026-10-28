#!/usr/bin/env python3
"""
PRISM Load Test Results Analyzer
Parses Locust CSV exports, calculates precise percentile metrics,
evaluates against defined SLO thresholds, and generates Markdown and JSON reports.
"""

import os
import sys
import csv
import json
import argparse
from datetime import datetime
from pathlib import Path

# Add parent directory to path so config can be imported
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from config import Config

def parse_stats_csv(stats_file_path: Path):
    """
    Parses Locust _stats.csv file.
    Returns: (list of endpoint dicts, aggregated summary dict)
    """
    if not stats_file_path.exists():
        raise FileNotFoundError(f"Stats file not found: {stats_file_path}")

    endpoints = []
    aggregated = None

    with open(stats_file_path, mode="r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row in reader:
            # Clean keys
            cleaned_row = {k.strip(): (v.strip() if v else "") for k, v in row.items() if k}
            name = cleaned_row.get("Name", "")
            req_type = cleaned_row.get("Type", "")

            # Check for Aggregated row
            if "Aggregated" in name or not req_type:
                aggregated = cleaned_row
            else:
                endpoints.append(cleaned_row)

    return endpoints, aggregated


def parse_failures_csv(failures_file_path: Path):
    """
    Parses Locust _failures.csv file.
    Returns list of failure dicts: [{"Method", "Name", "Error", "Occurrences"}]
    """
    if not failures_file_path.exists():
        return []

    failures = []
    with open(failures_file_path, mode="r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row in reader:
            cleaned_row = {k.strip(): (v.strip() if v else "") for k, v in row.items() if k}
            if cleaned_row.get("Occurrences"):
                failures.append(cleaned_row)

    return failures


def parse_history_stages(history_file_path: Path):
    """
    Parses Locust _stats_history.csv file and aggregates metrics by user concurrency stage.
    """
    if not history_file_path.exists():
        return []

    rows = []
    with open(history_file_path, mode="r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for r in reader:
            cleaned = {k.strip(): (v.strip() if v else "") for k, v in r.items() if k}
            if cleaned.get("Name") == "Aggregated" or not cleaned.get("Type"):
                rows.append(cleaned)

    if not rows:
        return []

    start_ts = safe_int(rows[0].get("Timestamp", 0))
    stages_def = [
        {"name": "Stage 1 (10 Users)", "targetUsers": 10, "start": 0, "end": 60},
        {"name": "Stage 2 (25 Users)", "targetUsers": 25, "start": 60, "end": 180},
        {"name": "Stage 3 (50 Users)", "targetUsers": 50, "start": 180, "end": 310},
    ]

    stages_result = []
    for s in stages_def:
        s_rows = []
        for r in rows:
            ts = safe_int(r.get("Timestamp", 0))
            elapsed = ts - start_ts
            if s["start"] <= elapsed < s["end"]:
                s_rows.append(r)
        if len(s_rows) >= 2:
            first_req = safe_int(s_rows[0].get("Total Request Count", 0))
            last_req = safe_int(s_rows[-1].get("Total Request Count", 0))
            first_fail = safe_int(s_rows[0].get("Total Failure Count", 0))
            last_fail = safe_int(s_rows[-1].get("Total Failure Count", 0))

            reqs_in_stage = max(0, last_req - first_req)
            fails_in_stage = max(0, last_fail - first_fail)
            fail_pct = (fails_in_stage / reqs_in_stage * 100) if reqs_in_stage > 0 else 0.0

            dur = max(1, safe_int(s_rows[-1].get("Timestamp")) - safe_int(s_rows[0].get("Timestamp")))
            rps = reqs_in_stage / dur if dur > 0 else 0.0

            p50_vals = [safe_float(r.get("50%")) for r in s_rows if r.get("50%") and r.get("50%") != "N/A"]
            p95_vals = [safe_float(r.get("95%")) for r in s_rows if r.get("95%") and r.get("95%") != "N/A"]
            p99_vals = [safe_float(r.get("99%")) for r in s_rows if r.get("99%") and r.get("99%") != "N/A"]

            avg_p50 = sum(p50_vals) / len(p50_vals) if p50_vals else 0.0
            avg_p95 = sum(p95_vals) / len(p95_vals) if p95_vals else 0.0
            avg_p99 = sum(p99_vals) / len(p99_vals) if p99_vals else 0.0
            users_in_stage = max(safe_int(r.get("User Count", 0)) for r in s_rows)

            stages_result.append({
                "stageName": s["name"],
                "targetUsers": s["targetUsers"],
                "actualUsers": users_in_stage,
                "durationSec": dur,
                "requests": reqs_in_stage,
                "failures": fails_in_stage,
                "failurePct": round(fail_pct, 2),
                "rps": round(rps, 2),
                "medianLatencyMs": round(avg_p50, 1),
                "p95LatencyMs": round(avg_p95, 1),
                "p99LatencyMs": round(avg_p99, 1),
            })

    return stages_result


def safe_float(val, default=0.0):
    try:
        return float(val)
    except (ValueError, TypeError):
        return default


def safe_int(val, default=0):
    try:
        return int(float(val))
    except (ValueError, TypeError):
        return default


def evaluate_slo(total_requests, failure_rate, p95, p99):
    """
    Evaluates benchmark results against configured SLO targets.
    """
    if total_requests == 0:
        return "INCONCLUSIVE", ["No requests were recorded during this test session."]

    violations = []
    if failure_rate > Config.SLO_MAX_FAILURE_RATE_PCT:
        violations.append(
            f"Failure Rate ({failure_rate:.2f}%) exceeded target threshold ({Config.SLO_MAX_FAILURE_RATE_PCT:.2f}%)"
        )
    if p95 > Config.SLO_MAX_P95_LATENCY_MS:
        violations.append(
            f"p95 Response Time ({p95:.1f}ms) exceeded target threshold ({Config.SLO_MAX_P95_LATENCY_MS:.1f}ms)"
        )
    if p99 > Config.SLO_MAX_P99_LATENCY_MS:
        violations.append(
            f"p99 Response Time ({p99:.1f}ms) exceeded target threshold ({Config.SLO_MAX_P99_LATENCY_MS:.1f}ms)"
        )

    if violations:
        return "FAIL", violations
    return "PASS", ["All measured latency and error metrics are within defined SLO targets."]


def generate_reports(csv_prefix: str, scenario_name: str, environment_info: dict = None):
    """
    Generates Markdown and JSON reports for a given Locust run.
    """
    prefix_path = Path(csv_prefix)
    stats_file = prefix_path.parent / f"{prefix_path.name}_stats.csv"
    failures_file = prefix_path.parent / f"{prefix_path.name}_failures.csv"

    endpoints, aggregated = parse_stats_csv(stats_file)
    failures = parse_failures_csv(failures_file)

    if not aggregated and endpoints:
        # Compute fallback aggregate if Locust did not write aggregate line
        total_req = sum(safe_int(e.get("Request Count")) for e in endpoints)
        total_fail = sum(safe_int(e.get("Failure Count")) for e in endpoints)
        aggregated = {
            "Request Count": str(total_req),
            "Failure Count": str(total_fail),
            "Requests/s": str(sum(safe_float(e.get("Requests/s")) for e in endpoints)),
            "50%": "N/A",
            "95%": "N/A",
            "99%": "N/A",
            "Average Response Time": "N/A"
        }

    total_requests = safe_int(aggregated.get("Request Count", 0))
    total_failures = safe_int(aggregated.get("Failure Count", 0))
    throughput_rps = safe_float(aggregated.get("Requests/s", 0.0))
    failure_rate = (total_failures / total_requests * 100) if total_requests > 0 else 0.0

    # Percentiles from Locust aggregate row
    # Locust column names may be '50%', '95%', '99%' or 'Median Response Time'
    median_latency = safe_float(aggregated.get("50%") or aggregated.get("Median Response Time", 0))
    avg_latency = safe_float(aggregated.get("Average Response Time", 0))
    p90_latency = safe_float(aggregated.get("90%", 0))
    p95_latency = safe_float(aggregated.get("95%", 0))
    p99_latency = safe_float(aggregated.get("99%", 0))
    min_latency = safe_float(aggregated.get("Min Response Time", 0))
    max_latency = safe_float(aggregated.get("Max Response Time", 0))

    outcome, slo_notes = evaluate_slo(total_requests, failure_rate, p95_latency, p99_latency)

    # Sort endpoints by latency (descending)
    sorted_endpoints = sorted(
        endpoints,
        key=lambda x: safe_float(x.get("95%") or x.get("Average Response Time", 0)),
        reverse=True
    )

    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    report_id = datetime.now().strftime("%Y%m%d_%H%M%S")

    history_file = prefix_path.parent / f"{prefix_path.name}_stats_history.csv"
    stages = parse_history_stages(history_file)

    # Build JSON Data
    report_data = {
        "reportId": report_id,
        "timestamp": timestamp,
        "scenario": scenario_name,
        "outcome": outcome,
        "targetHost": Config.BASE_URL,
        "sloEvaluation": {
            "status": outcome,
            "notes": slo_notes,
            "thresholds": {
                "maxFailureRatePct": Config.SLO_MAX_FAILURE_RATE_PCT,
                "maxP95LatencyMs": Config.SLO_MAX_P95_LATENCY_MS,
                "maxP99LatencyMs": Config.SLO_MAX_P99_LATENCY_MS
            }
        },
        "summary": {
            "totalRequests": total_requests,
            "successfulRequests": max(0, total_requests - total_failures),
            "totalFailures": total_failures,
            "failurePercentage": round(failure_rate, 3),
            "throughputRps": round(throughput_rps, 2),
            "target50kReached": total_requests >= 50000,
            "latencyMs": {
                "min": min_latency,
                "avg": round(avg_latency, 2),
                "median": median_latency,
                "p90": p90_latency,
                "p95": p95_latency,
                "p99": p99_latency,
                "max": max_latency
            }
        },
        "stages": stages,
        "endpointBreakdown": [
            {
                "method": ep.get("Type", ""),
                "name": ep.get("Name", ""),
                "requests": safe_int(ep.get("Request Count")),
                "failures": safe_int(ep.get("Failure Count")),
                "rps": safe_float(ep.get("Requests/s")),
                "avgMs": safe_float(ep.get("Average Response Time")),
                "p50Ms": safe_float(ep.get("50%")),
                "p95Ms": safe_float(ep.get("95%")),
                "p99Ms": safe_float(ep.get("99%")),
                "maxMs": safe_float(ep.get("Max Response Time"))
            }
            for ep in sorted_endpoints
        ],
        "failuresSummary": failures,
        "environment": environment_info or {
            "os": sys.platform,
            "pythonVersion": sys.version.split()[0],
            "targetService": "PRISM Spring Boot Backend (Docker container: prism_project-backend-1)"
        }
    }

    # Save JSON Report
    json_path = Config.REPORTS_DIR / f"{scenario_name}_{report_id}.json"
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(report_data, f, indent=2)

    # Save Markdown Report
    md_path = Config.REPORTS_DIR / f"{scenario_name}_{report_id}.md"
    md_content = build_markdown_report(report_data)
    with open(md_path, "w", encoding="utf-8") as f:
        f.write(md_content)

    print(f"\n==================================================")
    print(f" Load Test Completed: {scenario_name.upper()}")
    print(f" Outcome: {outcome}")
    print(f" Total Requests: {total_requests:,}")
    print(f" Failures: {total_failures} ({failure_rate:.2f}%)")
    print(f" Throughput: {throughput_rps:.2f} req/s")
    print(f" Response Times: Median={median_latency:.1f}ms | p95={p95_latency:.1f}ms | p99={p99_latency:.1f}ms")
    if stages:
        print("\n--- Concurrency Stages ---")
        for st in stages:
            print(f" * {st['stageName']}: {st['requests']} reqs | {st['rps']} req/s | p95={st['p95LatencyMs']}ms | fails={st['failures']}")
    print(f"\n Markdown Report: {md_path}")
    print(f" JSON Summary:    {json_path}")
    print(f"==================================================\n")

    return md_path, json_path, report_data


def build_markdown_report(data: dict) -> str:
    s = data["summary"]
    lat = s["latencyMs"]
    slo = data["sloEvaluation"]
    stages = data.get("stages", [])
    
    badge = "🟢 PASS" if data["outcome"] == "PASS" else "🔴 FAIL" if data["outcome"] == "FAIL" else "🟡 INCONCLUSIVE"

    md = []
    md.append(f"# PRISM Load Performance Report: {data['scenario'].replace('_', ' ').title()}")
    md.append(f"**Execution Date:** {data['timestamp']}  ")
    md.append(f"**Target Host:** `{data['targetHost']}`  ")
    md.append(f"**Result Status:** {badge}\n")

    md.append("## 1. Executive Summary")
    md.append("| Metric | Measured Value | Target SLO | Status |")
    md.append("| :--- | :--- | :--- | :--- |")
    
    fail_status = "✅ PASS" if s["failurePercentage"] <= slo["thresholds"]["maxFailureRatePct"] else "❌ FAIL"
    p95_status = "✅ PASS" if lat["p95"] <= slo["thresholds"]["maxP95LatencyMs"] else "❌ FAIL"
    p99_status = "✅ PASS" if lat["p99"] <= slo["thresholds"]["maxP99LatencyMs"] else "❌ FAIL"

    md.append(f"| **Total Requests** | {s['totalRequests']:,} | N/A | - |")
    md.append(f"| **Successfully Validated** | **{s.get('successfulRequests', s['totalRequests']):,}** | 100% target | ✅ Active |")
    if s.get("target50kReached") is not None and "scale" in data["scenario"].lower():
        t50k_badge = "✅ REACHED" if s["target50kReached"] else "⏳ IN-PROGRESS / PARTIAL"
        md.append(f"| **50,000 Request Target** | {s['totalRequests']:,} / 50,000 | 50,000 requests | {t50k_badge} |")
    md.append(f"| **Throughput** | **{s['throughputRps']:.2f} req/s** | Sustained load | Active |")
    md.append(f"| **Failure Rate** | {s['failurePercentage']:.2f}% ({s['totalFailures']} failed) | ≤ {slo['thresholds']['maxFailureRatePct']:.1f}% | {fail_status} |")
    md.append(f"| **Median Latency (p50)** | {lat['median']:.1f} ms | Baseline | - |")
    md.append(f"| **95th Percentile (p95)** | **{lat['p95']:.1f} ms** | ≤ {slo['thresholds']['maxP95LatencyMs']:.1f} ms | {p95_status} |")
    md.append(f"| **99th Percentile (p99)** | **{lat['p99']:.1f} ms** | ≤ {slo['thresholds']['maxP99LatencyMs']:.1f} ms | {p99_status} |")
    md.append(f"| **Min / Max Latency** | {lat['min']:.1f} ms / {lat['max']:.1f} ms | Operational bounds | - |\n")

    md.append("### SLO Evaluation Notes")
    for note in slo["notes"]:
        md.append(f"- {note}")
    md.append("")

    if stages:
        md.append("## 2. Concurrency Stage Progression (Stepped Load Breakdown)")
        md.append("| Stage | Target Users | Peak Users | Duration | Requests | Throughput | Failures | Median | p95 | p99 |")
        md.append("| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |")
        for st in stages:
            md.append(
                f"| **{st['stageName']}** | {st['targetUsers']} | {st['actualUsers']} | {st['durationSec']}s | "
                f"{st['requests']:,} | **{st['rps']:.1f} req/s** | {st['failures']} ({st['failurePct']}%) | "
                f"{st['medianLatencyMs']:.1f} ms | **{st['p95LatencyMs']:.1f} ms** | {st['p99LatencyMs']:.1f} ms |"
            )
        md.append("")

    section_num = "3" if stages else "2"
    md.append(f"## {section_num}. Endpoint Performance Breakdown")
    md.append("| Method | Endpoint | Reqs | Fails | RPS | Avg (ms) | p50 (ms) | p95 (ms) | p99 (ms) | Max (ms) |")
    md.append("| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |")
    for ep in data["endpointBreakdown"]:
        md.append(
            f"| `{ep['method']}` | {ep['name']} | {ep['requests']:,} | {ep['failures']} | {ep['rps']:.1f} | "
            f"{ep['avgMs']:.1f} | {ep['p50Ms']:.1f} | {ep['p95Ms']:.1f} | {ep['p99Ms']:.1f} | {ep['maxMs']:.1f} |"
        )
    md.append("")

    section_num = "4" if stages else "3"
    if data["failuresSummary"]:
        md.append(f"## {section_num}. Failure & Error Details")
        md.append("| Method | Endpoint | Error Description | Occurrences |")
        md.append("| :--- | :--- | :--- | :--- |")
        for f in data["failuresSummary"]:
            md.append(f"| `{f.get('Method', '')}` | {f.get('Name', '')} | {f.get('Error', '')} | {f.get('Occurrences', '')} |")
        md.append("")
    else:
        md.append(f"## {section_num}. Failure Analysis")
        md.append("✅ **Zero HTTP or business-level failures recorded during this benchmark session.**\n")

    section_num = "5" if stages else "4"
    md.append(f"## {section_num}. Test Environment & Architecture Context")
    env = data["environment"]
    md.append(f"- **Operating System:** `{env.get('os')}`")
    md.append(f"- **Python Runtime:** `{env.get('pythonVersion')}`")
    md.append(f"- **Backend Target:** `{env.get('targetService')}`")
    md.append(f"- **Host Machine Notice:** Running Locust load generators and application containers on the same host can introduce minor local scheduling contention during high concurrency.")
    md.append("")

    return "\n".join(md)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Analyze Locust test results CSV files.")
    parser.add_argument("--csv-prefix", required=True, help="Path prefix of generated CSV files (without _stats.csv).")
    parser.add_argument("--scenario", default="manual_test", help="Name of the scenario tested.")
    args = parser.parse_args()

    generate_reports(csv_prefix=args.csv_prefix, scenario_name=args.scenario)
