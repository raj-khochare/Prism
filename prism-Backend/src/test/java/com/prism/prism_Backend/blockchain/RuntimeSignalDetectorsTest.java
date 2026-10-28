package com.prism.prism_Backend.blockchain;

import com.prism.prism_Backend.blockchain.RuntimeSignalDetectors.LogEntry;
import org.junit.jupiter.api.Test;

import java.math.BigInteger;
import java.util.List;
import java.util.Map;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;

class RuntimeSignalDetectorsTest {

    private static final String VAULT = "0xabc0000000000000000000000000000000000001";
    private static final String LENDER = "0xdef0000000000000000000000000000000000002";
    private static final Set<String> TOPICS = RuntimeSignalDetectors.flashLoanTopics("");

    private static final List<LogEntry> ATTACK_TX = List.of(
            new LogEntry(VAULT, List.of("0xdeadbeef")),
            new LogEntry(LENDER, List.of(RuntimeSignalDetectors.TOPIC_MOCK)));

    @Test
    void flashLoanNeedsBothTheLoanEventAndActivityOnTheMonitoredContract() {
        assertTrue(RuntimeSignalDetectors.flashLoanInvolving(ATTACK_TX, VAULT, TOPICS, Set.of()));
        assertFalse(RuntimeSignalDetectors.flashLoanInvolving(List.of(ATTACK_TX.get(1)), VAULT, TOPICS, Set.of()));
        assertFalse(RuntimeSignalDetectors.flashLoanInvolving(List.of(ATTACK_TX.get(0)), VAULT, TOPICS, Set.of()));
    }

    @Test
    void lenderAllowListIsHonoured() {
        assertFalse(RuntimeSignalDetectors.flashLoanInvolving(ATTACK_TX, VAULT, TOPICS,
                Set.of("0x1111111111111111111111111111111111111111")));
        assertTrue(RuntimeSignalDetectors.flashLoanInvolving(ATTACK_TX, VAULT, TOPICS, Set.of(LENDER)));
    }

    @Test
    void activityIsAttributedByLogsNotOnlyByCallTarget() {
        assertTrue(RuntimeSignalDetectors.touches(ATTACK_TX, "0xattackercontract", VAULT));
        assertTrue(RuntimeSignalDetectors.touches(List.of(), VAULT, VAULT));
        assertFalse(RuntimeSignalDetectors.touches(List.of(), "0xsomeoneelse", VAULT));
    }

    @Test
    void decodesARealGetReservesResult() {
        // captured from a local node: reserve0 = 143 ETH, reserve1 = 69.93... tokens
        String raw = "0x000000000000000000000000000000000000000000000007c0860e5a80dc0000000000000000000000000000000000000000000000000003ca798418940b3059000000000000000000000000000000000000000000000000000000006ad38267";
        BigInteger[] r = RuntimeSignalDetectors.decodeReserves(raw);
        assertNotNull(r);
        assertEquals(new BigInteger("143000000000000000000"), r[0]);
        assertEquals(2.0449, RuntimeSignalDetectors.spot(r[0], r[1]), 0.0001);
        assertNull(RuntimeSignalDetectors.decodeReserves("0x12"));
    }

    @Test
    void oracleDeviationSeparatesNormalDriftFromManipulation() {
        List<Double> history = List.of(1.01, 1.02, 1.03, 1.04, 1.05, 1.06);
        assertTrue(RuntimeSignalDetectors.deviationPct(1.07, history, 3) < 5);
        assertTrue(RuntimeSignalDetectors.deviationPct(2.0449, history, 3) > 90);
        assertEquals(0.0, RuntimeSignalDetectors.deviationPct(5.0, List.of(1.0), 3)); // no baseline yet
        assertEquals(0.0, RuntimeSignalDetectors.deviationPct(Double.NaN, history, 3));
    }

    @Test
    void parsesConfigPairsAndSkipsMalformedOnes() {
        assertEquals(Map.of("0xa", "0xb", "0xc", "0xd"), RuntimeSignalDetectors.parsePairs("0xA=0xB, 0xC=0xD,bad"));
        assertTrue(RuntimeSignalDetectors.flashLoanTopics("0xABCD").contains("0xabcd"));
    }
}
