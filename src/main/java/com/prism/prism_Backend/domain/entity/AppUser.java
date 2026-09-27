package com.prism.prism_Backend.domain.entity;

import jakarta.persistence.*;
import lombok.Data;

import java.util.UUID;

@Entity
@Data
@Table(name = "app_users")
public class AppUser {
    @Id
    @GeneratedValue
    private UUID id;
    @Column(unique = true, nullable = false)
    private String username;
    @Column(unique = true, nullable = false)
    private String email;
    @Column(nullable = false)
    private String passwordHash;
    private String displayName;
}
