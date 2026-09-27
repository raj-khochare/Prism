package com.prism.prism_Backend.domain.entity;

import com.prism.prism_Backend.domain.enums.RiskBand;
import jakarta.persistence.*;
import lombok.Data;


import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Data
@Table(name = "risk_assessment")
public class RiskAssessment {

    @Id
    @GeneratedValue
    private UUID id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "contract_id")
    private Contract contract;
    private int score;
    @Enumerated(EnumType.STRING)
    private RiskBand band;
    private double confidence;
    private Instant computedAt = Instant.now();
    @OneToMany(mappedBy = "riskAssessment", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<ShapFactor> factors = new ArrayList<>();
}
