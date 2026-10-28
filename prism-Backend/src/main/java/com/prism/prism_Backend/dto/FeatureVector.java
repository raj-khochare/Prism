package com.prism.prism_Backend.dto;

public record FeatureVector (
        boolean reentrancyPattern,
        boolean missingAccessControl,
        boolean uncheckedExternalCall,
        boolean integerOverflowRisk,
        boolean floatingPragma,
        int criticalFindingCount,
        int highFindingCount,
        boolean externalCallBeforeStateUpdate,
        boolean unprotectedPrivilegedFunction,
        double staticRiskContribution,
        boolean usesDelegateCall,
        boolean flashLoanDetected,
        double largeFundMovementUsd,
        double oracleDeviationPct,
        double gasAnomalyIndex,
        double txFrequencyZScore,
        double liquidityDeltaPct,
        int uniqueCallers,
        long secondsSinceLastAnomaly,
        double governanceTokenConcentrationDelta
) {
}
