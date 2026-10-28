package com.prism.prism_Backend.integration;

import com.prism.prism_Backend.dto.FeatureVector;
import com.prism.prism_Backend.dto.MlScoreResult;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

/**
 * Rule-based baseline scorer. It is (a) the fallback when the ML service is down and (b) the
 * "honesty anchor" the XGBoost model must beat in the evaluation chapter. The same formula is
 * mirrored in ml/prism_ml/baseline.py - change both together.
 *
 * Every term is expressed in score points (0-100 scale) and capped so no single signal can
 * dominate. The neutral runtime defaults (gasAnomalyIndex = 1.0, z = 0, ...) contribute 0.
 * (The old stub added gasAnomalyIndex * 3, i.e. a constant +3 on every neutral vector, and
 * weighted the static score at only 0.4, so a scan on its own could never reach HIGH.)
 */
@Component
public class StubMlScoringClient implements MlScoringClient {

    @Override
    public String modelName() {
        return "Rule-based baseline";
    }

    @Override
    public String modelVersion() {
        return "baseline-1.0";
    }

    @Override
    public String modelDescription() {
        return "Weighted, capped rule set over the 20 features. Used as the fallback scorer and as the "
                + "baseline the XGBoost/SHAP model is evaluated against.";
    }

    @Override
    public MlScoreResult score(FeatureVector f) {
        List<MlScoreResult.ShapFactorDto> factors = new ArrayList<>();
        double total = 0;
        total += add(factors, "Static risk contribution", 0.60 * f.staticRiskContribution());
        total += add(factors, "Flash loan detected", f.flashLoanDetected() ? 25 : 0);
        total += add(factors, "Oracle deviation", Math.min(2.0 * f.oracleDeviationPct(), 20));
        total += add(factors, "Gas anomaly", Math.min(8.0 * Math.max(f.gasAnomalyIndex() - 1.0, 0), 15));
        total += add(factors, "Transaction burst", Math.min(3.0 * Math.max(f.txFrequencyZScore(), 0), 12));
        total += add(factors, "Large fund movement", Math.min(f.largeFundMovementUsd() / 10_000.0, 15));
        total += add(factors, "Liquidity change", Math.min(0.3 * Math.abs(f.liquidityDeltaPct()), 10));
        total += add(factors, "Governance concentration change",
                Math.min(0.5 * Math.abs(f.governanceTokenConcentrationDelta()), 10));

        int score = (int) Math.round(Math.min(total, 100));
        String band = score > 80 ? "CRITICAL" : score > 55 ? "HIGH" : score > 30 ? "MEDIUM" : "LOW";
        return new MlScoreResult(score, band, 0.70, factors);
    }

    /** Records a factor (as a fraction of 100 points) when it contributes anything. */
    private static double add(List<MlScoreResult.ShapFactorDto> out, String name, double points) {
        if (points > 0) {
            out.add(new MlScoreResult.ShapFactorDto(name, points / 100.0));
        }
        return points;
    }
}
