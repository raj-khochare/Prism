package com.prism.prism_Backend.domain.entity;

import com.prism.prism_Backend.domain.enums.Severity;
import jakarta.persistence.*;
import lombok.Data;

import java.util.UUID;


@Entity
@Data
@Table(name = "findings")
public class Finding {

    @Id
    @GeneratedValue
    private UUID id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "contract_id")
    private Contract contract;
    private String title;
    @Enumerated(EnumType.STRING)
    private Severity severity;
    private int line;
    private String function;
    @Column(columnDefinition = "TEXT")
    private String description;
    @Column(columnDefinition = "TEXT")
    private String remediation;


    private String detectorId;

    private String functionName;

    private String solidityContractName;

    private String vulnerabilityFamily;

    // Was VARCHAR(255): real code snippets overflow that and the INSERT failed.
    @Column(columnDefinition = "TEXT")
    private String sourceSnippet;

    private Integer lineStart;

    private Integer lineEnd;

    private UUID analyzerFindingId;
}
