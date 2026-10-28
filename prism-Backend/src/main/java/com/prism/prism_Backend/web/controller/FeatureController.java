package com.prism.prism_Backend.web.controller;

import com.prism.prism_Backend.domain.entity.Contract;
import com.prism.prism_Backend.dto.FeatureVector;
import com.prism.prism_Backend.exception.ResourceNotFoundException;
import com.prism.prism_Backend.repository.ContractRepository;
import com.prism.prism_Backend.service.FeatureExtractionService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

/**
 * Exposes the static half of the FeatureVector exactly as the risk engine builds it (runtime
 * fields neutral). The ML dataset builder calls this so training rows come from the SAME code
 * path as production scoring instead of a second, drifting Python re-implementation.
 */
@RestController
@RequestMapping("/api/contracts/{contractId}/features")
public class FeatureController {

    private final FeatureExtractionService features;
    private final ContractRepository contractRepo;

    public FeatureController(FeatureExtractionService features, ContractRepository contractRepo) {
        this.features = features;
        this.contractRepo = contractRepo;
    }

    @GetMapping
    public FeatureVector staticFeatures(@PathVariable UUID contractId) {
        Contract c = contractRepo.findById(contractId)
                .orElseThrow(() -> new ResourceNotFoundException("Contract not found."));
        return features.forContract(contractId, c.getSourceCode());
    }
}
