package com.prism.prism_Backend.integration;

import com.prism.prism_Backend.dto.SlitherDtos.SlitherAnalyzeResponse;
import com.prism.prism_Backend.dto.StaticAnalysisResult;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;

import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Component
public class RestStaticAnalysisClient implements StaticAnalysisClient {

    private static final Logger log = LoggerFactory.getLogger(RestStaticAnalysisClient.class);

    /**
     * Slither never emits "Critical". These High-impact detectors are the ones that let an
     * attacker drain funds or take over the contract, so they are promoted to CRITICAL.
     * (Without this the whole Critical tier of the UI and the 40-point weight were dead.)
     */
    private static final Set<String> CRITICAL_DETECTORS = Set.of(
            "reentrancy-eth",
            "arbitrary-send-eth",
            "arbitrary-send-erc20",
            "suicidal",
            "controlled-delegatecall",
            "unprotected-upgrade"
    );

    private final RestClient restClient;

    public RestStaticAnalysisClient(
            @Value("${prism.services.slither-base-url}") String baseUrl,
            @Value("${prism.services.analyze-timeout-seconds:180}") long timeoutSeconds) {
        var factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(5_000);
        factory.setReadTimeout((int) Duration.ofSeconds(timeoutSeconds).toMillis());
        this.restClient = RestClient.builder().baseUrl(baseUrl).requestFactory(factory).build();
    }

    @Override
    public StaticAnalysisResult analyze(String sourceCode, UUID contractId) {
        ByteArrayResource fileResource = new ByteArrayResource(sourceCode.getBytes(StandardCharsets.UTF_8)) {
            @Override
            public String getFilename() {
                return "UploadedContract.sol";
            }
        };

        MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
        body.add("file", fileResource);
        body.add("contract_id", contractId.toString());

        SlitherAnalyzeResponse response = restClient.post()
                .uri("/analyze")
                .contentType(MediaType.MULTIPART_FORM_DATA)
                .body(body)
                .retrieve()
                .body(SlitherAnalyzeResponse.class);

        if (response == null || !response.success() || response.findings() == null) {
            throw new IllegalStateException("Static analysis service returned no result.");
        }
        log.info("Static analysis for contract {} returned {} findings (risk {})",
                contractId, response.findings().size(), response.riskScore());

        List<StaticAnalysisResult.FindingDto> findings = new ArrayList<>();
        for (var entry : response.findings()) {
            var f = entry.finding();
            var a = entry.analysis();

            boolean hasAnalysis = a != null
                    && !Boolean.TRUE.equals(a.skipped())
                    && a.recommendation() != null
                    && !a.recommendation().isBlank();

            String description = hasAnalysis && a.explanation() != null && !a.explanation().isBlank()
                    ? a.explanation()
                    : f.description();
            String remediation = hasAnalysis
                    ? a.recommendation()
                    : "Review this finding against standard Solidity security practices for its category.";

            UUID analyzerFindingId = null;
            if (f.databaseFindingId() != null && !f.databaseFindingId().isBlank()) {
                try {
                    analyzerFindingId = UUID.fromString(f.databaseFindingId());
                } catch (IllegalArgumentException ignored) {
                    // not a UUID: keep null
                }
            }

            findings.add(new StaticAnalysisResult.FindingDto(
                    f.title(),
                    mapSeverity(f.impact(), f.detectorId()),
                    f.lineStart() == null ? 0 : f.lineStart(),
                    description,
                    remediation,
                    f.function(),
                    f.detectorId(),
                    f.vulnerabilityFamily(),
                    f.sourceSnippet(),
                    f.contract(),
                    f.lineStart(),
                    f.lineEnd(),
                    analyzerFindingId
            ));
        }

        return new StaticAnalysisResult(
                findings,
                response.riskScore() == null ? 0.0 : response.riskScore()
        );
    }

    // The locked Severity enum has no Informational tier, so Informational folds into LOW.
    static String mapSeverity(String impact, String detectorId) {
        if (impact == null) return "LOW";
        if ("High".equals(impact) && detectorId != null && CRITICAL_DETECTORS.contains(detectorId)) {
            return "CRITICAL";
        }
        return switch (impact) {
            case "High" -> "HIGH";
            case "Medium" -> "MEDIUM";
            default -> "LOW"; // Low, Informational, anything unknown
        };
    }
}
