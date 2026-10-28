package com.prism.prism_Backend.blockchain;

import java.math.BigDecimal;
import java.math.BigInteger;
import java.math.MathContext;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

/**
 * Pure detection logic for the runtime signals (no web3j / Spring types), so it can be unit
 * tested with plain values. RuntimeMonitorService feeds it data read from the chain.
 */
public final class RuntimeSignalDetectors {

    private RuntimeSignalDetectors() {}

    /** A receipt log reduced to what the detectors need. */
    public record LogEntry(String address, List<String> topics) {}

    // topic0 = keccak256 of the event signature. Verify the two real-lender ones against the
    // lender's ABI when you move to a mainnet fork.
    /** MockFlashLender: FlashLoan(address,uint256,uint256) - used by the local replays. */
    public static final String TOPIC_MOCK =
            "0x31aaad38f00845a242d16ae90d7bd72fc68f0e22581470f9dc0de241210c2886";
    /** Balancer V2 Vault: FlashLoan(address,address,uint256,uint256). */
    public static final String TOPIC_BALANCER_V2 =
            "0x0d7d75e01ab95780d3cd1c8ec0dd6c2ce19e3a20427eec8bf53283b6fb8e95f0";
    /** Aave V3 Pool: FlashLoan(address,address,address,uint256,uint8,uint256,uint16). */
    public static final String TOPIC_AAVE_V3 =
            "0xefefaba5e921573100900a3ad9cf29f222d995fb3b6045797eaea7521bd8d6f0";

    /** Uniswap-V2-style getReserves() selector. */
    public static final String GET_RESERVES_SELECTOR = "0x0902f1ac";

    public static Set<String> flashLoanTopics(String extraCsv) {
        Set<String> t = new HashSet<>(List.of(TOPIC_MOCK, TOPIC_BALANCER_V2, TOPIC_AAVE_V3));
        for (String s : splitCsv(extraCsv)) {
            t.add(s.toLowerCase(Locale.ROOT));
        }
        return t;
    }

    /**
     * Flash-loan footprint for one monitored contract in one transaction: the transaction emitted
     * a flash-loan event AND the monitored contract itself emitted a log. Checking the receipt
     * (not tx.to) is what catches attacks that reach the contract through an attacker contract,
     * and a flash loan that leaves the end-of-block balance unchanged.
     *
     * @param lenders optional allow-list of lender addresses; empty = any emitter of a known topic
     */
    public static boolean flashLoanInvolving(List<LogEntry> logs, String monitored,
                                             Set<String> topics, Set<String> lenders) {
        if (logs == null || monitored == null) return false;
        String m = monitored.toLowerCase(Locale.ROOT);
        boolean touched = false;
        boolean flash = false;
        for (LogEntry l : logs) {
            if (l.address() == null) continue;
            String addr = l.address().toLowerCase(Locale.ROOT);
            if (addr.equals(m)) touched = true;
            if (l.topics() != null && !l.topics().isEmpty()
                    && topics.contains(l.topics().get(0).toLowerCase(Locale.ROOT))
                    && (lenders.isEmpty() || lenders.contains(addr))) {
                flash = true;
            }
        }
        return flash && touched;
    }

    /** True if the monitored contract emitted a log or is the call target of the transaction. */
    public static boolean touches(List<LogEntry> logs, String to, String monitored) {
        String m = monitored.toLowerCase(Locale.ROOT);
        if (to != null && to.toLowerCase(Locale.ROOT).equals(m)) return true;
        if (logs == null) return false;
        for (LogEntry l : logs) {
            if (l.address() != null && l.address().toLowerCase(Locale.ROOT).equals(m)) return true;
        }
        return false;
    }

    /** Decodes the first two 32-byte words of a getReserves() result: {reserve0, reserve1}. */
    public static BigInteger[] decodeReserves(String hex) {
        if (hex == null) return null;
        String h = hex.startsWith("0x") ? hex.substring(2) : hex;
        if (h.length() < 128) return null;
        try {
            return new BigInteger[]{new BigInteger(h.substring(0, 64), 16),
                    new BigInteger(h.substring(64, 128), 16)};
        } catch (NumberFormatException e) {
            return null;
        }
    }

    /** Spot price as reserve0 / reserve1 (NaN when a reserve is zero). */
    public static double spot(BigInteger r0, BigInteger r1) {
        if (r0 == null || r1 == null || r0.signum() <= 0 || r1.signum() <= 0) return Double.NaN;
        return new BigDecimal(r0).divide(new BigDecimal(r1), MathContext.DECIMAL64).doubleValue();
    }

    /**
     * |spot - mean(history)| / mean(history) * 100. Needs minSamples prior observations,
     * otherwise 0 (a fresh monitor has no baseline and must not invent a deviation).
     */
    public static double deviationPct(double spot, Collection<Double> history, int minSamples) {
        if (Double.isNaN(spot) || history == null || history.size() < minSamples) return 0.0;
        double sum = 0;
        int n = 0;
        for (double h : history) {
            if (!Double.isNaN(h)) {
                sum += h;
                n++;
            }
        }
        if (n < minSamples) return 0.0;
        double mean = sum / n;
        if (mean <= 0) return 0.0;
        return Math.abs(spot - mean) / mean * 100.0;
    }

    /** "0xA=0xB,0xC=0xD" -> {a=b, c=d}, keys and values lower-cased. Malformed pairs are skipped. */
    public static Map<String, String> parsePairs(String csv) {
        Map<String, String> out = new HashMap<>();
        for (String pair : splitCsv(csv)) {
            String[] kv = pair.split("=", 2);
            if (kv.length == 2 && !kv[0].isBlank() && !kv[1].isBlank()) {
                out.put(kv[0].trim().toLowerCase(Locale.ROOT), kv[1].trim().toLowerCase(Locale.ROOT));
            }
        }
        return out;
    }

    public static Set<String> parseAddressSet(String csv) {
        Set<String> out = new HashSet<>();
        for (String s : splitCsv(csv)) out.add(s.toLowerCase(Locale.ROOT));
        return out;
    }

    private static List<String> splitCsv(String csv) {
        List<String> out = new ArrayList<>();
        if (csv == null) return out;
        for (String s : csv.split(",")) {
            if (!s.isBlank()) out.add(s.trim());
        }
        return out;
    }
}
