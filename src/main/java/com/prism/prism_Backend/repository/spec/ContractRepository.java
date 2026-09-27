package com.prism.prism_Backend.repository.spec;

import com.prism.prism_Backend.domain.entity.Contract;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.UUID;

public interface ContractRepository extends JpaRepository<Contract, UUID>, JpaSpecificationExecutor<Contract> {
}
