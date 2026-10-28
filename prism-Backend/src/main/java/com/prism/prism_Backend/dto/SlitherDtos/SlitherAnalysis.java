package com.prism.prism_Backend.dto.SlitherDtos;

import tools.jackson.databind.PropertyNamingStrategies;
import tools.jackson.databind.annotation.JsonNaming;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public record SlitherAnalysis(
        Boolean isValid,
        String confidence,
        String severity,
        String explanation,
        String attackScenario,
        String impact,
        String recommendation,
        String fixedCode,
        Boolean available,
        Boolean skipped
) {}