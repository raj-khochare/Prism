package com.prism.prism_Backend.web.controller;

import com.prism.prism_Backend.domain.entity.Contract;
import com.prism.prism_Backend.dto.ContractCardDto;
import com.prism.prism_Backend.dto.PageResponse;
import com.prism.prism_Backend.exception.ResourceConflictException;
import com.prism.prism_Backend.exception.ResourceNotFoundException;
import com.prism.prism_Backend.repository.ContractRepository;
import com.prism.prism_Backend.repository.spec.ContractSpecifications;
import com.prism.prism_Backend.service.ContractPresentationService;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/contracts")
public class ContractRegistryController {

    private final ContractRepository repo;
    private final ContractPresentationService presenter;
    private final com.prism.prism_Backend.service.ContractService contractService;

    public ContractRegistryController(ContractRepository repo, ContractPresentationService presenter,
                                      com.prism.prism_Backend.service.ContractService contractService) {
        this.contractService = contractService;
        this.repo = repo;
        this.presenter = presenter;
    }

    @GetMapping
    public PageResponse<ContractCardDto> list(
            @RequestParam(required = false) String search,
            @RequestParam(required = false, defaultValue = "All") String chain,
            @RequestParam(required = false, defaultValue = "All") String status,
            @RequestParam(required = false, defaultValue = "All") String risk,
            @RequestParam(required = false, defaultValue = "riskScore") String sortBy,
            @RequestParam(required = false, defaultValue = "desc") String sortDir,
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer pageSize
    ) {
        int p = (page == null || page < 1) ? 1 : page;
        int ps = (pageSize == null || pageSize < 1) ? 10 : pageSize;

        Specification<Contract> spec = Specification.where(ContractSpecifications.chainEquals(chain))
                .and(ContractSpecifications.nameOrAddressContains(search));

        // status / risk / sort are derived from risk assessments, so they run after mapping.
        List<ContractCardDto> all = repo.findAll(spec).stream()
                .map(presenter::toCard)
                .filter(c -> "All".equalsIgnoreCase(status) || c.status().equalsIgnoreCase(status))
                .filter(c -> "All".equalsIgnoreCase(risk) || c.severity().equalsIgnoreCase(risk))
                .sorted(comparator(sortBy, "asc".equalsIgnoreCase(sortDir)))
                .toList();

        int from = Math.min((p - 1) * ps, all.size());
        int to = Math.min(from + ps, all.size());
        return PageResponse.of(all.subList(from, to), all.size(), p, ps);
    }

    @GetMapping("/{id}")
    public ContractCardDto get(@PathVariable UUID id) {
        return presenter.toCard(repo.findById(id).orElseThrow(() -> new ResourceNotFoundException("Contract not found.")));
    }

    /** Developer-only. Added so a redeployed contract can be removed and registered again. */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('DEVELOPER')")
    @ResponseStatus(org.springframework.http.HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID id) {
        contractService.delete(id);
    }

    @PostMapping
    @PreAuthorize("hasRole('DEVELOPER')")
    public ContractCardDto register(@RequestBody RegisterContractRequest req) {
        if (req.address() == null || !req.address().matches("0x[0-9a-fA-F]{40}")) {
            throw new IllegalArgumentException("Invalid EVM contract address format (must be 42 characters starting with 0x).");
        }
        if (repo.existsByAddressIgnoreCase(req.address())) {
            throw new ResourceConflictException("That contract address is already registered.");
        }
        String name = req.name() == null || req.name().isBlank() ? "MonitoredContract" : req.name().trim();
        // FIX: a scan creates a source-only entry and registering created a second, address-only
        // entry, so static findings and runtime signals never ended up on the same contract and
        // the "fused" score never actually fused anything. If a scanned entry with this name has
        // no address yet, attach the address to it instead of creating a duplicate.
        // Also covers a redeployed vault: re-registering a scanned contract (it has source and
        // findings) under the same name moves it to the new address instead of creating an
        // empty duplicate whose score has no static part.
        Contract c = repo.findFirstByNameIgnoreCaseAndAddressIsNull(name)
                .or(() -> repo.findFirstByNameIgnoreCaseAndSourceCodeIsNotNull(name))
                .orElseGet(Contract::new);
        c.setName(name);
        c.setAddress(req.address());
        if (req.chain() != null && !req.chain().isBlank()) {
            c.setChain(req.chain());
        } else if (c.getChain() == null || c.getChain().isBlank()) {
            c.setChain("Ethereum Mainnet");
        }
        c.setRegisteredAT(Instant.now());
        repo.save(c);
        return presenter.toCard(c);
    }

    private static Comparator<ContractCardDto> comparator(String sortBy, boolean asc) {
        Comparator<ContractCardDto> cmp = switch (sortBy) {
            case "name" -> Comparator.comparing(ContractCardDto::name, String.CASE_INSENSITIVE_ORDER);
            case "tx24h" -> Comparator.comparingLong(ContractCardDto::tx24h);
            case "lastScan" -> Comparator.comparing(ContractCardDto::lastScan);
            default -> Comparator.comparingInt(ContractCardDto::riskScore);
        };
        return asc ? cmp : cmp.reversed();
    }

    public record RegisterContractRequest(String name, String address, String chain) {}
}
