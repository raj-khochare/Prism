"""
Scenario D: Stress Test
Purpose: Push system beyond normal operating bounds to identify saturation and failure thresholds.
Includes safety tripwires (stops early if failure rate or response time exceeds thresholds).
"""

from locust import LoadTestShape

class StressTestConfig:
    NAME = "stress_test"
    DESCRIPTION = "Aggressive ramp-up to determine saturation points and resource limits with safety stops."
    MAX_USERS = 150
    SPAWN_RATE = 10
    DURATION = "5m"
    
    # Safety thresholds
    MAX_ALLOWED_FAILURE_RATE = 0.08  # Stop if failure rate > 8%
    MAX_ALLOWED_AVG_RESPONSE_TIME = 2500  # Stop if avg response time > 2500ms

    @classmethod
    def get_cli_args(cls, host: str, csv_prefix: str) -> list[str]:
        return [
            "--headless",
            "--host", host,
            "--users", str(cls.MAX_USERS),
            "--spawn-rate", str(cls.SPAWN_RATE),
            "--run-time", cls.DURATION,
            "--csv", csv_prefix,
            "--only-summary"
        ]


class StressTestShape(LoadTestShape):
    """Gradually ramps up users every 30 seconds up to MAX_USERS."""
    time_limit = 300
    max_users = 150
    spawn_rate = 10

    def tick(self):
        run_time = self.get_run_time()
        if run_time > self.time_limit:
            return None
        
        # Check safety thresholds
        stats = self.runner.stats.total
        if stats.num_requests > 50:
            fail_ratio = stats.fail_ratio
            avg_response_time = stats.avg_response_time
            if fail_ratio > StressTestConfig.MAX_ALLOWED_FAILURE_RATE:
                # Halt test safely
                return None
            if avg_response_time > StressTestConfig.MAX_ALLOWED_AVG_RESPONSE_TIME:
                return None

        # Ramp up formula
        current_users = min(self.max_users, int((run_time / 30) + 1) * 15)
        return current_users, self.spawn_rate
