package com.prism.prism_Backend.web.controller;

import com.prism.prism_Backend.domain.entity.Contract;
import com.prism.prism_Backend.dto.FindingCardDto;
import com.prism.prism_Backend.dto.ScanRequest;
import com.prism.prism_Backend.dto.ScanResponse;
import com.prism.prism_Backend.dto.StaticAnalysisResult;
import com.prism.prism_Backend.repository.ContractRepository;
import com.prism.prism_Backend.repository.FindingRepository;
import com.prism.prism_Backend.service.FindingPresentationService;
import com.prism.prism_Backend.service.ScanService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api")
public class ScanController {

    private final ScanService scanService;
    private final ContractRepository contractRepo;
    private final FindingRepository findingRepo;
    private final FindingPresentationService presenter;

    public ScanController(ScanService scanService, ContractRepository contractRepo,
                          FindingRepository findingRepo, FindingPresentationService presenter) {
        this.scanService = scanService;
        this.contractRepo = contractRepo;
        this.findingRepo = findingRepo;
        this.presenter = presenter;
    }

    /**
     * Scan an upload. This is the endpoint the frontend actually calls (it used to POST to
     * /api/scan, which did not exist, so scanning never worked). A registry entry is created
     * on the fly, or an existing one is reused if `contractId` is supplied.
     */
    @PostMapping("/scan")
    @PreAuthorize("hasRole('DEVELOPER')")
    public ScanResponse scanUpload(@RequestBody ScanRequest req, @RequestParam(required = false) UUID contractId) {
        validate(req);
        UUID id = contractId;
        if (id == null) {
            String name = stripSol(req.fileName());
            Contract c = contractRepo.findFirstByNameIgnoreCase(name).orElse(null);
            if (c == null) {
                c = new Contract();
                c.setName(name);
                c.setChain("Local (Hardhat fork)");
                c = contractRepo.save(c);
            }
            id = c.getId();
        }
        return run(id, req);
    }

    @PostMapping("/contracts/{contractId}/scan")
    @PreAuthorize("hasRole('DEVELOPER')")
    public ScanResponse scan(@PathVariable UUID contractId, @RequestBody ScanRequest req) {
        validate(req);
        return run(contractId, req);
    }

    private ScanResponse run(UUID contractId, ScanRequest req) {
        StaticAnalysisResult result = scanService.scan(contractId, req.sourceCode());
        List<FindingCardDto> findings = findingRepo.findByContractId(contractId).stream().map(presenter::toCard).toList();
        return new ScanResponse(req.fileName(), Instant.now().toString(), result.staticRiskContribution(), findings);
    }

    private static void validate(ScanRequest req) {
        if (req.sourceCode() == null || req.sourceCode().isBlank()) {
            throw new IllegalArgumentException("Source code is required.");
        }
    }

    private static String stripSol(String fileName) {
        if (fileName == null || fileName.isBlank()) return "UploadedContract";
        return fileName.replaceAll("(?i)\\.sol$", "");
    }
}
