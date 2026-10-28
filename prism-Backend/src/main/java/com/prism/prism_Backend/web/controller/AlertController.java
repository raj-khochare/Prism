package com.prism.prism_Backend.web.controller;

import com.prism.prism_Backend.domain.entity.Alert;
import com.prism.prism_Backend.dto.AlertCardDto;
import com.prism.prism_Backend.dto.AlertConfigDto;
import com.prism.prism_Backend.dto.PageResponse;
import com.prism.prism_Backend.exception.ResourceNotFoundException;
import com.prism.prism_Backend.repository.AlertRepository;
import com.prism.prism_Backend.service.AlertConfigService;
import com.prism.prism_Backend.service.AlertPresentationService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Comparator;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/alerts")
public class AlertController {

    private final AlertRepository repo;
    private final AlertPresentationService presenter;
    private final AlertConfigService config;

    public AlertController(AlertRepository repo, AlertPresentationService presenter, AlertConfigService config) {
        this.repo = repo;
        this.presenter = presenter;
        this.config = config;
    }

    @GetMapping
    public PageResponse<AlertCardDto> list(
            @RequestParam(required = false, defaultValue = "All") String status,
            @RequestParam(required = false, defaultValue = "All") String severity,
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer pageSize
    ) {
        int p = (page == null || page < 1) ? 1 : page;
        int ps = (pageSize == null || pageSize < 1) ? 10 : pageSize;

        List<AlertCardDto> all = repo.findAll().stream()
                .sorted(Comparator.comparing(Alert::getSentAt).reversed()) // newest first
                .map(presenter::toCard)
                .filter(a -> "All".equalsIgnoreCase(status) || a.status().equalsIgnoreCase(status))
                .filter(a -> "All".equalsIgnoreCase(severity) || a.severity().equalsIgnoreCase(severity))
                .toList();

        int from = Math.min((p - 1) * ps, all.size());
        int to = Math.min(from + ps, all.size());
        return PageResponse.of(all.subList(from, to), all.size(), p, ps);
    }

    // Open to both roles (not one of the four DEVELOPER-only write endpoints in the spec).
    @PutMapping("/{id}/acknowledge")
    public AlertCardDto acknowledge(@PathVariable UUID id) {
        Alert a = find(id);
        a.setAcknowledged(true);
        return presenter.toCard(repo.save(a));
    }

    @PutMapping("/{id}/dismiss")
    @PreAuthorize("hasRole('DEVELOPER')")
    public AlertCardDto dismiss(@PathVariable UUID id) {
        Alert a = find(id);
        a.setDismissed(true);
        a.setAcknowledged(true);
        return presenter.toCard(repo.save(a));
    }

    @GetMapping("/config")
    public AlertConfigDto getConfig() {
        return config.current();
    }

    /** The spec's "configureAlerts" endpoint. */
    @PutMapping("/config")
    @PreAuthorize("hasRole('DEVELOPER')")
    public AlertConfigDto updateConfig(@RequestBody AlertConfigDto next) {
        return config.update(next);
    }

    private Alert find(UUID id) {
        return repo.findById(id).orElseThrow(() -> new ResourceNotFoundException("Alert not found."));
    }
}
