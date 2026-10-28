package com.prism.prism_Backend.integration;

import com.prism.prism_Backend.dto.FeatureVector;
import com.prism.prism_Backend.dto.MlScoreResult;

public interface MlScoringClient {
    MlScoreResult score(FeatureVector features);

    /** Shown on the Risk Assessment page so the UI is honest about what produced the score. */
    default String modelName() {
        return getClass().getSimpleName();
    }

    default String modelVersion() {
        return "unversioned";
    }

    default String modelDescription() {
        return "";
    }
}
