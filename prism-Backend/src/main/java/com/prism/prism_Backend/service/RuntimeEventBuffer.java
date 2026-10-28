package com.prism.prism_Backend.service;

import com.prism.prism_Backend.dto.RuntimeEventDto;
import com.prism.prism_Backend.dto.TelemetryPoint;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Deque;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentLinkedDeque;

/**
 * In-memory ring buffer of recent runtime events and telemetry.
 * The locked schema has no runtime-event table, so this is intentionally not persisted.
 */
@Component
public class RuntimeEventBuffer {

    private static final int MAX_EVENTS = 500;
    private static final int MAX_POINTS = 60;

    private final Deque<RuntimeEventDto> events = new ConcurrentLinkedDeque<>();
    private final Map<String, Deque<TelemetryPoint>> series = new ConcurrentHashMap<>();
    private final Map<String, Deque<long[]>> txLog = new ConcurrentHashMap<>(); // address -> [epochSec, txCount]

    public void addEvent(RuntimeEventDto e) {
        events.addFirst(e);
        while (events.size() > MAX_EVENTS) {
            events.pollLast();
        }
    }

    public List<RuntimeEventDto> events() {
        return new ArrayList<>(events);
    }

    public void addPoint(String contractName, TelemetryPoint p) {
        Deque<TelemetryPoint> d = series.computeIfAbsent(contractName, k -> new ConcurrentLinkedDeque<>());
        d.addLast(p);
        while (d.size() > MAX_POINTS) {
            d.pollFirst();
        }
    }

    public List<TelemetryPoint> series(String contractName) {
        Deque<TelemetryPoint> d = series.get(contractName);
        return d == null ? List.of() : new ArrayList<>(d);
    }

    public void recordTx(String address, int count) {
        if (address == null || count <= 0) return;
        Deque<long[]> d = txLog.computeIfAbsent(address.toLowerCase(Locale.ROOT), k -> new ConcurrentLinkedDeque<>());
        d.addLast(new long[]{Instant.now().getEpochSecond(), count});
        long cutoff = Instant.now().getEpochSecond() - 86_400;
        while (!d.isEmpty() && d.peekFirst()[0] < cutoff) {
            d.pollFirst();
        }
    }

    public long txCount24h(String address) {
        if (address == null) return 0;
        Deque<long[]> d = txLog.get(address.toLowerCase(Locale.ROOT));
        if (d == null) return 0;
        long cutoff = Instant.now().getEpochSecond() - 86_400;
        long total = 0;
        for (long[] entry : d) {
            if (entry[0] >= cutoff) total += entry[1];
        }
        return total;
    }
}
