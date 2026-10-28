package com.prism.prism_Backend.web.controller;

import com.prism.prism_Backend.service.OverviewService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/overview")
public class OverviewController {

    private final OverviewService service;

    public OverviewController(OverviewService service) {
        this.service = service;
    }

    @GetMapping
    public Map<String, Object> overview() {
        return service.build();
    }
}
