package com.prism.prism_Backend.repository;

import com.prism.prism_Backend.domain.entity.Alert;
import com.prism.prism_Backend.domain.entity.Finding;
import com.prism.prism_Backend.domain.entity.RiskAssessment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface RiskAssessmentRepository extends JpaRepository<RiskAssessment, UUID> {
    Optional<RiskAssessment>
    findTopByContractIdOrderByComputedAtDesc(UUID contractId);

    List<RiskAssessment>
    findByContractId(UUID contractId);

    void deleteByContractId(UUID contractId);

    long countByContractIdAndComputedAtAfter(
            UUID contractId,
            Instant timestamp
    );



}