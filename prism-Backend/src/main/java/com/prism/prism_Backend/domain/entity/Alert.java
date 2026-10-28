package com.prism.prism_Backend.domain.entity;

import com.prism.prism_Backend.domain.enums.AlertChannel;
import com.prism.prism_Backend.domain.enums.Severity;
import jakarta.persistence.*;
import lombok.Data;

import java.time.Instant;
import java.util.UUID;

@Entity
@Data
@Table(name = "alerts")
public class Alert {
    @Id
    @GeneratedValue
    private UUID id;
    @ManyToOne(optional = false)
    @JoinColumn(name = "contract_id")
    private Contract contract;
    @Enumerated(EnumType.STRING)
    private Severity severity;
    // @Lob maps a String to a Postgres *large object* (oid) under Hibernate 6+/7, which
    // breaks plain reads/queries. Use a normal TEXT column.
    @Column(columnDefinition = "TEXT")
    private String message;
    @Enumerated(EnumType.STRING)
    private AlertChannel channel;
    private Instant sentAt = Instant.now();
    private boolean dismissed = false;
    private boolean acknowledged = false;
}
