package com.prism.prism_Backend.service;

import com.prism.prism_Backend.exception.ResourceNotFoundException;
import com.prism.prism_Backend.repository.AlertRepository;
import com.prism.prism_Backend.repository.ContractRepository;
import com.prism.prism_Backend.repository.FindingRepository;
import com.prism.prism_Backend.repository.RiskAssessmentRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
public class ContractService {

    private final ContractRepository contractRepo;
    private final FindingRepository findingRepo;
    private final RiskAssessmentRepository riskRepo;
    private final AlertRepository alertRepo;

    public ContractService(ContractRepository contractRepo, FindingRepository findingRepo,
                           RiskAssessmentRepository riskRepo, AlertRepository alertRepo) {
        this.contractRepo = contractRepo;
        this.findingRepo = findingRepo;
        this.riskRepo = riskRepo;
        this.alertRepo = alertRepo;
    }

    /** Removes a contract and everything that references it (children first: foreign keys). */
    @Transactional
    public void delete(UUID id) {
        if (!contractRepo.existsById(id)) {
            throw new ResourceNotFoundException("Contract not found.");
        }
        alertRepo.deleteByContractId(id);
        riskRepo.deleteByContractId(id);   // cascades to the SHAP factor rows
        findingRepo.deleteByContractId(id);
        contractRepo.deleteById(id);
    }
}
