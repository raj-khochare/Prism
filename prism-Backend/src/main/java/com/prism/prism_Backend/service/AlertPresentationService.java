package com.prism.prism_Backend.service;

import com.prism.prism_Backend.domain.entity.Alert;
import com.prism.prism_Backend.domain.entity.RiskAssessment;
import com.prism.prism_Backend.dto.AlertCardDto;
import com.prism.prism_Backend.repository.RiskAssessmentRepository;
import org.springframework.stereotype.Service;

@Service
public class AlertPresentationService {

    private final RiskAssessmentRepository riskRepo;

    public AlertPresentationService(RiskAssessmentRepository riskRepo) {
        this.riskRepo = riskRepo;
    }

    public AlertCardDto toCard(Alert a) {
        String status = a.isDismissed() ? "Dismissed" : a.isAcknowledged() ? "Acknowledged" : "Active";
        // riskScore was hard-coded to 0 before; use the latest assessment for the contract.
        int score = riskRepo.findTopByContractIdOrderByComputedAtDesc(a.getContract().getId())
                .map(RiskAssessment::getScore)
                .orElse(0);
        return new AlertCardDto(
                a.getId().toString(),
                titleCase(a.getSeverity().name()),
                a.getContract().getName(),
                a.getContract().getAddress(),
                a.getMessage(),
                score,
                a.getSentAt().toString(),
                a.getChannel() == null ? "" : titleCase(a.getChannel().name()),
                status,
                a.isAcknowledged(),
                null // no tx hash column in the locked Alert schema
        );
    }

    private static String titleCase(String s) {
        return s.isEmpty() ? s : s.charAt(0) + s.substring(1).toLowerCase();
    }
}
