package com.prism.prism_Backend.dto.AuthDtos;

/** `role` is optional (DEVELOPER or REVIEWER). Defaults to DEVELOPER. */
public record RegisterRequest(String username, String email, String password, String displayName, String role) {
}
