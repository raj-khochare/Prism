package com.prism.prism_Backend.domain.enums;

/** The two roles from the Argus spec. Enforced server-side with @PreAuthorize. */
public enum Role {
    DEVELOPER,
    REVIEWER
}
