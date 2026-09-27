package com.prism.prism_Backend.repository.spec;

import com.prism.prism_Backend.domain.entity.RiskAssessment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface RiskAssessmentRepository extends JpaRepository<RiskAssessment, UUID> {}