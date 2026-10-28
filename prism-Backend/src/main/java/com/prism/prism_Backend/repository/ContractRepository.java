package com.prism.prism_Backend.repository;

import com.prism.prism_Backend.domain.entity.Contract;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.Optional;
import java.util.UUID;

public interface ContractRepository extends JpaRepository<Contract, UUID>, JpaSpecificationExecutor<Contract> {

    Page<Contract> findAll(Specification<Contract> spec, Pageable pageable);

    /** Duplicate-address check without loading the whole table. */
    boolean existsByAddressIgnoreCase(String address);

    /** A scanned contract (source only) and a registered one (address only) are the same asset. */
    Optional<Contract> findFirstByNameIgnoreCase(String name);

    Optional<Contract> findFirstByNameIgnoreCaseAndAddressIsNull(String name);

    /** A scanned contract (has source) that was redeployed: re-register points it at the new address. */
    Optional<Contract> findFirstByNameIgnoreCaseAndSourceCodeIsNotNull(String name);
}
