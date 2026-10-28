"""
Scenario B: Baseline Test
Purpose: Establish standard performance metrics (throughput, response time, error rate)
under normal single-tenant operational load.
Target: 10 concurrent users, 3 minutes.
"""

class BaselineTestConfig:
    USERS = 10
    SPAWN_RATE = 2
    DURATION = "3m"
    NAME = "baseline_test"
    DESCRIPTION = "Standard operational baseline to benchmark response latency and throughput."

    @classmethod
    def get_cli_args(cls, host: str, csv_prefix: str) -> list[str]:
        return [
            "--headless",
            "--host", host,
            "--users", str(cls.USERS),
            "--spawn-rate", str(cls.SPAWN_RATE),
            "--run-time", cls.DURATION,
            "--csv", csv_prefix,
            "--only-summary"
        ]
