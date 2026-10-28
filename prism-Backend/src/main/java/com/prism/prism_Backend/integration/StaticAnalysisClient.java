package com.prism.prism_Backend.integration;

import com.prism.prism_Backend.dto.StaticAnalysisResult;
import org.springframework.stereotype.Component;

import java.util.UUID;


public interface StaticAnalysisClient {
    StaticAnalysisResult analyze(String sourceCode, UUID contractId);
}