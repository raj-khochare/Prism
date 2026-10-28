package com.prism.prism_Backend.dto;

import com.prism.prism_Backend.domain.enums.RiskBand;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record RiskAssessmentResponse(
        UUID id,
        UUID contractId,
        int score,
        RiskBand band,
        double confidence,
        Instant computedAt,
        List<ShapFactorResponse> factors
) {

    public record ShapFactorResponse(
            UUID id,
            String featureName,
            double contribution
    ) {}
}