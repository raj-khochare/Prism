"""
High-Scale Test Scenario: 100 Concurrent Users / 50,000+ Request Target
Configured for:
- Maximum concurrent users: 100
- Spawn rate: 10 users per second
- Max duration: 60 minutes
- Target requests: 50,000
- Pilot mode: 100 users, 10 users/sec, 45 seconds validation
- Emergency stops: >5% failures or >2000ms average response time
"""

class Scale50kConfig:
    NAME = "scale_50k"
    DESCRIPTION = "High-concurrency 100-user throughput test targeting 50,000+ validated requests."
    
    # Full run configuration
    MAX_USERS = 100
    SPAWN_RATE = 10
    MAX_DURATION = "60m"
    TARGET_REQUESTS = 50000

    # Short Pilot configuration
    PILOT_USERS = 100
    PILOT_SPAWN_RATE = 10
    PILOT_DURATION = "45s"  # 10s ramp to 100 users + 35s verification

    # Safety tripwires
    MAX_ALLOWED_FAILURE_RATE = 0.05       # Stop if unexpected failures > 5%
    MAX_ALLOWED_AVG_RESPONSE_TIME = 2000.0 # Stop if avg response time > 2000ms
    MIN_FREE_HOST_RAM_MB = 1000.0         # Stop if host RAM drops below 1 GB

    @classmethod
    def get_pilot_args(cls, host: str, csv_prefix: str) -> list[str]:
        return [
            "--headless",
            "--host", host,
            "--users", str(cls.PILOT_USERS),
            "--spawn-rate", str(cls.PILOT_SPAWN_RATE),
            "--run-time", cls.PILOT_DURATION,
            "--csv", csv_prefix,
            "--only-summary"
        ]

    @classmethod
    def get_full_args(cls, host: str, csv_prefix: str) -> list[str]:
        return [
            "--headless",
            "--host", host,
            "--users", str(cls.MAX_USERS),
            "--spawn-rate", str(cls.SPAWN_RATE),
            "--run-time", cls.MAX_DURATION,
            "--csv", csv_prefix,
            "--only-summary"
        ]
