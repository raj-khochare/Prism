package com.prism.prism_Backend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling // drives RuntimeMonitorService block polling
public class PrismBackendApplication {

	public static void main(String[] args) {
		SpringApplication.run(PrismBackendApplication.class, args);
	}

}
