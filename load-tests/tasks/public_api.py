import json
import logging
from locust import TaskSet, task
from config import Config

logger = logging.getLogger("locust.tasks.public")

class PublicApiTasks(TaskSet):
    """TaskSet for public, unauthenticated, and authentication verification endpoints."""

    @task(5)
    def health_check(self):
        """Verify the service liveness/readiness endpoint."""
        with self.client.get(
            "/actuator/health",
            name="GET /actuator/health [Public]",
            timeout=Config.REQUEST_TIMEOUT,
            catch_response=True
        ) as response:
            if response.status_code == 200:
                try:
                    data = response.json()
                    if data.get("status") in ("UP", "RESTRICTED"):
                        response.success()
                    else:
                        response.failure(f"Unhealthy status: {data.get('status')}")
                except Exception as exc:
                    response.failure(f"Failed to parse JSON: {exc}")
            else:
                response.failure(f"Unexpected status code: {response.status_code}")

    @task(3)
    def verify_auth_enforcement(self):
        """
        Verify that protected endpoints correctly enforce authentication.
        Expects HTTP 401 Unauthorized without Bearer token.
        """
        # Explicitly make request without authorization headers
        with self.client.get(
            "/api/overview",
            headers={"Authorization": ""},
            name="GET /api/overview [Expected 401]",
            timeout=Config.REQUEST_TIMEOUT,
            catch_response=True
        ) as response:
            if response.status_code == 401:
                response.success()
            elif response.status_code == 200:
                response.failure("Security violation: unauthenticated request received HTTP 200!")
            else:
                response.failure(f"Unexpected response code for unauthenticated request: {response.status_code}")

    @task(2)
    def test_invalid_login(self):
        """
        Verify that bad credentials produce HTTP 401 rather than unhandled 500.
        """
        payload = {
            "identifier": "non_existent_user_99999",
            "password": "wrong_password_xyz"
        }
        with self.client.post(
            "/api/auth/login",
            json=payload,
            name="POST /api/auth/login [Expected 401]",
            timeout=Config.REQUEST_TIMEOUT,
            catch_response=True
        ) as response:
            if response.status_code == 401:
                response.success()
            else:
                response.failure(f"Expected 401 for bad credentials, got: {response.status_code}")

    @task(2)
    def test_validation_rules(self):
        """
        Verify that malformed registration request returns HTTP 400.
        """
        # Password shorter than required 8 characters
        payload = {
            "username": "bad",
            "email": "invalid-email",
            "password": "short"
        }
        with self.client.post(
            "/api/auth/register",
            json=payload,
            name="POST /api/auth/register [Expected 400]",
            timeout=Config.REQUEST_TIMEOUT,
            catch_response=True
        ) as response:
            if response.status_code == 400:
                response.success()
            else:
                response.failure(f"Expected 400 for invalid payload, got: {response.status_code}")
