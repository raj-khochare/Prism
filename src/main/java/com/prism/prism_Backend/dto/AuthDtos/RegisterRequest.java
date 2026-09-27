package com.prism.prism_Backend.dto.AuthDtos;

public record RegisterRequest(String username, String email, String password, String displayName) {

}