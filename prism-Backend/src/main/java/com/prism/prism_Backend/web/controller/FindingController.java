package com.prism.prism_Backend.web.controller;

import com.prism.prism_Backend.dto.FindingCardDto;
import com.prism.prism_Backend.dto.PageResponse;
import com.prism.prism_Backend.repository.FindingRepository;
import com.prism.prism_Backend.service.FindingPresentationService;
import org.springframework.web.bind.annotation.*;

import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/findings")
public class FindingController {

    private static final Map<String, Integer> ORDER = Map.of("Critical", 0, "High", 1, "Medium", 2, "Low", 3);

    private final FindingRepository repo;
    private final FindingPresentationService presenter;

    public FindingController(FindingRepository repo, FindingPresentationService presenter) {
        this.repo = repo;
        this.presenter = presenter;
    }

    @GetMapping
    public PageResponse<FindingCardDto> list(
            @RequestParam(required = false) UUID contractId,
            @RequestParam(required = false) String search,
            @RequestParam(required = false, defaultValue = "All") String severity,
            @RequestParam(required = false, defaultValue = "All") String category,
            @RequestParam(required = false, defaultValue = "All") String contract,
            @RequestParam(required = false, defaultValue = "All") String detector,
            @RequestParam(required = false, defaultValue = "All") String status,
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer pageSize
    ) {
        int p = (page == null || page < 1) ? 1 : page;
        int ps = (pageSize == null || pageSize < 1) ? 10 : pageSize;
        String q = search == null ? "" : search.trim().toLowerCase(Locale.ROOT);

        var source = contractId == null ? repo.findAll() : repo.findByContractId(contractId);
        List<FindingCardDto> all = source.stream()
                .map(presenter::toCard)
                .filter(f -> is(severity, f.severity()))
                .filter(f -> is(category, f.category()))
                .filter(f -> is(contract, f.contract()))
                .filter(f -> is(detector, f.detector()))
                .filter(f -> is(status, f.status()))
                .filter(f -> q.isEmpty() || contains(f.title(), q) || contains(f.detector(), q)
                        || contains(f.contract(), q) || contains(f.file(), q))
                .sorted(Comparator.comparingInt((FindingCardDto f) -> ORDER.getOrDefault(f.severity(), 9)))
                .toList();

        int from = Math.min((p - 1) * ps, all.size());
        int to = Math.min(from + ps, all.size());
        return PageResponse.of(all.subList(from, to), all.size(), p, ps);
    }

    private static boolean is(String filter, String value) {
        return "All".equalsIgnoreCase(filter) || (value != null && value.equalsIgnoreCase(filter));
    }

    private static boolean contains(String v, String q) {
        return v != null && v.toLowerCase(Locale.ROOT).contains(q);
    }
}
