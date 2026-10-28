"""
Scenario C: Load Test (Stepped Progression)
Purpose: Measure performance degradation across increasing concurrency tiers (10 -> 25 -> 50 -> 100 users).
"""

import logging
from locust import LoadTestShape

logger = logging.getLogger("locust.scenarios.load")

class LoadTestConfig:
    NAME = "load_test"
    DESCRIPTION = "Stepped concurrency scaling (10 -> 25 -> 50 users) over 5 minutes to measure response time degradation."
    DEFAULT_USERS = 50
    DEFAULT_SPAWN_RATE = 5
    DEFAULT_DURATION = "5m"

    # Stage definition: (duration_in_seconds, user_count, spawn_rate)
    # Stage 1: 0-60s -> 10 users
    # Stage 2: 60-180s -> 25 users
    # Stage 3: 180-300s -> 50 users
    STAGES = [
        {"duration": 60, "users": 10, "spawn_rate": 2, "name": "Stage 1 (10 Users)"},
        {"duration": 180, "users": 25, "spawn_rate": 5, "name": "Stage 2 (25 Users)"},
        {"duration": 300, "users": 50, "spawn_rate": 5, "name": "Stage 3 (50 Users)"},
    ]

    # Safety tripwire thresholds
    MAX_ALLOWED_FAILURE_RATE = 0.05  # Stop if failure rate > 5%
    MAX_ALLOWED_AVG_RESPONSE_TIME = 2000.0  # Stop if avg response time > 2000ms

    @classmethod
    def get_cli_args(cls, host: str, csv_prefix: str) -> list[str]:
        return [
            "--headless",
            "--host", host,
            "--csv", csv_prefix,
            "--only-summary"
        ]


class SteppedLoadTestShape(LoadTestShape):
    """Locust custom shape for stepped load testing capped at 50 users / 5 min."""
    stages = LoadTestConfig.STAGES

    def tick(self):
        run_time = self.get_run_time()

        # Check safety thresholds if sufficient requests have been executed
        stats = self.runner.stats.total
        if stats.num_requests > 50:
            if stats.fail_ratio > LoadTestConfig.MAX_ALLOWED_FAILURE_RATE:
                logger.error(
                    "Safety tripwire triggered: failure rate exceeded 5%% (current: %.2f%%). Stopping test.",
                    stats.fail_ratio * 100
                )
                return None
            if stats.avg_response_time > LoadTestConfig.MAX_ALLOWED_AVG_RESPONSE_TIME:
                logger.error(
                    "Safety tripwire triggered: avg latency exceeded 2000ms (current: %.1fms). Stopping test.",
                    stats.avg_response_time
                )
                return None

        for stage in self.stages:
            if run_time < stage["duration"]:
                return stage["users"], stage["spawn_rate"]
        return None
