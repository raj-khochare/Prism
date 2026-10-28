package com.prism.prism_Backend.service;

import com.prism.prism_Backend.domain.entity.Alert;
import com.prism.prism_Backend.domain.entity.Contract;
import com.prism.prism_Backend.domain.entity.RiskAssessment;
import com.prism.prism_Backend.domain.entity.ShapFactor;
import com.prism.prism_Backend.domain.enums.AlertChannel;
import com.prism.prism_Backend.domain.enums.Severity;
import com.prism.prism_Backend.repository.AlertRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.time.Duration;
import java.time.Instant;
import java.util.Comparator;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@Service
public class AlertService {

    private static final Logger log = LoggerFactory.getLogger(AlertService.class);

    private final AlertRepository alertRepo;
    private final AlertConfigService config;
    private final AlertPresentationService presenter;
    private final SimpMessagingTemplate ws;
    private final RestClient telegramClient;
    private final String botToken;
    private final String chatId;
    private final long cooldownSeconds;
    private final Map<UUID, Instant> lastAlertAt = new ConcurrentHashMap<>();

    public AlertService(AlertRepository alertRepo,
                        AlertConfigService config,
                        AlertPresentationService presenter,
                        SimpMessagingTemplate ws,
                        @Value("${prism.alerts.telegram.bot-token:}") String botToken,
                        @Value("${prism.alerts.telegram.chat-id:}") String chatId,
                        @Value("${prism.alerts.cooldown-seconds:60}") long cooldownSeconds) {
        this.alertRepo = alertRepo;
        this.config = config;
        this.presenter = presenter;
        this.ws = ws;
        this.botToken = botToken;
        this.chatId = chatId;
        this.cooldownSeconds = cooldownSeconds;

        var factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(3_000);
        factory.setReadTimeout((int) Duration.ofSeconds(5).toMillis());
        this.telegramClient = RestClient.builder().baseUrl("https://api.telegram.org").requestFactory(factory).build();
    }

    /**
     * Creates the alert row(s), pushes them to the dashboard over STOMP and sends Telegram.
     * A per-contract cooldown stops a busy block stream from producing one alert per block.
     */
    public void dispatch(Contract contract, RiskAssessment assessment) {
        Instant now = Instant.now();
        Instant last = lastAlertAt.get(contract.getId());
        if (last != null && Duration.between(last, now).getSeconds() < cooldownSeconds) {
            return;
        }
        lastAlertAt.put(contract.getId(), now);

        String message = buildMessage(contract, assessment);
        Severity severity = Severity.valueOf(assessment.getBand().name());

        if (config.telegramEnabled()) {
            Alert alert = save(contract, severity, message, AlertChannel.TELEGRAM);
            sendTelegram(contract, assessment, message);
            push(alert);
        }
        if (config.emailEnabled()) {
            // SMTP sending is a later phase (needs spring-boot-starter-mail); the alert is still
            // recorded and shown in the dashboard so the flow is visible.
            Alert alert = save(contract, severity, message, AlertChannel.EMAIL);
            String recipient = config.emailRecipient();
            log.info("Email alert recorded for {} -> {} (SMTP delivery not wired yet)",
                    contract.getName(), recipient == null || recipient.isBlank() ? "(no recipient set)" : recipient);
            push(alert);
        }
        if (!config.telegramEnabled() && !config.emailEnabled()) {
            // Every channel is off: still record it so it appears on the Alerts page.
            push(save(contract, severity, message, AlertChannel.TELEGRAM));
        }
    }

    private Alert save(Contract contract, Severity severity, String message, AlertChannel channel) {
        Alert alert = new Alert();
        alert.setContract(contract);
        alert.setSeverity(severity);
        alert.setMessage(message);
        alert.setChannel(channel);
        return alertRepo.save(alert);
    }

    private void push(Alert alert) {
        try {
            ws.convertAndSend("/topic/alerts", presenter.toCard(alert));
        } catch (Exception e) {
            log.warn("WebSocket alert push failed: {}", e.getMessage());
        }
    }

    private String buildMessage(Contract contract, RiskAssessment a) {
        String drivers = a.getFactors().stream()
                .sorted(Comparator.comparingDouble((ShapFactor f) -> Math.abs(f.getContribution())).reversed())
                .limit(3)
                .map(f -> f.getFeatureName() + String.format(" (%+.2f)", f.getContribution()))
                .collect(Collectors.joining(", "));
        return "Risk score " + a.getScore() + "/100 (" + a.getBand() + ") on " + contract.getName()
                + (drivers.isBlank() ? "" : ". Top drivers: " + drivers);
    }

    private void sendTelegram(Contract contract, RiskAssessment a, String message) {
        // The bot token is always server-side (env var) - it's a secret and the UI never
        // sets it. The destination chat can be overridden from the Alerts page; if nobody
        // has set one there, fall back to the env var.
        String destination = config.telegramChatId();
        if (destination == null || destination.isBlank()) {
            destination = chatId;
        }

        if (botToken == null || botToken.isBlank() || botToken.startsWith("your_")
                || destination == null || destination.isBlank() || destination.startsWith("your_")) {
            log.debug("Telegram not configured; skipping send");
            return;
        }
        try {
            String text = "PRISM ALERT [" + a.getBand() + "]\n" + contract.getName()
                    + (contract.getAddress() == null ? "" : "\n" + contract.getAddress())
                    + "\n" + message;
            telegramClient.post()
                    .uri("/bot{token}/sendMessage", botToken)
                    .body(Map.of("chat_id", destination, "text", text))
                    .retrieve()
                    .toBodilessEntity();
        } catch (org.springframework.web.client.RestClientResponseException e) {
            // Telegram's JSON body says why (e.g. "chat not found"); it never contains the token.
            log.warn("Telegram send failed: HTTP {} {}", e.getStatusCode().value(), e.getResponseBodyAsString());
        } catch (Exception e) {
            // Never log the URL: it contains the bot token.
            log.warn("Telegram send failed: {}", e.getClass().getSimpleName());
        }
    }
}