"""
Scenario A: Smoke Test
Purpose: Quick validation of endpoints, authentication, and configurations under minimal load.
Target: 1-5 concurrent users, ~60 seconds.
"""

class SmokeTestConfig:
    USERS = 5
    SPAWN_RATE = 1
    DURATION = "1m"
    NAME = "smoke_test"
    DESCRIPTION = "Quick verification of API health and authentication with minimal concurrency."

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
