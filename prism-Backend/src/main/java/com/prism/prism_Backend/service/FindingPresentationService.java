package com.prism.prism_Backend.service;

import com.prism.prism_Backend.domain.entity.Finding;
import com.prism.prism_Backend.dto.FindingCardDto;
import org.springframework.stereotype.Service;

import java.util.Arrays;
import java.util.List;
import java.util.Locale;

@Service
public class FindingPresentationService {

    public FindingCardDto toCard(Finding f) {
        String category = categorize(f);
        String detector = f.getDetectorId() != null ? f.getDetectorId() : String.valueOf(f.getTitle());
        String file = f.getContract().getName() + ".sol";
        String snippet = f.getSourceSnippet() != null && !f.getSourceSnippet().isBlank()
                ? f.getSourceSnippet()
                : extractSnippet(f.getContract().getSourceCode(), f.getLine());
        return new FindingCardDto(
                f.getId().toString(),
                detector,
                category,
                humanizeTitle(detector),
                titleCase(f.getSeverity().name()),
                f.getContract().getName(),
                file,
                "Open",
                f.getDescription(),
                f.getDescription(),
                f.getRemediation(),
                List.of(),
                List.of(),
                snippet,
                f.getFunctionName(),
                f.getDetectorId(),
                f.getVulnerabilityFamily(),
                f.getSourceSnippet(),
                f.getSolidityContractName(),
                f.getLineStart(),
                f.getLineEnd(),
                f.getAnalyzerFindingId(),
                f.getContract().getId()
        );
    }

    private String humanizeTitle(String detectorId) {
        if (detectorId == null || detectorId.isBlank()) return "Finding";
        StringBuilder sb = new StringBuilder();
        for (String p : detectorId.split("[-_]")) {
            if (p.isEmpty()) continue;
            sb.append(Character.toUpperCase(p.charAt(0))).append(p.substring(1)).append(' ');
        }
        return sb.toString().trim();
    }

    /** Family first (reliable); keyword fallback only for older rows without a family. */
    private String categorize(Finding f) {
        String family = f.getVulnerabilityFamily() == null ? "" : f.getVulnerabilityFamily();
        switch (family) {
            case "reentrancy": return "Reentrancy";
            case "access_control": case "tx_origin": case "arbitrary_send": return "Access Control";
            case "delegatecall": return "Delegatecall";
            case "unchecked_call": return "Unchecked Calls";
            case "integer_overflow": return "Integer / Precision";
            case "weak_randomness": return "Weak Randomness";
            default: break;
        }
        String t = ((f.getTitle() == null ? "" : f.getTitle()) + " " + (f.getDescription() == null ? "" : f.getDescription()))
                .toLowerCase(Locale.ROOT);
        if (t.contains("reentran")) return "Reentrancy";
        if (t.contains("oracle")) return "Oracle Dependency";
        if (t.contains("access") || t.contains("tx.origin") || t.contains("tx-origin")) return "Access Control";
        if (t.contains("delegatecall")) return "Delegatecall";
        if (t.contains("unchecked")) return "Unchecked Calls";
        if (t.contains("division") || t.contains("precision") || t.contains("overflow") || t.contains("underflow")) return "Integer / Precision";
        if (t.contains("random") || t.contains("prng")) return "Weak Randomness";
        return "General";
    }

    private String extractSnippet(String src, int line) {
        if (src == null || src.isBlank()) return "";
        var lines = src.split("\n");
        int from = Math.max(0, line - 3), to = Math.min(lines.length, line + 2);
        if (from >= to) return "";
        return String.join("\n", Arrays.copyOfRange(lines, from, to));
    }

    private String titleCase(String s) {
        return s.charAt(0) + s.substring(1).toLowerCase(Locale.ROOT);
    }
}
