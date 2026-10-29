package com.prism.prism_Backend.integration;

import com.prism.prism_Backend.dto.FeatureVector;
import com.prism.prism_Backend.dto.MlScoreResult;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Primary;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.Map;

/**
 * Calls the XGBoost/SHAP FastAPI service (ml-service, port 8002). Enabled with ML_ENABLED=true;
 * with the flag off (the default) the rule-based baseline is used, so the project still runs
 * before the model exists. If the service is down the baseline is used for that call, so a demo
 * never dies because the ML container did.
 *
 * Wire format: the FeatureVector is sent as camelCase JSON (Spring's default) and the service
 * answers {score, band, confidence, factors:[{featureName, contribution}]} (also camelCase),
 * which maps 1:1 onto MlScoreResult.
 */
@Component
@Primary
@ConditionalOnProperty(name = "prism.ml.enabled", havingValue = "true")
public class RestMlScoringClient implements MlScoringClient {

    private static final Logger log = LoggerFactory.getLogger(RestMlScoringClient.class);

    private final RestClient restClient;
    private final StubMlScoringClient fallback;
    private volatile String name = "XGBoost + SHAP";
    private volatile String version = "unknown";
    private volatile String description = "Gradient-boosted trees over the 20 FeatureVector fields; SHAP attributions.";
    private volatile boolean infoLoaded = false;
    /** True while the last score had to come from the baseline, so the UI never names a model that did not score. */
    private volatile boolean degraded = false;

    public RestMlScoringClient(StubMlScoringClient fallback,
                               @Value("${prism.services.ml-base-url}") String baseUrl,
                               @Value("${prism.services.ml-timeout-seconds:5}") long timeoutSeconds) {
        this.fallback = fallback;
        var factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(2_000);
        factory.setReadTimeout((int) (timeoutSeconds * 1000));
        this.restClient = RestClient.builder().baseUrl(baseUrl).requestFactory(factory).build();
    }

    @Override
    public MlScoreResult score(FeatureVector features) {
        try {
            MlScoreResult result = restClient.post().uri("/score").body(features)
                    .retrieve().body(MlScoreResult.class);
            if (result == null || result.band() == null) {
                throw new IllegalStateException("empty response from ml-service");
            }
            degraded = false;
            return result;
        } catch (RuntimeException e) {
            degraded = true;
            log.warn("ML service unavailable ({}); using the rule-based baseline for this score.",
                    e.getClass().getSimpleName());
            return fallback.score(features);
        }
    }

    private void loadInfo() {
        if (infoLoaded) return;
        try {
            Map<String, String> info = restClient.get().uri("/info").retrieve()
                    .body(new ParameterizedTypeReference<Map<String, String>>() {});
            if (info != null) {
                name = info.getOrDefault("name", name);
                version = info.getOrDefault("version", version);
                description = info.getOrDefault("description", description);
                infoLoaded = true;
            }
        } catch (RuntimeException e) {
            // keep the defaults; try again on the next call
        }
    }

    @Override
    public String modelName() {
        if (degraded) return fallback.modelName() + " (ML service unavailable)";
        loadInfo();
        return name;
    }

    @Override
    public String modelVersion() {
        if (degraded) return fallback.modelVersion();
        loadInfo();
        return version;
    }

    @Override
    public String modelDescription() {
        if (degraded) return fallback.modelDescription();
        loadInfo();
        return description;
    }
}
