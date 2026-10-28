package com.prism.prism_Backend.dto;

public record AlertCardDto(
        String id,
        String severity,
        String contract,
        String address,
        String trigger,
        int riskScore,
        String timestamp,
        String channel,
        String status,
        boolean acknowledged,
        String txHash
) {}