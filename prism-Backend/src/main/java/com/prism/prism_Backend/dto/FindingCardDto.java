package com.prism.prism_Backend.dto;

import java.util.List;
import java.util.UUID;

public record FindingCardDto(
        String id,
        String detector,
        String category,
        String title,
        String severity,
        String contract,
        String file,
        String status,
        String description,
        String whyItMatters,
        String remediation,
        List<String> relatedFindings,
        List<String> relatedRuntimeSignals,
        String codeSnippet,

        String functionName,
        String detectorId,
        String vulnerabilityFamily,
        String sourceSnippet,
        String solidityContractName,
        Integer lineStart,
        Integer lineEnd,
        UUID analyzerFindingId,
        UUID contractId


) {
}