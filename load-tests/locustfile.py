import os
import logging
import random
import requests
from locust import HttpUser, between, events
from config import Config
from tasks.public_api import PublicApiTasks
from tasks.authenticated_api import AuthenticatedApiTasks

# Enable custom load shape when requested by runner
if os.getenv("USE_STEPPED_SHAPE", "").lower() == "true":
    from scenarios.load_test import SteppedLoadTestShape

logger = logging.getLogger("locust.prism")

class PrismPublicUser(HttpUser):
    """
    Simulates unauthenticated visitors, monitoring probes, and health checkers.
    """
    weight = 2
    wait_time = between(Config.MIN_WAIT, Config.MAX_WAIT)
    tasks = [PublicApiTasks]


class PrismAuthenticatedUser(HttpUser):
    """
    Simulates regular PRISM operators and developers navigating dashboards,
    inspecting contracts, checking findings, alerts, runtime anomalies, and risk scores.
    """
    weight = 8
    wait_time = between(Config.MIN_WAIT, Config.MAX_WAIT)
    tasks = [AuthenticatedApiTasks]

    def on_start(self):
        """Authenticate or register the user to acquire a JWT token."""
        self.auth_headers = {"Accept": "application/json"}
        self.cached_contract_ids = []
        self.cached_alert_ids = []

        token = Config.AUTH_TOKEN
        if not token:
            token = self._authenticate_or_register()

        if token:
            self.auth_headers["Authorization"] = f"Bearer {token}"
            self._prime_cache()

    def _authenticate_or_register(self) -> str:
        """Attempt login; if user does not exist, register the user."""
        login_url = f"{self.host.rstrip('/')}/api/auth/login"
        login_data = {
            "identifier": Config.TEST_USERNAME,
            "password": Config.TEST_PASSWORD
        }
        try:
            res = requests.post(login_url, json=login_data, timeout=Config.REQUEST_TIMEOUT)
            if res.status_code == 200:
                data = res.json()
                return data.get("token", "")
            
            # If user not found (HTTP 401), register
            if res.status_code == 401:
                register_url = f"{self.host.rstrip('/')}/api/auth/register"
                reg_data = {
                    "username": Config.TEST_USERNAME,
                    "email": f"{Config.TEST_USERNAME}@example.com",
                    "password": Config.TEST_PASSWORD,
                    "displayName": "LoadTest Automated User",
                    "role": Config.TEST_ROLE
                }
                reg_res = requests.post(register_url, json=reg_data, timeout=Config.REQUEST_TIMEOUT)
                if reg_res.status_code in (200, 201):
                    return reg_res.json().get("token", "")
                elif reg_res.status_code == 409:
                    # User was created concurrently by another worker, retry login
                    retry_res = requests.post(login_url, json=login_data, timeout=Config.REQUEST_TIMEOUT)
                    if retry_res.status_code == 200:
                        return retry_res.json().get("token", "")
        except Exception as exc:
            logger.warning(f"Failed to authenticate user {Config.TEST_USERNAME}: {exc}")
        return ""

    def _prime_cache(self):
        """Fetch the first page of contracts to seed contract IDs for detailed tasks."""
        try:
            contracts_url = f"{self.host.rstrip('/')}/api/contracts?page=1&pageSize=10"
            res = requests.get(contracts_url, headers=self.auth_headers, timeout=Config.REQUEST_TIMEOUT)
            if res.status_code == 200:
                data = res.json()
                for item in data.get("items", []):
                    cid = item.get("id")
                    if cid and cid not in self.cached_contract_ids:
                        self.cached_contract_ids.append(cid)
        except Exception as exc:
            logger.debug(f"Cache priming failed: {exc}")


@events.test_start.add_listener
def on_test_start(environment, **kwargs):
    logger.info("Starting PRISM Locust load test session against host: %s", environment.host)


@events.test_stop.add_listener
def on_test_stop(environment, **kwargs):
    logger.info("PRISM Locust load test session completed.")


_locust_env = None
_tripwire_triggered = False

@events.init.add_listener
def on_locust_init(environment, **kwargs):
    global _locust_env
    _locust_env = environment


@events.request.add_listener
def check_runtime_tripwires(request_type, name, response_time, response_length, exception, context, **kwargs):
    """
    Emergency stop tripwire:
    - Halts test immediately if unexpected failures > 5.0%
    - Halts test immediately if average response time > 2000 ms
    - Cleanly halts test once target request volume is satisfied
    """
    global _tripwire_triggered, _locust_env
    if _tripwire_triggered or not _locust_env or not _locust_env.runner:
        return

    stats = _locust_env.runner.stats.total
    if stats.num_requests > 50:
        # Tripwire 1: Failure rate > 5.0%
        if stats.fail_ratio > 0.05:
            _tripwire_triggered = True
            logger.critical(
                "EMERGENCY TRIPWIRE TRIGGERED: Failure rate reached %.2f%% (>5.0%%). Halting test immediately.",
                stats.fail_ratio * 100
            )
            _locust_env.runner.quit()
            return

        # Tripwire 2: Average latency > 2000 ms
        if stats.avg_response_time > 2000.0:
            _tripwire_triggered = True
            logger.critical(
                "EMERGENCY TRIPWIRE TRIGGERED: Average latency reached %.1fms (>2000ms). Halting test immediately.",
                stats.avg_response_time
            )
            _locust_env.runner.quit()
            return

    # Clean stop when target request count is reached
    target_reqs = int(os.getenv("TARGET_REQUESTS", "0"))
    if target_reqs > 0 and stats.num_requests >= target_reqs:
        _tripwire_triggered = True
        logger.info(
            "Target request threshold reached (%d / %d requests). Stopping test cleanly.",
            stats.num_requests, target_reqs
        )
        _locust_env.runner.quit()
