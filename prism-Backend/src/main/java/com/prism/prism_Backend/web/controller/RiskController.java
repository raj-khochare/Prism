package com.prism.prism_Backend.web.controller;

import com.prism.prism_Backend.domain.entity.RiskAssessment;
import com.prism.prism_Backend.dto.FeatureVector;
import com.prism.prism_Backend.dto.RiskAssessmentResponse;
import com.prism.prism_Backend.exception.ResourceNotFoundException;
import com.prism.prism_Backend.repository.ContractRepository;
import com.prism.prism_Backend.service.RiskFusionService;
import com.prism.prism_Backend.service.RiskPresentationService;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/contracts/{contractId}/risk")
public class RiskController {

    private final RiskFusionService riskService;
    private final RiskPresentationService presenter;
    private final ContractRepository contractRepo;

    public RiskController(RiskFusionService riskService, RiskPresentationService presenter, ContractRepository contractRepo) {
        this.riskService = riskService;
        this.presenter = presenter;
        this.contractRepo = contractRepo;
    }

    /** Latest assessment shaped for the Risk Assessment page. */
    @GetMapping
    public Map<String, Object> latest(@PathVariable UUID contractId) {
        return presenter.decomposition(contractRepo.findById(contractId)
                .orElseThrow(() -> new ResourceNotFoundException("Contract not found.")));
    }

    /** Manual evaluation with a hand-built FeatureVector (kept for Postman / the demo script). */
    @PostMapping("/evaluate")
    public RiskAssessmentResponse evaluate(@PathVariable UUID contractId, @RequestBody FeatureVector features) {
        RiskAssessment assessment = riskService.evaluate(contractId, features);
        return new RiskAssessmentResponse(
                assessment.getId(),
                assessment.getContract().getId(),
                assessment.getScore(),
                assessment.getBand(),
                assessment.getConfidence(),
                assessment.getComputedAt(),
                assessment.getFactors().stream()
                        .map(f -> new RiskAssessmentResponse.ShapFactorResponse(f.getId(), f.getFeatureName(), f.getContribution()))
                        .toList()
        );
    }
}
