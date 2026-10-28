package com.prism.prism_Backend.integration;

import com.prism.prism_Backend.dto.FeatureVector;
import com.prism.prism_Backend.dto.MlScoreResult;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/** Mirrors ml/tests/test_baseline_and_schema.py - the Java and Python baselines must agree. */
class StubMlScoringClientTest {

    private final StubMlScoringClient scorer = new StubMlScoringClient();

    /** Neutral runtime side exactly as FeatureExtractionService.RuntimeSignals.NONE. */
    private static FeatureVector vector(double staticRisk, boolean flash, double oracleDev, double gas, double z) {
        return new FeatureVector(false, false, false, false, false, 0, 0, false, false, staticRisk, false,
                flash, 0.0, oracleDev, gas, z, 0.0, 0, 86_400L, 0.0);
    }

    @Test
    void neutralVectorScoresZero() {
        MlScoreResult r = scorer.score(vector(0, false, 0, 1.0, 0));
        assertEquals(0, r.score());
        assertEquals("LOW", r.band());
        assertTrue(r.factors().isEmpty());
    }

    @Test
    void staticOnlyScoreIsSixtyPercentOfStaticRisk() {
        assertEquals(60, scorer.score(vector(100, false, 0, 1.0, 0)).score());
        assertEquals("HIGH", scorer.score(vector(100, false, 0, 1.0, 0)).band());
    }

    @Test
    void flashLoanAddsTwentyFivePoints() {
        assertEquals(49, scorer.score(vector(40, true, 0, 1.0, 0)).score()); // 24 + 25
    }

    @Test
    void termsAreCappedAndTotalIsCappedAt100() {
        assertEquals(20, scorer.score(vector(0, false, 50, 1.0, 0)).score());
        assertEquals(100, scorer.score(vector(100, true, 50, 9.0, 9.0)).score());
    }
}
