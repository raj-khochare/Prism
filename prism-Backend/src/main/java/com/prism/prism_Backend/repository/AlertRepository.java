package com.prism.prism_Backend.repository;

import com.prism.prism_Backend.domain.entity.Alert;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface AlertRepository extends JpaRepository<Alert, UUID>, JpaSpecificationExecutor<Alert> {

    Optional<Alert> findTopByContractIdOrderBySentAtDesc(UUID contractId);

    List<Alert>
    findByContractId(UUID contractId);

    void deleteByContractId(UUID contractId);

    long countByAcknowledgedFalseAndDismissedFalse();
}

