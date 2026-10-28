package com.prism.prism_Backend.dto;

import java.util.List;

public record ScanResponse(
        String fileName,
        String scanTimestamp,
        double riskScore,
        List<FindingCardDto> findings
) {}