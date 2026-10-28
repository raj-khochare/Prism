"""
Scenario E: Soak Test
Purpose: Sustained load over an extended duration (default 30-60 min) to uncover:
- Memory leaks
- Connection pool depletion
- JVM Garbage Collection pauses
- Database transaction buildup
"""

class SoakTestConfig:
    NAME = "soak_test"
    DESCRIPTION = "Long-duration endurance testing to detect memory leaks, latency drift, and connection exhaustion."
    DEFAULT_USERS = 25
    DEFAULT_SPAWN_RATE = 2
    DEFAULT_DURATION = "30m"

    @classmethod
    def get_cli_args(cls, host: str, csv_prefix: str, duration: str = None, users: int = None) -> list[str]:
        target_users = users or cls.DEFAULT_USERS
        target_duration = duration or cls.DEFAULT_DURATION
        return [
            "--headless",
            "--host", host,
            "--users", str(target_users),
            "--spawn-rate", str(cls.DEFAULT_SPAWN_RATE),
            "--run-time", target_duration,
            "--csv", csv_prefix,
            "--only-summary"
        ]
