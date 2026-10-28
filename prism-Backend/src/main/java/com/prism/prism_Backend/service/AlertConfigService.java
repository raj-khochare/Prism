package com.prism.prism_Backend.service;

import com.prism.prism_Backend.dto.AlertConfigDto;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;

/**
 * Runtime alert settings (the "configureAlerts" write endpoint from the spec).
 * Held in memory on purpose: the locked schema has no settings table. Defaults come from
 * application.yml, so a restart returns to those defaults.
 */
@Service
public class AlertConfigService {

    private final AtomicInteger threshold;
    private final AtomicBoolean telegramEnabled;
    private final AtomicBoolean emailEnabled = new AtomicBoolean(false);
    // Empty = "no UI override, fall back to the server's TELEGRAM_CHAT_ID env var".
    private final AtomicReference<String> telegramChatId = new AtomicReference<>("");
    private final AtomicReference<String> emailRecipient = new AtomicReference<>("");

    public AlertConfigService(@Value("${prism.alerts.default-threshold}") int defaultThreshold,
                              @Value("${prism.alerts.telegram.enabled:true}") boolean telegramDefault) {
        this.threshold = new AtomicInteger(defaultThreshold);
        this.telegramEnabled = new AtomicBoolean(telegramDefault);
    }

    public AlertConfigDto current() {
        return new AlertConfigDto(threshold.get(), telegramEnabled.get(), emailEnabled.get(),
                telegramChatId.get(), emailRecipient.get());
    }

    public int threshold() {
        return threshold.get();
    }

    public boolean telegramEnabled() {
        return telegramEnabled.get();
    }

    public boolean emailEnabled() {
        return emailEnabled.get();
    }

    /** Blank means "no override" - caller should fall back to the env-configured chat id. */
    public String telegramChatId() {
        return telegramChatId.get();
    }

    public String emailRecipient() {
        return emailRecipient.get();
    }

    public AlertConfigDto update(AlertConfigDto next) {
        if (next.threshold() < 1 || next.threshold() > 100) {
            throw new IllegalArgumentException("Threshold must be between 1 and 100.");
        }
        threshold.set(next.threshold());
        telegramEnabled.set(next.telegramEnabled());
        emailEnabled.set(next.emailEnabled());
        telegramChatId.set(next.telegramChatId() == null ? "" : next.telegramChatId().trim());
        emailRecipient.set(next.emailRecipient() == null ? "" : next.emailRecipient().trim());
        return current();
    }
}