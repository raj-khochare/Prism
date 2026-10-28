package com.prism.prism_Backend.domain.entity;

import com.prism.prism_Backend.domain.enums.Role;
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

    /**
     * Needed to enforce the DEVELOPER/REVIEWER split in the spec. Nullable in the DB so
     * rows created before this column existed still load (treated as DEVELOPER).
     */
    @Enumerated(EnumType.STRING)
    private Role role = Role.DEVELOPER;
}
