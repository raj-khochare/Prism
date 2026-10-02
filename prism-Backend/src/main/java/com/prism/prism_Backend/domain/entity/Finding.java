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
    @Lob
    private String description;
    @Lob
    private String remediation;
}
