package com.prism.prism_Backend.web.controller;

import com.prism.prism_Backend.blockchain.RuntimeMonitorService;
import com.prism.prism_Backend.domain.entity.Contract;
import com.prism.prism_Backend.dto.PageResponse;
import com.prism.prism_Backend.dto.RuntimeEventDto;
import com.prism.prism_Backend.dto.TelemetryPoint;
import com.prism.prism_Backend.exception.ResourceNotFoundException;
import com.prism.prism_Backend.repository.ContractRepository;
import com.prism.prism_Backend.service.RuntimeEventBuffer;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/runtime")
public class RuntimeController {

    private final RuntimeEventBuffer buffer;
    private final ContractRepository contractRepo;
    private final RuntimeMonitorService monitor;

    public RuntimeController(RuntimeEventBuffer buffer, ContractRepository contractRepo, RuntimeMonitorService monitor) {
        this.buffer = buffer;
        this.contractRepo = contractRepo;
        this.monitor = monitor;
    }

    public record OraclePoolRequest(String contractAddress, String poolAddress) {}

    /** Developer-only. Points the oracle-deviation detector at a V2-style pool for a monitored contract. */
    @PutMapping("/oracle-pools")
    @PreAuthorize("hasRole('DEVELOPER')")
    @ResponseStatus(org.springframework.http.HttpStatus.NO_CONTENT)
    public void setOraclePool(@RequestBody OraclePoolRequest req) {
        String re = "0x[0-9a-fA-F]{40}";
        if (req == null || req.contractAddress() == null || req.poolAddress() == null
                || !req.contractAddress().matches(re) || !req.poolAddress().matches(re)) {
            throw new IllegalArgumentException("contractAddress and poolAddress must be 0x-prefixed 20-byte addresses.");
        }
        monitor.setOraclePool(req.contractAddress(), req.poolAddress());
    }

    @DeleteMapping("/oracle-pools/{contractAddress}")
    @PreAuthorize("hasRole('DEVELOPER')")
    @ResponseStatus(org.springframework.http.HttpStatus.NO_CONTENT)
    public void removeOraclePool(@PathVariable String contractAddress) {
        monitor.removeOraclePool(contractAddress);
    }

    @GetMapping("/telemetry")
    public Map<String, Object> telemetry(@RequestParam UUID contractId) {
        Contract c = contractRepo.findById(contractId).orElseThrow(() -> new ResourceNotFoundException("Contract not found."));
        List<TelemetryPoint> series = buffer.series(c.getName());
        var head = monitor.status().head();

        List<Map<String, Object>> questions = new ArrayList<>();
        if (!series.isEmpty()) {
            TelemetryPoint last = series.get(series.size() - 1);
            double avgVel = series.stream().mapToDouble(TelemetryPoint::velocity).average().orElse(0);
            double avgGas = series.stream().mapToDouble(TelemetryPoint::gas).average().orElse(0);
            questions.add(q("Has transaction activity changed significantly?",
                    String.format(Locale.ROOT, "%.0f tx in last block vs %.1f average", last.velocity(), avgVel), last.velocity() > avgVel * 3 && last.velocity() > 3));
            questions.add(q("Is execution consuming abnormal computational steps?",
                    String.format(Locale.ROOT, "%.0fk gas vs %.0fk average", last.gas(), avgGas), avgGas > 0 && last.gas() > avgGas * 2.5));
            questions.add(q("Has large capital moved unusually?",
                    String.format(Locale.ROOT, "$%.0fk moved in last block", last.flow()), last.flow() >= 100));
        }
        String latest = buffer.events().stream()
                .filter(e -> e.contract().equals(c.getName()) && !"Low".equals(e.severity()))
                .map(RuntimeEventDto::description).findFirst().orElse("Nominal execution baseline");

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("contract", c.getName());
        out.put("currentBlock", head == null ? 0 : head.longValue());
        out.put("series", series);
        out.put("latestDetection", latest);
        out.put("activeQuestions", questions);
        return out;
    }

    @GetMapping("/events")
    public PageResponse<RuntimeEventDto> events(
            @RequestParam(required = false) String search,
            @RequestParam(required = false, defaultValue = "All") String contract,
            @RequestParam(required = false, defaultValue = "All") String severity,
            @RequestParam(required = false, defaultValue = "All") String eventType,
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer pageSize) {
        int p = (page == null || page < 1) ? 1 : page;
        int ps = (pageSize == null || pageSize < 1) ? 10 : pageSize;
        String q = search == null ? "" : search.trim().toLowerCase(Locale.ROOT);

        List<RuntimeEventDto> all = buffer.events().stream()
                .filter(e -> "All".equalsIgnoreCase(contract) || e.contract().equalsIgnoreCase(contract))
                .filter(e -> "All".equalsIgnoreCase(severity) || e.severity().equalsIgnoreCase(severity))
                .filter(e -> "All".equalsIgnoreCase(eventType) || e.eventType().equalsIgnoreCase(eventType))
                .filter(e -> q.isEmpty() || e.contract().toLowerCase(Locale.ROOT).contains(q)
                        || e.txHash().toLowerCase(Locale.ROOT).contains(q) || e.description().toLowerCase(Locale.ROOT).contains(q))
                .toList();
        int from = Math.min((p - 1) * ps, all.size());
        int to = Math.min(from + ps, all.size());
        return PageResponse.of(all.subList(from, to), all.size(), p, ps);
    }

    private static Map<String, Object> q(String question, String status, boolean alert) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("question", question);
        m.put("status", status);
        m.put("alert", alert);
        return m;
    }
}
