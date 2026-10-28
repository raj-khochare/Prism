package com.prism.prism_Backend.service;

import com.prism.prism_Backend.domain.entity.Finding;
import com.prism.prism_Backend.domain.enums.Severity;
import com.prism.prism_Backend.dto.FeatureVector;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class FeatureExtractionServiceTest {

    private final FeatureExtractionService service = new FeatureExtractionService(null);

    private static Finding finding(String family, String detector, Severity sev) {
        Finding f = new Finding();
        f.setVulnerabilityFamily(family);
        f.setDetectorId(detector);
        f.setSeverity(sev);
        return f;
    }

    @Test
    void mapsFindingsToStaticFeatures() {
        FeatureVector v = service.staticOnly(List.of(
                finding("reentrancy", "reentrancy-eth", Severity.CRITICAL),
                finding("access_control", "prism-missing-access-control", Severity.HIGH),
                finding("integer_overflow", "prism-unchecked-arithmetic", Severity.MEDIUM)
        ), "pragma solidity ^0.8.20;\ncontract A {}");

        assertTrue(v.reentrancyPattern());
        assertTrue(v.externalCallBeforeStateUpdate());
        assertTrue(v.missingAccessControl());
        assertTrue(v.unprotectedPrivilegedFunction());
        assertTrue(v.integerOverflowRisk());
        assertFalse(v.uncheckedExternalCall());
        assertTrue(v.floatingPragma());
        assertEquals(1, v.criticalFindingCount());
        assertEquals(1, v.highFindingCount());
        assertEquals(40 + 25 + 15, v.staticRiskContribution());
        // runtime side is neutral until the monitor fills it in
        assertFalse(v.flashLoanDetected());
        assertEquals(FeatureExtractionService.NO_ANOMALY_SECONDS, v.secondsSinceLastAnomaly());
    }

    @Test
    void pinnedPragmaIsNotFloating() {
        assertFalse(FeatureExtractionService.hasFloatingPragma("pragma solidity 0.8.20;"));
        assertTrue(FeatureExtractionService.hasFloatingPragma("pragma solidity >=0.8.0;"));
        assertFalse(FeatureExtractionService.hasFloatingPragma("pragma solidity >=0.8.0 <0.9.0;"));
    }

    @Test
    void staticRiskIsCappedAt100() {
        List<Finding> many = java.util.stream.IntStream.range(0, 5)
                .mapToObj(i -> finding("reentrancy", "reentrancy-eth", Severity.CRITICAL)).toList();
        assertEquals(100.0, service.staticRisk(many));
    }
}
