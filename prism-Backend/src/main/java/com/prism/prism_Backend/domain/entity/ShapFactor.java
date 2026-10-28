package com.prism.prism_Backend.domain.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.util.UUID;

@Entity
@Getter
@Setter
@Table(name = "shap_factors")
public class ShapFactor {

    @Id
    @GeneratedValue
    private UUID id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "risk_assessment_id")
    private RiskAssessment riskAssessment;

    private String featureName;

    private double contribution;
}