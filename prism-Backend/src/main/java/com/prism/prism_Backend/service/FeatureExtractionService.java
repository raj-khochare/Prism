package com.prism.prism_Backend.service;

import com.prism.prism_Backend.domain.entity.Finding;
import com.prism.prism_Backend.domain.enums.Severity;
import com.prism.prism_Backend.dto.FeatureVector;
import com.prism.prism_Backend.repository.FindingRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Builds the fixed 20-field FeatureVector (11 static + 9 behavioural).
 *
 * Before this existed nothing in the code base ever produced a FeatureVector: the only way to
 * get a risk score was to hand-type a JSON body in Postman. Static features now come from the
 * stored findings; runtime features come from RuntimeMonitorService.
 */
@Service
public class FeatureExtractionService {

    /** Seconds reported when no anomaly has ever been seen (1 day). */
    public static final long NO_ANOMALY_SECONDS = 86_400L;

    private static final Pattern PRAGMA = Pattern.compile("pragma\\s+solidity\\s+([^;]+);");

    private final FindingRepository findingRepo;

    public FeatureExtractionService(FindingRepository findingRepo) {
        this.findingRepo = findingRepo;
    }

    /** Static features only; the 9 runtime fields are neutral. */
    public FeatureVector staticOnly(List<Finding> findings, String sourceCode) {
        return withRuntime(staticFeatures(findings, sourceCode), RuntimeSignals.NONE);
    }

    public FeatureVector forContract(java.util.UUID contractId, String sourceCode) {
        return staticOnly(findingRepo.findByContractId(contractId), sourceCode);
    }

    public FeatureVector forContract(java.util.UUID contractId, String sourceCode, RuntimeSignals runtime) {
        return withRuntime(staticFeatures(findingRepo.findByContractId(contractId), sourceCode), runtime);
    }

    /** Same weights as the Python analyzer's risk_scorer so both sides agree. */
    public double staticRisk(List<Finding> findings) {
        int raw = 0;
        for (Finding f : findings) {
            raw += switch (f.getSeverity()) {
                case CRITICAL -> 40;
                case HIGH -> 25;
                case MEDIUM -> 15;
                case LOW -> 5;
            };
        }
        return Math.min(raw, 100);
    }

    private StaticPart staticFeatures(List<Finding> findings, String sourceCode) {
        boolean reentrancy = false, accessControl = false, unchecked = false, overflow = false;
        boolean externalBeforeState = false, unprotected = false, delegate = false;
        int critical = 0, high = 0;

        for (Finding f : findings) {
            String family = f.getVulnerabilityFamily() == null ? "" : f.getVulnerabilityFamily();
            String detector = f.getDetectorId() == null ? "" : f.getDetectorId();

            switch (family) {
                case "reentrancy" -> {
                    reentrancy = true;
                    externalBeforeState = true;
                }
                case "access_control", "tx_origin", "arbitrary_send" -> accessControl = true;
                case "unchecked_call" -> unchecked = true;
                case "integer_overflow" -> overflow = true;
                case "delegatecall" -> delegate = true;
                default -> { }
            }
            if (detector.equals("prism-missing-access-control") || detector.contains("suicidal")
                    || detector.contains("unprotected")) {
                unprotected = true;
            }
            if (f.getSeverity() == Severity.CRITICAL) critical++;
            if (f.getSeverity() == Severity.HIGH) high++;
        }

        return new StaticPart(reentrancy, accessControl, unchecked, overflow, hasFloatingPragma(sourceCode),
                critical, high, externalBeforeState, unprotected, staticRisk(findings), delegate);
    }

    /** `^0.8.0`, `~0.8.0` and open-ended `>=0.8.0` are "floating"; an exact `0.8.20` is pinned. */
    static boolean hasFloatingPragma(String source) {
        if (source == null) return false;
        Matcher m = PRAGMA.matcher(source);
        if (!m.find()) return false;
        String spec = m.group(1).trim();
        return spec.startsWith("^") || spec.startsWith("~") || (spec.contains(">") && !spec.contains("<"));
    }

    private FeatureVector withRuntime(StaticPart s, RuntimeSignals r) {
        return new FeatureVector(
                s.reentrancy, s.accessControl, s.unchecked, s.overflow, s.floatingPragma,
                s.critical, s.high, s.externalBeforeState, s.unprotected, s.staticRisk, s.delegate,
                r.flashLoanDetected(), r.largeFundMovementUsd(), r.oracleDeviationPct(), r.gasAnomalyIndex(),
                r.txFrequencyZScore(), r.liquidityDeltaPct(), r.uniqueCallers(), r.secondsSinceLastAnomaly(),
                r.governanceTokenConcentrationDelta());
    }

    private record StaticPart(boolean reentrancy, boolean accessControl, boolean unchecked, boolean overflow,
                              boolean floatingPragma, int critical, int high, boolean externalBeforeState,
                              boolean unprotected, double staticRisk, boolean delegate) {}

    /** The 9 behavioural features. */
    public record RuntimeSignals(
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
        public static final RuntimeSignals NONE =
                new RuntimeSignals(false, 0, 0, 1.0, 0, 0, 0, NO_ANOMALY_SECONDS, 0);
    }
}
