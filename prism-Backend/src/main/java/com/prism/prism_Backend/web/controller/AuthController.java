package com.prism.prism_Backend.web.controller;

import com.prism.prism_Backend.domain.entity.AppUser;
import com.prism.prism_Backend.dto.AuthDtos.AuthResponse;
import com.prism.prism_Backend.dto.AuthDtos.LoginRequest;
import com.prism.prism_Backend.dto.AuthDtos.MeResponse;
import com.prism.prism_Backend.dto.AuthDtos.RegisterRequest;
import com.prism.prism_Backend.exception.ResourceConflictException;
import com.prism.prism_Backend.repository.spec.AppUserRepository;
import com.prism.prism_Backend.security.JwtService;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AppUserRepository userRepository;
    private final PasswordEncoder encoder;
    private final JwtService jwtService;

    public AuthController(AppUserRepository userRepository, PasswordEncoder encoder, JwtService jwtService) {
        this.userRepository = userRepository;
        this.encoder = encoder;
        this.jwtService = jwtService;
    }

    @PostMapping("/register")
    public AuthResponse register(@RequestBody RegisterRequest req) {

        if (req.username() == null || req.username().isBlank()) {
            throw new IllegalArgumentException("Username is required.");            // 400 — bad input
        }
        if (req.email() == null || req.email().isBlank()) {
            throw new IllegalArgumentException("Email is required.");               // 400
        }
        if (req.password() == null || req.password().length() < 8) {
            throw new IllegalArgumentException("Password must be at least 8 characters."); // 400
        }
        if (userRepository.findByUsername(req.username()).isPresent()) {
            throw new ResourceConflictException("That username is already taken."); // 409 — was IllegalArgumentException
        }
        if (userRepository.findByEmail(req.email()).isPresent()) {
            throw new ResourceConflictException("That email is already registered."); // 409 — was IllegalArgumentException
        }


        AppUser user = new AppUser();

        user.setUsername(req.username());
        user.setEmail(req.email());
        user.setPasswordHash(encoder.encode(req.password()));
        user.setDisplayName(req.displayName());

        userRepository.save(user);

        String token = jwtService.generateToken(user.getUsername());

        return new AuthResponse(
                token,
                user.getUsername()
        );
    }


    @PostMapping("/login")
    public AuthResponse login(@RequestBody LoginRequest req) {

        if (req.identifier() == null || req.identifier().isBlank() || req.password() == null) {
            throw new IllegalArgumentException("Username/email and password are required."); // 400
        }

        String identifier = req.identifier().trim();

        AppUser user = userRepository.findByUsername(identifier)
                .or(() -> userRepository.findByEmail(identifier))
                .orElseThrow(() -> new BadCredentialsException("Invalid username/email or password.")); // 401 — was IllegalArgumentException

        if (!encoder.matches(req.password(), user.getPasswordHash())) {
            throw new BadCredentialsException("Invalid username/email or password."); // 401 — was IllegalArgumentException
        }

        String token = jwtService.generateToken(user.getUsername());

        return new AuthResponse(
                token,
                user.getUsername()
        );
    }

    @GetMapping("/me")
    public MeResponse me(Authentication auth) {

        AppUser user = userRepository
                .findByUsername(auth.getName())
                .orElseThrow();

        return new MeResponse(
                user.getUsername(),
                user.getEmail(),
                user.getDisplayName()
        );
    }

}
