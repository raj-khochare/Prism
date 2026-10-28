package com.prism.prism_Backend.web.controller;

import com.prism.prism_Backend.service.SystemStatusService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/system")
public class SystemStatusController {

    private final SystemStatusService service;

    public SystemStatusController(SystemStatusService service) {
        this.service = service;
    }

    @GetMapping("/status")
    public List<Map<String, String>> status() {
        return service.components();
    }
}
