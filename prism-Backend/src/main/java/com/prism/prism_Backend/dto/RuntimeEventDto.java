package com.prism.prism_Backend.dto;

/** Field names match what the dashboard's Runtime Monitor page already renders. */
public record RuntimeEventDto(
        String id,
        String timestamp,
        String contract,
        String severity,
        String eventType,
        long block,
        String txHash,
        String gasUsed,
        String description,
        String traceSummary
) {}
