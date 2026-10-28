package com.prism.prism_Backend.integration;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class SeverityMappingTest {

    @Test
    void promotesFundDrainingDetectorsToCritical() {
        assertEquals("CRITICAL", RestStaticAnalysisClient.mapSeverity("High", "reentrancy-eth"));
        assertEquals("CRITICAL", RestStaticAnalysisClient.mapSeverity("High", "arbitrary-send-eth"));
    }

    @Test
    void otherHighStaysHigh() {
        assertEquals("HIGH", RestStaticAnalysisClient.mapSeverity("High", "tx-origin"));
        assertEquals("HIGH", RestStaticAnalysisClient.mapSeverity("High", "prism-missing-access-control"));
    }

    @Test
    void foldsLowTiers() {
        assertEquals("MEDIUM", RestStaticAnalysisClient.mapSeverity("Medium", "x"));
        assertEquals("LOW", RestStaticAnalysisClient.mapSeverity("Informational", "x"));
        assertEquals("LOW", RestStaticAnalysisClient.mapSeverity(null, null));
    }
}
