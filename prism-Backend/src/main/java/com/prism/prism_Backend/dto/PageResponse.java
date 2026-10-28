package com.prism.prism_Backend.dto;

import java.util.List;

public record PageResponse<T>(
        List<T> items,
        long total,
        int page, int pageSize,
        int totalPages
) {
    public static <T> PageResponse<T> of(
            List<T> items,
            long total,
            int page,
            int pageSize
    ) {
        int totalPages = (int) Math.max(1, Math.ceil((double) total / pageSize));
        return new PageResponse<>(items, total, page, pageSize, totalPages);
    }
}