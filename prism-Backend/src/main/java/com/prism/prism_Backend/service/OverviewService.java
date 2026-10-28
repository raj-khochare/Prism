package com.prism.prism_Backend.service;

import com.prism.prism_Backend.blockchain.RuntimeMonitorService;
import com.prism.prism_Backend.domain.entity.Contract;
import com.prism.prism_Backend.domain.entity.Finding;
import com.prism.prism_Backend.domain.entity.RiskAssessment;
import com.prism.prism_Backend.domain.enums.Severity;
import com.prism.prism_Backend.dto.RuntimeEventDto;
import com.prism.prism_Backend.repository.AlertRepository;
import com.prism.prism_Backend.repository.ContractRepository;
import com.prism.prism_Backend.repository.FindingRepository;
import com.prism.prism_Backend.repository.RiskAssessmentRepository;
import org.springframework.stereotype.Service;

import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Service
public class OverviewService {

    private static final DateTimeFormatter FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss 'UTC'").withZone(ZoneOffset.UTC);

    private final ContractRepository contractRepo;
    private final FindingRepository findingRepo;
    private final AlertRepository alertRepo;
    private final RiskAssessmentRepository riskRepo;
    private final RuntimeEventBuffer buffer;
    private final SystemStatusService systemStatus;

    public OverviewService(ContractRepository contractRepo, FindingRepository findingRepo, AlertRepository alertRepo,
                           RiskAssessmentRepository riskRepo, RuntimeEventBuffer buffer, SystemStatusService systemStatus) {
        this.contractRepo = contractRepo;
        this.findingRepo = findingRepo;
        this.alertRepo = alertRepo;
        this.riskRepo = riskRepo;
        this.buffer = buffer;
        this.systemStatus = systemStatus;
    }

    public Map<String, Object> build() {
        List<Contract> contracts = contractRepo.findAll();
        List<Finding> findings = new ArrayList<>(findingRepo.findAll());
        findings.sort(Comparator.comparing(Finding::getSeverity));

        Contract worst = null;
        int worstScore = 0;
        for (Contract c : contracts) {
            int s = riskRepo.findTopByContractIdOrderByComputedAtDesc(c.getId()).map(RiskAssessment::getScore).orElse(0);
            if (worst == null || s > worstScore) { worst = c; worstScore = s; }
        }

        long highFindings = findings.stream().filter(f -> f.getSeverity() == Severity.CRITICAL || f.getSeverity() == Severity.HIGH).count();
        long activeAlerts = alertRepo.countByAcknowledgedFalseAndDismissedFalse();
        List<RuntimeEventDto> events = buffer.events();
        long anomalies = events.stream().filter(e -> !"Low".equals(e.severity())).count();

        Map<String, Object> status = new LinkedHashMap<>();
        status.put("isDemoData", false);
        status.put("statusLevel", contracts.isEmpty() ? "NO DATA" : RiskPresentationService.statusLevel(worstScore));
        status.put("unifiedScore", worstScore);
        status.put("maxScore", 100);
        status.put("highFindingsCount", highFindings);
        status.put("runtimeAnomaliesCount", anomalies);
        status.put("activeAlertsCount", activeAlerts);
        status.put("evaluatedAt", FMT.format(java.time.Instant.now()));
        status.put("targetProtocol", worst == null ? "No contracts registered" : worst.getName());

        List<Map<String, Object>> drivers = new ArrayList<>();
        for (Finding f : findings.stream().limit(4).toList()) {
            Map<String, Object> d = new LinkedHashMap<>();
            d.put("id", f.getId().toString());
            d.put("severity", cap(f.getSeverity().name()));
            d.put("title", (f.getDetectorId() == null ? f.getTitle() : f.getDetectorId())
                    + (f.getFunctionName() == null ? "" : " in " + f.getFunctionName() + "()"));
            d.put("explanation", f.getDescription() == null ? "" : f.getDescription());
            d.put("source", "Static analysis");
            d.put("targetContract", f.getContract().getName());
            d.put("linkTarget", "/findings?id=" + f.getId());
            drivers.add(d);
        }

        List<Map<String, Object>> recent = new ArrayList<>();
        for (RuntimeEventDto e : events.stream().limit(3).toList()) {
            Map<String, Object> r = new LinkedHashMap<>();
            r.put("id", e.id());
            r.put("timestamp", e.timestamp());
            r.put("severity", e.severity());
            r.put("title", e.eventType().replace('_', ' '));
            r.put("contract", e.contract());
            r.put("block", e.block());
            r.put("txHash", e.txHash());
            r.put("description", e.description());
            recent.add(r);
        }

        Map<String, Object> priority = null;
        if (worst != null && worstScore > 0) {
            Contract w = worst;
            List<Finding> mine = findings.stream().filter(f -> f.getContract().getId().equals(w.getId())).toList();
            priority = new LinkedHashMap<>();
            priority.put("id", "inv-" + w.getId());
            priority.put("title", "Highest-risk contract: " + w.getName());
            priority.put("summary", "Latest fused risk score is " + worstScore + "/100 across " + mine.size() + " static finding(s).");
            priority.put("affectedContract", w.getName());
            priority.put("affectedContractAddress", w.getAddress() == null ? "" : w.getAddress());
            priority.put("relatedBlocks", "");
            priority.put("relatedTransactions", List.of());
            priority.put("investigationSteps", mine.stream().limit(3)
                    .map(f -> f.getRemediation() == null ? "Review " + f.getTitle() : f.getRemediation()).toList());
            priority.put("actionRoute", "/risk?contract=" + w.getId());
        }

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("securityStatus", status);
        out.put("riskDrivers", drivers);
        out.put("recentEvents", recent);
        out.put("priorityInvestigation", priority);
        out.put("systemStatus", systemStatus.components());
        return out;
    }

    private static String cap(String s) {
        return s.charAt(0) + s.substring(1).toLowerCase(Locale.ROOT);
    }
}
