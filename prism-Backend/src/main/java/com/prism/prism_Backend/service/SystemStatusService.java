package com.prism.prism_Backend.service;

import com.prism.prism_Backend.blockchain.RuntimeMonitorService;
import com.prism.prism_Backend.integration.MlScoringClient;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.List;
import java.util.Map;

/** Real health checks. The old endpoint returned "Operational" for everything, always. */
@Service
public class SystemStatusService {

    private final RuntimeMonitorService monitor;
    private final MlScoringClient ml;
    private final RestClient analyzer;

    public SystemStatusService(RuntimeMonitorService monitor, MlScoringClient ml,
                               @Value("${prism.services.slither-base-url}") String analyzerUrl) {
        this.monitor = monitor;
        this.ml = ml;
        var f = new SimpleClientHttpRequestFactory();
        f.setConnectTimeout(1_500);
        f.setReadTimeout(1_500);
        this.analyzer = RestClient.builder().baseUrl(analyzerUrl).requestFactory(f).build();
    }

    // Health of the analyzer is cached for a few seconds: the Overview page polls this and a
    // down analyzer used to add its full connect timeout to every single page load.
    private static final long HEALTH_CACHE_MS = 10_000;
    private volatile long healthCheckedAt = 0;
    private volatile boolean cachedUp = false;
    private volatile long cachedMs = 0;

    private synchronized void refreshAnalyzerHealth() {
        if (System.currentTimeMillis() - healthCheckedAt < HEALTH_CACHE_MS) return;
        long t0 = System.nanoTime();
        try {
            analyzer.get().uri("/health").retrieve().toBodilessEntity();
            cachedUp = true;
        } catch (Exception e) {
            cachedUp = false;
        }
        cachedMs = (System.nanoTime() - t0) / 1_000_000;
        healthCheckedAt = System.currentTimeMillis();
    }

    public List<Map<String, String>> components() {
        var chain = monitor.status();
        refreshAnalyzerHealth();
        boolean analyzerUp = cachedUp;
        long ms = cachedMs;

        return List.of(
                row("Core API", "Operational", "-", "Spring Boot"),
                row("RPC Provider", chain.up() ? "Connected" : "Disconnected", "-", chain.up() ? "JSON-RPC node" : "Retrying..."),
                row("Block Sync", chain.up() ? "Synchronized" : "Unavailable", "-", chain.head() == null ? "No block yet" : "Head #" + chain.head()),
                row("Analysis Engine", analyzerUp ? "Available" : "Unavailable", analyzerUp ? ms + "ms" : "-", "Slither + custom detectors"),
                row("ML Risk Engine", "Available", "-", ml.modelName() + " " + ml.modelVersion())
        );
    }

    private static Map<String, String> row(String component, String status, String latency, String target) {
        return Map.of("component", component, "status", status, "latency", latency, "target", target);
    }
}
