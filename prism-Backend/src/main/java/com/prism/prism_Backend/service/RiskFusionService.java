package com.prism.prism_Backend.service;

import com.prism.prism_Backend.domain.entity.Contract;
import com.prism.prism_Backend.domain.entity.RiskAssessment;
import com.prism.prism_Backend.domain.entity.ShapFactor;
import com.prism.prism_Backend.domain.enums.ContractStatus;
import com.prism.prism_Backend.domain.enums.RiskBand;
import com.prism.prism_Backend.dto.FeatureVector;
import com.prism.prism_Backend.dto.MlScoreResult;
import com.prism.prism_Backend.exception.ResourceNotFoundException;
import com.prism.prism_Backend.integration.MlScoringClient;
import com.prism.prism_Backend.repository.ContractRepository;
import com.prism.prism_Backend.repository.RiskAssessmentRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Locale;
import java.util.UUID;

@Service
public class RiskFusionService {

    private static final long DEDUPE_SECONDS = 30;

    private final ContractRepository contractRepo;
    private final RiskAssessmentRepository riskRepo;
    private final MlScoringClient mlClient;
    private final AlertService alertService;
    private final AlertConfigService alertConfig;
    private final FeatureDumpWriter featureDump;

    public RiskFusionService(ContractRepository contractRepo, RiskAssessmentRepository riskRepo,
                             MlScoringClient mlClient, AlertService alertService,
                             AlertConfigService alertConfig, FeatureDumpWriter featureDump) {
        this.featureDump = featureDump;
        this.contractRepo = contractRepo;
        this.riskRepo = riskRepo;
        this.mlClient = mlClient;
        this.alertService = alertService;
        this.alertConfig = alertConfig;
    }

    public RiskAssessment evaluate(UUID contractId, FeatureVector features) {
        Contract contract = contractRepo.findById(contractId)
                .orElseThrow(() -> new ResourceNotFoundException("Contract not found."));

        MlScoreResult mlResult = mlClient.score(features);
        featureDump.append(contract.getName(), features, mlResult.score()); // no-op unless enabled

        // Runtime monitoring re-scores on every active block. Persisting an identical row
        // (and its factor rows) each time grows the tables without adding information, so an
        // unchanged score/band within DEDUPE_SECONDS reuses the latest assessment.
        var latest = riskRepo.findTopByContractIdOrderByComputedAtDesc(contractId);
        if (latest.isPresent()
                && latest.get().getScore() == mlResult.score()
                && latest.get().getBand() != null
                && latest.get().getBand().name().equalsIgnoreCase(String.valueOf(mlResult.band()).trim())
                && java.time.Duration.between(latest.get().getComputedAt(), java.time.Instant.now()).getSeconds() < DEDUPE_SECONDS) {
            return latest.get();
        }

        RiskAssessment assessment = new RiskAssessment();
        assessment.setContract(contract);
        assessment.setScore(mlResult.score());

        String band = mlResult.band();
        if (band == null || band.isBlank()) {
            throw new IllegalArgumentException("ML service returned an empty risk band.");
        }
        try {
            assessment.setBand(RiskBand.valueOf(band.trim().toUpperCase(Locale.ROOT)));
        } catch (IllegalArgumentException ex) {
            throw new IllegalArgumentException("ML service returned invalid risk band: " + band);
        }
        assessment.setConfidence(mlResult.confidence());

        List<MlScoreResult.ShapFactorDto> factors = mlResult.factors() == null ? List.of() : mlResult.factors();
        for (MlScoreResult.ShapFactorDto f : factors) {
            ShapFactor shap = new ShapFactor();
            shap.setRiskAssessment(assessment);
            shap.setFeatureName(f.featureName());
            shap.setContribution(f.contribution());
            assessment.getFactors().add(shap);
        }

        riskRepo.save(assessment);

        // The threshold is now editable at runtime (PUT /api/alerts/config).
        if (mlResult.score() >= alertConfig.threshold()) {
            contract.setStatus(ContractStatus.CRITICAL);
            contractRepo.save(contract);
            alertService.dispatch(contract, assessment);
        } else if (contract.getStatus() == ContractStatus.CRITICAL) {
            // Score dropped back under the threshold: stop showing the contract as critical.
            contract.setStatus(ContractStatus.MONITORING);
            contractRepo.save(contract);
        }
        return assessment;
    }
}
