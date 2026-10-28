package com.prism.prism_Backend.domain.entity;

import com.prism.prism_Backend.domain.enums.ContractStatus;
import jakarta.persistence.*;
import lombok.Data;

import java.time.Instant;
import java.util.UUID;


@Entity
@Data
@Table(name = "contracts")
public class Contract {

    @Id
    @GeneratedValue
    private UUID id;

    @Column(nullable = false)
    private String name;
    private String address;
    private String chain;
    @Column(columnDefinition = "TEXT")
    private String sourceCode;
    @Enumerated(EnumType.STRING)
    private ContractStatus status = ContractStatus.PENDING_SCAN;

    private Instant lastScanAT;
    private Instant registeredAT = Instant.now();
}
