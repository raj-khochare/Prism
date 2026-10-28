package com.prism.prism_Backend;

import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

// Needs a live Postgres and JWT_SECRET_KEY; it failed on any plain `./gradlew test`.
@Disabled("Requires Postgres + env vars; covered by the docker compose smoke test")
@SpringBootTest
class PrismBackendApplicationTests {

	@Test
	void contextLoads() {
	}

}
