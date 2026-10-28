import logging
import random
import uuid
from locust import TaskSet, task
from config import Config

logger = logging.getLogger("locust.tasks.authenticated")

class AuthenticatedApiTasks(TaskSet):
    """
    TaskSet simulating logged-in user behavior across PRISM backend endpoints.
    Handles JWT headers, dynamic entity IDs, read and write operations.
    """

    def on_start(self):
        """Ensure token is available on the parent user instance."""
        self.headers = getattr(self.user, "auth_headers", {})
        self.known_contract_ids = getattr(self.user, "cached_contract_ids", [])
        self.known_alert_ids = getattr(self.user, "cached_alert_ids", [])

    @task(6)
    def get_overview(self):
        """Load primary dashboard overview data."""
        with self.client.get(
            "/api/overview",
            headers=self.headers,
            name="GET /api/overview",
            timeout=Config.REQUEST_TIMEOUT,
            catch_response=True
        ) as response:
            if response.status_code == 200:
                data = response.json()
                if "securityStatus" in data and "systemStatus" in data:
                    response.success()
                else:
                    response.failure("Overview missing expected keys")
            elif response.status_code == 401:
                response.failure("Unauthorized: JWT token expired or invalid")
            else:
                response.failure(f"HTTP {response.status_code}")

    @task(4)
    def get_system_status(self):
        """Check status of interconnected PRISM services."""
        with self.client.get(
            "/api/system/status",
            headers=self.headers,
            name="GET /api/system/status",
            timeout=Config.REQUEST_TIMEOUT,
            catch_response=True
        ) as response:
            if response.status_code == 200:
                response.success()
            else:
                response.failure(f"HTTP {response.status_code}")

    @task(5)
    def list_contracts(self):
        """List and search contracts with varying pagination and filters."""
        chains = ["All", "Ethereum Mainnet", "Local (Hardhat fork)"]
        selected_chain = random.choice(chains)
        page = random.choice([1, 2])
        params = {
            "chain": selected_chain,
            "page": page,
            "pageSize": 10,
            "sortBy": "riskScore",
            "sortDir": "desc"
        }
        with self.client.get(
            "/api/contracts",
            params=params,
            headers=self.headers,
            name="GET /api/contracts",
            timeout=Config.REQUEST_TIMEOUT,
            catch_response=True
        ) as response:
            if response.status_code == 200:
                data = response.json()
                items = data.get("items", [])
                # Update cached contract IDs for dependent calls
                for item in items:
                    cid = item.get("id")
                    if cid and cid not in self.known_contract_ids:
                        self.known_contract_ids.append(cid)
                response.success()
            else:
                response.failure(f"HTTP {response.status_code}")

    @task(3)
    def get_contract_details(self):
        """Fetch details of a specific contract if any ID is discovered."""
        if not self.known_contract_ids:
            return

        contract_id = random.choice(self.known_contract_ids)
        with self.client.get(
            f"/api/contracts/{contract_id}",
            headers=self.headers,
            name="GET /api/contracts/[id]",
            timeout=Config.REQUEST_TIMEOUT,
            catch_response=True
        ) as response:
            if response.status_code == 200:
                response.success()
            elif response.status_code == 404:
                response.failure("Contract ID not found")
            else:
                response.failure(f"HTTP {response.status_code}")

    @task(4)
    def list_findings(self):
        """Filter and browse static analysis findings."""
        severities = ["All", "Critical", "High", "Medium", "Low"]
        params = {
            "severity": random.choice(severities),
            "page": 1,
            "pageSize": 10
        }
        with self.client.get(
            "/api/findings",
            params=params,
            headers=self.headers,
            name="GET /api/findings",
            timeout=Config.REQUEST_TIMEOUT,
            catch_response=True
        ) as response:
            if response.status_code == 200:
                response.success()
            else:
                response.failure(f"HTTP {response.status_code}")

    @task(3)
    def list_alerts(self):
        """Browse security alerts and cache alert IDs."""
        with self.client.get(
            "/api/alerts",
            params={"page": 1, "pageSize": 10},
            headers=self.headers,
            name="GET /api/alerts",
            timeout=Config.REQUEST_TIMEOUT,
            catch_response=True
        ) as response:
            if response.status_code == 200:
                data = response.json()
                for alert in data.get("items", []):
                    aid = alert.get("id")
                    if aid and aid not in self.known_alert_ids:
                        self.known_alert_ids.append(aid)
                response.success()
            else:
                response.failure(f"HTTP {response.status_code}")

    @task(2)
    def get_alert_config(self):
        """Inspect alert threshold settings."""
        with self.client.get(
            "/api/alerts/config",
            headers=self.headers,
            name="GET /api/alerts/config",
            timeout=Config.REQUEST_TIMEOUT,
            catch_response=True
        ) as response:
            if response.status_code == 200:
                response.success()
            else:
                response.failure(f"HTTP {response.status_code}")

    @task(3)
    def get_runtime_telemetry(self):
        """Fetch real-time transaction and gas telemetry for a contract."""
        if not self.known_contract_ids:
            return

        contract_id = random.choice(self.known_contract_ids)
        with self.client.get(
            f"/api/runtime/telemetry?contractId={contract_id}",
            headers=self.headers,
            name="GET /api/runtime/telemetry",
            timeout=Config.REQUEST_TIMEOUT,
            catch_response=True
        ) as response:
            if response.status_code == 200:
                response.success()
            else:
                response.failure(f"HTTP {response.status_code}")

    @task(3)
    def get_runtime_events(self):
        """Query runtime blockchain anomaly events."""
        with self.client.get(
            "/api/runtime/events",
            params={"page": 1, "pageSize": 10},
            headers=self.headers,
            name="GET /api/runtime/events",
            timeout=Config.REQUEST_TIMEOUT,
            catch_response=True
        ) as response:
            if response.status_code == 200:
                response.success()
            else:
                response.failure(f"HTTP {response.status_code}")

    @task(3)
    def get_risk_decomposition(self):
        """Fetch risk decomposition and SHAP factor contributions."""
        if not self.known_contract_ids:
            return

        contract_id = random.choice(self.known_contract_ids)
        with self.client.get(
            f"/api/contracts/{contract_id}/risk",
            headers=self.headers,
            name="GET /api/contracts/[id]/risk",
            timeout=Config.REQUEST_TIMEOUT,
            catch_response=True
        ) as response:
            if response.status_code == 200:
                response.success()
            else:
                response.failure(f"HTTP {response.status_code}")

    @task(2)
    def get_contract_features(self):
        """Fetch 20-feature risk vector for a contract."""
        if not self.known_contract_ids:
            return

        contract_id = random.choice(self.known_contract_ids)
        with self.client.get(
            f"/api/contracts/{contract_id}/features",
            headers=self.headers,
            name="GET /api/contracts/[id]/features",
            timeout=Config.REQUEST_TIMEOUT,
            catch_response=True
        ) as response:
            if response.status_code == 200:
                response.success()
            else:
                response.failure(f"HTTP {response.status_code}")

    @task(1)
    def safe_contract_lifecycle(self):
        """
        Controlled write & delete cycle:
        1. Register an identifiable temporary test contract.
        2. Immediately delete it to maintain zero residual test state.
        Only executed if user has DEVELOPER role.
        """
        # Generate random unique address: 0x followed by 40 hex digits
        random_hex = uuid.uuid4().hex + uuid.uuid4().hex[:8]
        test_address = f"0x{random_hex.lower()}"
        test_name = f"LoadTestContract_{uuid.uuid4().hex[:6]}"

        payload = {
            "name": test_name,
            "address": test_address,
            "chain": "Local (Hardhat fork)"
        }

        # Step 1: Register contract
        with self.client.post(
            "/api/contracts",
            json=payload,
            headers=self.headers,
            name="POST /api/contracts [Register Test Contract]",
            timeout=Config.REQUEST_TIMEOUT,
            catch_response=True
        ) as response:
            if response.status_code == 200:
                created_id = response.json().get("id")
                response.success()
            elif response.status_code == 403:
                # User lacks DEVELOPER role - expected if configured as REVIEWER
                response.success()
                return
            else:
                response.failure(f"Contract creation failed: HTTP {response.status_code}")
                return

        # Step 2: Safe cleanup
        if created_id:
            with self.client.delete(
                f"/api/contracts/{created_id}",
                headers=self.headers,
                name="DELETE /api/contracts/[id] [Cleanup]",
                timeout=Config.REQUEST_TIMEOUT,
                catch_response=True
            ) as del_response:
                if del_response.status_code in (200, 204):
                    del_response.success()
                else:
                    del_response.failure(f"Cleanup delete failed: HTTP {del_response.status_code}")
