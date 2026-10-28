package com.prism.prism_Backend.dto;

public record AlertConfigDto(
        int threshold,
        boolean telegramEnabled,
        boolean emailEnabled,
        String telegramChatId,
        String emailRecipient
) {}
