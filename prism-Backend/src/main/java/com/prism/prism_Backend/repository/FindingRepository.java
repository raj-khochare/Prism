package com.prism.prism_Backend.repository;

import com.prism.prism_Backend.domain.entity.Finding;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.List;
import java.util.UUID;

public interface FindingRepository extends JpaRepository<Finding, UUID>, JpaSpecificationExecutor<Finding> {

    List<Finding> findByContractId(UUID contractId);

    void deleteByContractId(UUID contractId);
}