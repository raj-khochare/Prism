package com.prism.prism_Backend.dto.SlitherDtos;

import tools.jackson.databind.PropertyNamingStrategies;
import tools.jackson.databind.annotation.JsonNaming;
import java.util.List;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public record SlitherAnalyzeResponse(
        boolean success, String analysisId, Integer riskScore, java.util.List<SlitherFindingEntry> findings
) {}