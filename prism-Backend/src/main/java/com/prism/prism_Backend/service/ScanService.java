package com.prism.prism_Backend.service;

import com.prism.prism_Backend.domain.entity.Contract;
import com.prism.prism_Backend.domain.entity.Finding;
import com.prism.prism_Backend.domain.enums.ContractStatus;
import com.prism.prism_Backend.domain.enums.Severity;
import com.prism.prism_Backend.dto.StaticAnalysisResult;
import com.prism.prism_Backend.exception.ResourceNotFoundException;
import com.prism.prism_Backend.integration.StaticAnalysisClient;
import com.prism.prism_Backend.repository.ContractRepository;
import com.prism.prism_Backend.repository.FindingRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
public class ScanService {

    private static final Logger log = LoggerFactory.getLogger(ScanService.class);

    private final ContractRepository contractRepo;
    private final FindingRepository findingRepo;
    private final StaticAnalysisClient staticAnalysisClient;
    private final FeatureExtractionService features;
    private final RiskFusionService riskFusion;
    private final TransactionTemplate tx;

    public ScanService(ContractRepository contractRepo,
                       FindingRepository findingRepo,
                       StaticAnalysisClient staticAnalysisClient,
                       FeatureExtractionService features,
                       RiskFusionService riskFusion,
                       TransactionTemplate tx) {
        this.contractRepo = contractRepo;
        this.findingRepo = findingRepo;
        this.staticAnalysisClient = staticAnalysisClient;
        this.features = features;
        this.riskFusion = riskFusion;
        this.tx = tx;
    }

    /**
     * 1. call the analyzer (slow: Slither + Gemini) OUTSIDE a transaction so no DB connection
     *    is held for minutes,
     * 2. replace the contract's findings atomically,
     * 3. build the static FeatureVector and run the risk engine so the Risk page, alerts and
     *    registry score are populated straight after a scan.
     */
    public StaticAnalysisResult scan(UUID contractId, String sourceCode) {
        if (sourceCode == null || sourceCode.isBlank()) {
            throw new IllegalArgumentException("Source code is required to run a scan.");
        }
        if (!contractRepo.existsById(contractId)) {
            throw new ResourceNotFoundException("Contract not found.");
        }

        StaticAnalysisResult result = staticAnalysisClient.analyze(sourceCode, contractId);

        List<Finding> saved = tx.execute(status -> {
            Contract contract = contractRepo.findById(contractId)
                    .orElseThrow(() -> new ResourceNotFoundException("Contract not found."));
            contract.setSourceCode(sourceCode);

            // Was: findAll() + in-memory filter + deleteAll (loads the whole table every scan).
            findingRepo.deleteByContractId(contractId);

            List<Finding> out = new ArrayList<>();
            for (var f : result.findings()) {
                Finding finding = new Finding();
                finding.setContract(contract);
                finding.setTitle(f.title());
                finding.setSeverity(Severity.valueOf(f.severity()));
                finding.setLine(f.line());
                finding.setDescription(f.description());
                finding.setRemediation(f.remediation());
                finding.setDetectorId(f.detectorId());
                finding.setFunctionName(f.functionName());
                finding.setSolidityContractName(f.solidityContractName());
                finding.setVulnerabilityFamily(f.vulnerabilityFamily());
                finding.setSourceSnippet(f.sourceSnippet());
                finding.setLineStart(f.lineStart());
                finding.setLineEnd(f.lineEnd());
                finding.setAnalyzerFindingId(f.analyzerFindingId());
                out.add(findingRepo.save(finding));
            }

            contract.setLastScanAT(Instant.now());
            if (contract.getStatus() == ContractStatus.PENDING_SCAN) {
                contract.setStatus(ContractStatus.MONITORING);
            }
            contractRepo.save(contract);
            return out;
        });

        try {
            riskFusion.evaluate(contractId, features.staticOnly(saved == null ? List.of() : saved, sourceCode));
        } catch (RuntimeException e) {
            // The scan itself succeeded; a scorer outage must not throw the findings away.
            log.warn("Risk evaluation after scan failed for {}: {}", contractId, e.getMessage());
        }
        // The analyzer's own risk_score never counts the CRITICAL promotion done in this service,
        // so the number shown after a scan disagreed with the FeatureVector / risk engine.
        // Report the same static score the engine used.
        double staticScore = features.staticRisk(saved == null ? List.of() : saved);
        return new StaticAnalysisResult(result.findings(), staticScore);
    }
}
