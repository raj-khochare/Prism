package com.prism.prism_Backend.service;

import com.prism.prism_Backend.domain.entity.Contract;
import com.prism.prism_Backend.domain.entity.Finding;
import com.prism.prism_Backend.domain.entity.RiskAssessment;
import com.prism.prism_Backend.domain.entity.ShapFactor;
import com.prism.prism_Backend.integration.MlScoringClient;
import com.prism.prism_Backend.repository.FindingRepository;
import com.prism.prism_Backend.repository.RiskAssessmentRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.*;

/** Shapes the latest RiskAssessment into what the Risk Assessment page renders. */
@Service
public class RiskPresentationService {

    private static final DateTimeFormatter FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss 'UTC'").withZone(ZoneOffset.UTC);
    private static final List<String> STATIC_KEYS = List.of("reentrancy", "accesscontrol", "uncheckedexternal",
            "integeroverflow", "floatingpragma", "findingcount", "externalcallbefore", "unprotected",
            "staticrisk", "delegatecall");

    private final RiskAssessmentRepository riskRepo;
    private final FindingRepository findingRepo;
    private final MlScoringClient ml;

    public RiskPresentationService(RiskAssessmentRepository riskRepo, FindingRepository findingRepo, MlScoringClient ml) {
        this.riskRepo = riskRepo;
        this.findingRepo = findingRepo;
        this.ml = ml;
    }

    public static String statusLevel(int score) {
        return score > 80 ? "CRITICAL RISK" : score > 55 ? "ELEVATED RISK" : score > 30 ? "MODERATE RISK" : "LOW RISK";
    }

    // FIX: RiskAssessment.factors is LAZY and open-in-view is off, so reading it outside a
    // transaction threw LazyInitializationException (HTTP 500 on the Risk Assessment page).
    @Transactional(readOnly = true)
    public Map<String, Object> decomposition(Contract c) {
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("contract", c.getName());
        out.put("contractId", c.getId().toString());

        Optional<RiskAssessment> latest = riskRepo.findTopByContractIdOrderByComputedAtDesc(c.getId());
        List<Finding> findings = new ArrayList<>(findingRepo.findByContractId(c.getId()));
        findings.sort(Comparator.comparing(Finding::getSeverity));

        if (latest.isEmpty()) {
            out.put("score", 0);
            out.put("assessed", false);
            out.put("status", "NOT ASSESSED");
            out.put("evaluatedAt", "—");
            out.put("summaryConclusion", Map.of("primaryConcern",
                    "No risk assessment yet. Run a scan on this contract to compute one.", "whatToInvestigate", List.of()));
            out.put("staticSignals", List.of());
            out.put("runtimeSignals", List.of());
            out.put("modelMetadata", List.of());
            return out;
        }

        RiskAssessment a = latest.get();
        List<Map<String, Object>> staticSignals = new ArrayList<>();
        List<Map<String, Object>> runtimeSignals = new ArrayList<>();
        List<ShapFactor> factors = new ArrayList<>(a.getFactors());
        factors.sort(Comparator.comparingDouble((ShapFactor f) -> Math.abs(f.getContribution())).reversed());
        for (ShapFactor f : factors) {
            Map<String, Object> sig = new LinkedHashMap<>();
            sig.put("factor", f.getFeatureName());
            sig.put("source", isStatic(f.getFeatureName()) ? "Static analysis" : "Runtime monitor");
            sig.put("contribution", String.format(Locale.ROOT, "%+d", Math.round(f.getContribution() * 100)));
            sig.put("explanation", "Contribution of this feature to the fused risk score (SHAP-style attribution).");
            (isStatic(f.getFeatureName()) ? staticSignals : runtimeSignals).add(sig);
        }

        List<Map<String, String>> investigate = new ArrayList<>();
        for (Finding f : findings.stream().limit(3).toList()) {
            investigate.add(Map.of(
                    "target", f.getDetectorId() == null ? f.getTitle() : f.getDetectorId(),
                    "description", (f.getFunctionName() == null ? "" : f.getFunctionName() + "(): ") + abbreviate(f.getDescription()),
                    "link", "/findings?id=" + f.getId()));
        }
        String concern = findings.isEmpty()
                ? "No static findings are recorded; the score is driven by runtime behaviour."
                : "The score is driven mainly by " + findings.size() + " static finding(s), the most severe being "
                  + findings.get(0).getSeverity() + " " + (findings.get(0).getDetectorId() == null ? "" : findings.get(0).getDetectorId()) + ".";

        out.put("score", a.getScore());
        out.put("assessed", true);
        out.put("status", statusLevel(a.getScore()));
        out.put("evaluatedAt", FMT.format(a.getComputedAt()));
        out.put("summaryConclusion", Map.of("primaryConcern", concern, "whatToInvestigate", investigate));
        out.put("staticSignals", staticSignals);
        out.put("runtimeSignals", runtimeSignals);
        out.put("modelMetadata", List.of(Map.of(
                "modelName", ml.modelName(),
                "version", ml.modelVersion(),
                "features", factors.stream().map(ShapFactor::getFeatureName).limit(6).toList(),
                "score", String.format(Locale.ROOT, "confidence %.2f", a.getConfidence()),
                "description", ml.modelDescription())));
        return out;
    }

    private static boolean isStatic(String name) {
        String n = name == null ? "" : name.toLowerCase(Locale.ROOT).replaceAll("[^a-z]", "");
        return STATIC_KEYS.stream().anyMatch(n::contains);
    }

    private static String abbreviate(String s) {
        if (s == null) return "";
        String one = s.replaceAll("\\s+", " ").trim();
        return one.length() > 160 ? one.substring(0, 157) + "..." : one;
    }
}
