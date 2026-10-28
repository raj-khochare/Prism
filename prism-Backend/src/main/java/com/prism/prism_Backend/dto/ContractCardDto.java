package com.prism.prism_Backend.dto;

public record ContractCardDto(
        String id,
        String name,
        String address,
        String chain,
        int riskScore,
        String severity,
        String status,
        String lastScan,
        long tx24h,
        String latestDetection,
        boolean verifiedSource
) {}