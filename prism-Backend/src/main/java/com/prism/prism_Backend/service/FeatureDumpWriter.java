package com.prism.prism_Backend.service;

import com.prism.prism_Backend.dto.FeatureVector;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.time.Instant;
import java.util.Locale;

/**
 * Optional data-collection hook for the ML phase. When PRISM_FEATURE_DUMP_PATH is set, every
 * FeatureVector the risk engine scores is appended as one JSON line, so replay runs on the
 * Hardhat fork produce training rows built by the production code path. Off by default.
 *
 * The JSON is written by hand (flat, numbers and booleans only) so it has no dependency on a
 * particular Jackson version. ml/build_dataset.py joins these lines with a labels file.
 */
@Component
public class FeatureDumpWriter {

    private static final Logger log = LoggerFactory.getLogger(FeatureDumpWriter.class);

    private final Path path;

    public FeatureDumpWriter(@Value("${prism.ml.feature-dump-path:}") String dumpPath) {
        this.path = dumpPath == null || dumpPath.isBlank() ? null : Path.of(dumpPath.trim());
    }

    public synchronized void append(String contractName, FeatureVector f, int score) {
        if (path == null) return;
        String line = String.format(Locale.ROOT,
                "{\"ts\":\"%s\",\"contract\":\"%s\",\"baselineScore\":%d,"
                        + "\"reentrancyPattern\":%b,\"missingAccessControl\":%b,\"uncheckedExternalCall\":%b,"
                        + "\"integerOverflowRisk\":%b,\"floatingPragma\":%b,\"criticalFindingCount\":%d,"
                        + "\"highFindingCount\":%d,\"externalCallBeforeStateUpdate\":%b,"
                        + "\"unprotectedPrivilegedFunction\":%b,\"staticRiskContribution\":%s,"
                        + "\"usesDelegateCall\":%b,\"flashLoanDetected\":%b,\"largeFundMovementUsd\":%s,"
                        + "\"oracleDeviationPct\":%s,\"gasAnomalyIndex\":%s,\"txFrequencyZScore\":%s,"
                        + "\"liquidityDeltaPct\":%s,\"uniqueCallers\":%d,\"secondsSinceLastAnomaly\":%d,"
                        + "\"governanceTokenConcentrationDelta\":%s}%n",
                Instant.now(), escape(contractName), score,
                f.reentrancyPattern(), f.missingAccessControl(), f.uncheckedExternalCall(),
                f.integerOverflowRisk(), f.floatingPragma(), f.criticalFindingCount(),
                f.highFindingCount(), f.externalCallBeforeStateUpdate(),
                f.unprotectedPrivilegedFunction(), num(f.staticRiskContribution()),
                f.usesDelegateCall(), f.flashLoanDetected(), num(f.largeFundMovementUsd()),
                num(f.oracleDeviationPct()), num(f.gasAnomalyIndex()), num(f.txFrequencyZScore()),
                num(f.liquidityDeltaPct()), f.uniqueCallers(), f.secondsSinceLastAnomaly(),
                num(f.governanceTokenConcentrationDelta()));
        try {
            Files.writeString(path, line, StandardCharsets.UTF_8,
                    StandardOpenOption.CREATE, StandardOpenOption.APPEND);
        } catch (IOException e) {
            log.warn("Could not append to feature dump {}: {}", path, e.getMessage());
        }
    }

    private static String num(double v) {
        return Double.isFinite(v) ? Double.toString(v) : "0.0";
    }

    private static String escape(String s) {
        return s == null ? "" : s.replace("\\", "\\\\").replace("\"", "\\\"");
    }
}
