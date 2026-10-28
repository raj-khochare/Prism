package com.prism.prism_Backend.dto;

import java.util.List;
import java.util.UUID;

public record StaticAnalysisResult(
        List<FindingDto> findings,
        double staticRiskContribution
) {
    public record FindingDto(
            String title,
            String severity,
            int line,
            String description,
            String remediation,


            String functionName,
            String detectorId,
            String vulnerabilityFamily,
            String sourceSnippet,
            String solidityContractName,
            Integer lineStart,
            Integer lineEnd,
            UUID analyzerFindingId
    ) {}
}