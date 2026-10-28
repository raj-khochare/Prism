package com.prism.prism_Backend.dto.SlitherDtos;

import tools.jackson.databind.PropertyNamingStrategies;
import tools.jackson.databind.annotation.JsonNaming;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public record SlitherFindingEntry(
        SlitherFinding finding,
        SlitherAnalysis analysis,
        String severity
) {}