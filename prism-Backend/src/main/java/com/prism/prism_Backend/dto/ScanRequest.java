package com.prism.prism_Backend.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public record ScanRequest(
        @JsonProperty("sourceCode")
        String sourceCode,

        @JsonProperty("fileName")
        String fileName
) {}
