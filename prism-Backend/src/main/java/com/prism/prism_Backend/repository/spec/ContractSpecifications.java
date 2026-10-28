package com.prism.prism_Backend.repository.spec;

import com.prism.prism_Backend.domain.entity.Contract;
import org.springframework.data.jpa.domain.Specification;

public class ContractSpecifications {
    public static Specification<Contract> chainEquals(String chain) {
        return (root, query, cb) -> (chain == null || chain.equalsIgnoreCase("All"))
                ? cb.conjunction() : cb.equal(cb.lower(root.get("chain")), chain.toLowerCase());
    }

    public static Specification<Contract> nameOrAddressContains(String search) {
        return (root, query, cb) -> {
            if (search == null || search.isBlank()) return cb.conjunction();
            String like = "%" + search.toLowerCase() + "%";
            return cb.or(cb.like(cb.lower(root.get("name")), like), cb.like(cb.lower(root.get("address")), like));
        };
    }
}