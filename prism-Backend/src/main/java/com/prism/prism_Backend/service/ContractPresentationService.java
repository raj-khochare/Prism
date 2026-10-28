package com.prism.prism_Backend.service;

import com.prism.prism_Backend.domain.entity.Contract;
import com.prism.prism_Backend.domain.enums.ContractStatus;
import com.prism.prism_Backend.domain.enums.RiskBand;
import com.prism.prism_Backend.dto.ContractCardDto;
import com.prism.prism_Backend.repository.AlertRepository;
import com.prism.prism_Backend.repository.FindingRepository;
import com.prism.prism_Backend.repository.RiskAssessmentRepository;
import org.springframework.stereotype.Service;

import com.prism.prism_Backend.domain.entity.Alert;
import com.prism.prism_Backend.domain.entity.Finding;
import com.prism.prism_Backend.domain.entity.RiskAssessment;

import java.time.Instant;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.Comparator;

@Service
public class ContractPresentationService {

    private final RiskAssessmentRepository riskRepo;
    private final FindingRepository findingRepo;
    private final AlertRepository alertRepo;
    private final RuntimeEventBuffer runtimeBuffer;
    private static final DateTimeFormatter FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss").withZone(ZoneOffset.UTC);

    public ContractPresentationService(RiskAssessmentRepository riskRepo, FindingRepository findingRepo, AlertRepository alertRepo,
                                       RuntimeEventBuffer runtimeBuffer) {
        this.runtimeBuffer = runtimeBuffer;
        this.riskRepo = riskRepo;
        this.findingRepo = findingRepo;
        this.alertRepo = alertRepo;
    }

    public ContractCardDto toCard(Contract c) {
        var latestRisk =
                riskRepo.findTopByContractIdOrderByComputedAtDesc(c.getId());

        int score = latestRisk.map(RiskAssessment::getScore).orElse(0);
        String severity = latestRisk.map(r -> titleCase(r.getBand().name())).orElse("Low");
        String status = deriveStatus(c, latestRisk.map(RiskAssessment::getBand).orElse(null));

        // Was the number of risk assessments in 24h, which is not a transaction count.
        long tx24h = runtimeBuffer.txCount24h(c.getAddress());

        return new ContractCardDto(
                c.getId().toString(), c.getName(), c.getAddress(), c.getChain(),
                score, severity, status,
                c.getLastScanAT() == null ? "—" : FMT.format(c.getLastScanAT()),
                tx24h, latestFindingOrAlertText(c),
                c.getSourceCode() != null && !c.getSourceCode().isBlank()
        );
    }

    private String deriveStatus(Contract c, RiskBand band) {
        if (c.getStatus() == ContractStatus.CRITICAL) return "Investigating";
        if (band == RiskBand.HIGH) return "Warning";
        return "Active";
    }

    private String latestFindingOrAlertText(Contract c) {
        var alert =
                alertRepo.findTopByContractIdOrderBySentAtDesc(c.getId());
        if (alert.isPresent()) return alert.get().getMessage();
        var finding = findingRepo.findByContractId(c.getId())
                .stream()
                .min(java.util.Comparator.comparing(Finding::getSeverity)); // enum order: CRITICAL first
        return finding.map(Finding::getTitle).orElse("Normal execution within baseline parameters");
    }

    private String titleCase(String s) { return s.charAt(0) + s.substring(1).toLowerCase(); }
}
