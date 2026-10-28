package com.prism.prism_Backend.dto;

import java.util.List;

public record MlScoreResult(
        int score,
        String band,
        double confidence,
        List<ShapFactorDto> factors
) {
    public record ShapFactorDto(
            String featureName,
            double contribution
    ) {}
}