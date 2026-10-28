package com.prism.prism_Backend.dto.SlitherDtos;

import tools.jackson.databind.PropertyNamingStrategies;
import tools.jackson.databind.annotation.JsonNaming;

import java.util.Map;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public record SlitherFinding(
        String findingId,
        String detectorId,
        String vulnerabilityFamily,
        String title,
        String impact,
        String confidence,
        String contract,
        String function,
        String sourceFile,
        Integer lineStart,
        Integer lineEnd,
        String sourceSnippet,
        Map<String, Object> vulnerabilityFeatures,
        String description,
        String databaseFindingId
) {}
