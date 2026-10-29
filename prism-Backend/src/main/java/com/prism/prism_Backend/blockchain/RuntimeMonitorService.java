package com.prism.prism_Backend.blockchain;

import com.prism.prism_Backend.domain.entity.Contract;
import com.prism.prism_Backend.dto.FeatureVector;
import com.prism.prism_Backend.dto.RuntimeEventDto;
import com.prism.prism_Backend.dto.TelemetryPoint;
import com.prism.prism_Backend.repository.ContractRepository;
import com.prism.prism_Backend.service.FeatureExtractionService;
import com.prism.prism_Backend.service.FeatureExtractionService.RuntimeSignals;
import com.prism.prism_Backend.service.RiskFusionService;
import com.prism.prism_Backend.service.RuntimeEventBuffer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.web3j.protocol.Web3j;
import org.web3j.protocol.core.DefaultBlockParameter;
import org.web3j.protocol.core.methods.request.Transaction;
import org.web3j.protocol.core.methods.response.EthBlock;
import java.math.BigDecimal;
import java.math.BigInteger;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.List;
import java.util.HashSet;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Polls new blocks and turns activity on registered contracts into the behavioural features.
 *
 * BUG FIXES vs the stub: it subscribed in @PostConstruct (the whole app failed to start if the
 * RPC node was not up yet, and nothing was done with the blocks). It now polls on a schedule,
 * survives RPC outages and reports its state to /api/system/status.
 *
 * Implemented signals: tx-frequency z-score, gas anomaly index, large fund movement (USD),
 * liquidity delta %, unique callers, seconds since last anomaly, flashLoanDetected (receipt
 * logs: a flash-loan event in a transaction in which the monitored contract also emitted a log)
 * and oracleDeviationPct (spot price of a configured V2-style pool vs the rolling mean of
 * earlier samples). governanceTokenConcentrationDelta stays neutral (not implemented yet).
 *
 * Activity is attributed by receipt logs, not only tx.to, so attacks that reach a contract
 * through an attacker contract are counted too. Detection maths lives in RuntimeSignalDetectors.
 */
@Service
public class RuntimeMonitorService {

    private static final Logger log = LoggerFactory.getLogger(RuntimeMonitorService.class);
    private static final DateTimeFormatter TS = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss 'UTC'").withZone(ZoneOffset.UTC);
    private static final BigDecimal WEI = new BigDecimal("1e18");
    private static final int WINDOW = 30;

    public record ChainStatus(boolean up, BigInteger head, String error) {}

    private final Web3j web3j;
    private final ContractRepository contractRepo;
    private final FeatureExtractionService features;
    private final RiskFusionService riskFusion;
    private final RuntimeEventBuffer buffer;
    private final SimpMessagingTemplate ws;
    private final double ethUsd;
    private final double largeMovementUsd;
    private final double oracleThresholdPct;
    private final Set<String> flashTopics;
    private final Set<String> flashLenders;
    private final Map<String, String> oraclePools; // monitored contract address -> V2-style pool address
    private final Map<String, Deque<Double>> oracleHistory = new ConcurrentHashMap<>();

    private static final int MAX_RECEIPTS_PER_BLOCK = 300;
    private static final int ORACLE_MIN_SAMPLES = 3;

    /** One transaction of a block with its receipt data. */
    private record TxView(String hash, String from, String to, long gasUsed, List<RuntimeSignalDetectors.LogEntry> logs) {}
    private volatile BigInteger lastBlock;
    private volatile ChainStatus status = new ChainStatus(false, null, "not polled yet");
    private final Map<String, Deque<Double>> txHistory = new ConcurrentHashMap<>();
    private final Map<String, Deque<Double>> gasHistory = new ConcurrentHashMap<>();
    private final Map<String, BigInteger> lastBalance = new ConcurrentHashMap<>();
    private final Map<String, Instant> lastAnomaly = new ConcurrentHashMap<>();

    public RuntimeMonitorService(Web3j web3j, ContractRepository contractRepo,
                                 FeatureExtractionService features, RiskFusionService riskFusion,
                                 RuntimeEventBuffer buffer, SimpMessagingTemplate ws,
                                 @Value("${prism.chain.eth-usd-price:3000}") double ethUsd,
                                 @Value("${prism.chain.large-fund-movement-usd:100000}") double largeMovementUsd,
                                 @Value("${prism.chain.oracle-deviation-threshold-pct:5}") double oracleThresholdPct,
                                 @Value("${prism.chain.flash-loan-topics:}") String extraFlashTopics,
                                 @Value("${prism.chain.flash-loan-lenders:}") String flashLenders,
                                 @Value("${prism.chain.oracle-pools:}") String oraclePools) {
        this.web3j = web3j;
        this.contractRepo = contractRepo;
        this.features = features;
        this.riskFusion = riskFusion;
        this.buffer = buffer;
        this.ws = ws;
        this.ethUsd = ethUsd;
        this.largeMovementUsd = largeMovementUsd;
        this.oracleThresholdPct = oracleThresholdPct;
        this.flashTopics = RuntimeSignalDetectors.flashLoanTopics(extraFlashTopics);
        this.flashLenders = RuntimeSignalDetectors.parseAddressSet(flashLenders);
        this.oraclePools = new ConcurrentHashMap<>(RuntimeSignalDetectors.parsePairs(oraclePools));
    }

    /** Watch a V2-style pool for a monitored contract without a restart (used by the ML data collector too). */
    public void setOraclePool(String contractAddress, String poolAddress) {
        String key = contractAddress.toLowerCase(Locale.ROOT);
        oraclePools.put(key, poolAddress.toLowerCase(Locale.ROOT));
        oracleHistory.remove(key); // fresh baseline for the new pool
    }

    public void removeOraclePool(String contractAddress) {
        String key = contractAddress.toLowerCase(Locale.ROOT);
        oraclePools.remove(key);
        oracleHistory.remove(key);
    }

    public ChainStatus status() {
        return status;
    }

    @Scheduled(fixedDelayString = "${prism.chain.poll-ms:2000}", initialDelay = 5000)
    public void poll() {
        try {
            BigInteger head = web3j.ethBlockNumber().send().getBlockNumber();
            boolean wasDown = !status.up();
            status = new ChainStatus(true, head, null);
            if (wasDown) log.info("RPC connected, head block {}", head);

            if (lastBlock == null) {
                lastBlock = head; // start from "now"; no history replay
                return;
            }
            if (head.compareTo(lastBlock) < 0) {
                // The node was reset (new Hardhat chain): start following the new chain instead of waiting
                // for it to pass the old block number.
                log.warn("Chain head {} is below the last processed block {}; assuming a node reset.", head, lastBlock);
                lastBlock = head;
                return;
            }
            if (head.compareTo(lastBlock) == 0) return;

            // Load the monitored contracts ONCE per poll (it used to be one findAll() per block per
            // poll) and do not download full blocks at all while nothing is registered.
            java.util.List<Contract> monitored = contractRepo.findAll().stream()
                    .filter(c -> c.getAddress() != null && c.getAddress().matches("0x[0-9a-fA-F]{40}"))
                    .toList();
            if (monitored.isEmpty()) {
                lastBlock = head;
                return;
            }
            for (BigInteger b = lastBlock.add(BigInteger.ONE); b.compareTo(head) <= 0; b = b.add(BigInteger.ONE)) {
                processBlock(b, monitored);
                lastBlock = b;
            }
        } catch (Exception e) {
            if (status.up() || status.error() == null) {
                log.warn("RPC unavailable ({}). Will keep retrying.", e.getClass().getSimpleName());
            }
            status = new ChainStatus(false, status.head(), e.getClass().getSimpleName());
        }
    }

    private void processBlock(BigInteger blockNumber, java.util.List<Contract> monitored) throws Exception {
        EthBlock.Block block = web3j.ethGetBlockByNumber(DefaultBlockParameter.valueOf(blockNumber), true)
                .send().getBlock();
        if (block == null) return;
        // Receipts are read once per block and shared by every monitored contract.
        List<TxView> txs = new ArrayList<>();
        for (EthBlock.TransactionResult<?> tr : block.getTransactions()) {
            if (txs.size() >= MAX_RECEIPTS_PER_BLOCK) break;
            if (!(tr.get() instanceof EthBlock.TransactionObject tx)) continue;
            long gas = 0;
            List<RuntimeSignalDetectors.LogEntry> logs = new ArrayList<>();
            var receipt = web3j.ethGetTransactionReceipt(tx.getHash()).send().getTransactionReceipt();
            if (receipt.isPresent()) {
                if (receipt.get().getGasUsed() != null) gas = receipt.get().getGasUsed().longValue();
                for (var l : receipt.get().getLogs()) {
                    logs.add(new RuntimeSignalDetectors.LogEntry(l.getAddress(), l.getTopics()));
                }
            }
            txs.add(new TxView(tx.getHash(), tx.getFrom(), tx.getTo(), gas, logs));
        }
        for (Contract c : monitored) {
            handleContract(c, c.getAddress(), blockNumber, block, txs);
        }
    }

    /** Spot price (reserve0 / reserve1) of the pool configured for this contract, or NaN. */
    private double readPoolSpot(String pool, BigInteger blockNumber) {
        try {
            var call = web3j.ethCall(
                    Transaction.createEthCallTransaction(null, pool, RuntimeSignalDetectors.GET_RESERVES_SELECTOR),
                    DefaultBlockParameter.valueOf(blockNumber)).send();
            if (call.hasError()) return Double.NaN;
            BigInteger[] r = RuntimeSignalDetectors.decodeReserves(call.getValue());
            return r == null ? Double.NaN : RuntimeSignalDetectors.spot(r[0], r[1]);
        } catch (Exception e) {
            log.debug("getReserves failed for {}: {}", pool, e.getMessage());
            return Double.NaN;
        }
    }
    private void handleContract(Contract c, String addr, BigInteger blockNumber, EthBlock.Block block,
                                List<TxView> txs) throws Exception {
        String key = addr.toLowerCase(Locale.ROOT);
        int txCount = 0;
        long gasUsed = 0;
        String firstHash = null;
        Set<String> callers = new HashSet<>();

        boolean flashLoan = false;
        String flashHash = null;
        for (TxView tx : txs) {
            // Attribute by receipt logs as well as tx.to: attacks arrive via attacker contracts.
            if (!RuntimeSignalDetectors.touches(tx.logs(), tx.to(), addr)) continue;
            txCount++;
            callers.add(tx.from());
            gasUsed += tx.gasUsed();
            if (firstHash == null) firstHash = tx.hash();
            if (!flashLoan && RuntimeSignalDetectors.flashLoanInvolving(tx.logs(), addr, flashTopics, flashLenders)) {
                flashLoan = true;
                flashHash = tx.hash();
            }
        }

        // Oracle deviation: only for contracts that have a pool configured (ORACLE_POOLS).
        double oracleDev = 0.0;
        String pool = oraclePools.get(key);
        if (pool != null) {
            double spot = readPoolSpot(pool, blockNumber);
            Deque<Double> oh = oracleHistory.computeIfAbsent(key, k -> new ArrayDeque<>());
            oracleDev = RuntimeSignalDetectors.deviationPct(spot, oh, ORACLE_MIN_SAMPLES);
            // Manipulated samples are kept out of the baseline so one attack does not become "normal".
            if (!Double.isNaN(spot) && oracleDev <= oracleThresholdPct) {
                oh.addLast(spot);
                if (oh.size() > WINDOW) oh.pollFirst();
            }
        }
        boolean oracleAnomaly = oracleDev > oracleThresholdPct;
        BigInteger balance = web3j.ethGetBalance(addr, DefaultBlockParameter.valueOf(blockNumber)).send().getBalance();
        BigInteger prev = lastBalance.put(key, balance);
        double deltaEth = prev == null ? 0 : new BigDecimal(balance.subtract(prev)).divide(WEI).doubleValue();
        double prevEth = prev == null ? 0 : new BigDecimal(prev).divide(WEI).doubleValue();
        double liquidityDeltaPct = prevEth > 0 ? deltaEth / prevEth * 100 : 0;
        double movementUsd = Math.abs(deltaEth) * ethUsd;

        // Rolling baselines (before adding this block).
        Deque<Double> txH = txHistory.computeIfAbsent(key, k -> new ArrayDeque<>());
        Deque<Double> gasH = gasHistory.computeIfAbsent(key, k -> new ArrayDeque<>());
        double z = 0, gasIdx = 1.0;
        if (txH.size() >= 5) {
            double mean = txH.stream().mapToDouble(Double::doubleValue).average().orElse(0);
            double var = txH.stream().mapToDouble(v -> (v - mean) * (v - mean)).average().orElse(0);
            z = (txCount - mean) / Math.max(Math.sqrt(var), 1.0);
        }
        if (gasH.size() >= 3 && gasUsed > 0) {
            double meanGas = gasH.stream().mapToDouble(Double::doubleValue).average().orElse(0);
            if (meanGas > 0) gasIdx = gasUsed / meanGas;
        }
        txH.addLast((double) txCount);
        if (txH.size() > WINDOW) txH.pollFirst();
        if (gasUsed > 0) {
            gasH.addLast((double) gasUsed);
            if (gasH.size() > WINDOW) gasH.pollFirst();
        }

        buffer.recordTx(addr, txCount);
        buffer.addPoint(c.getName(), new TelemetryPoint(
                Instant.ofEpochSecond(block.getTimestamp().longValue()).atZone(ZoneOffset.UTC)
                        .format(DateTimeFormatter.ofPattern("HH:mm:ss")),
                txCount, gasUsed / 1000.0, oracleDev, movementUsd / 1000.0));

        // Nothing touched this contract. Contracts with an oracle pool are still scored (silently, below)
        // so calm oracle blocks leave a baseline row; everything else is skipped as before.
        boolean quietBlock = txCount == 0 && movementUsd == 0 && !flashLoan && !oracleAnomaly;
        if (quietBlock && pool == null) return;
        boolean anomaly = flashLoan || oracleAnomaly || z > 3 || gasIdx > 2.5 || movementUsd >= largeMovementUsd
                || Math.abs(liquidityDeltaPct) > 20;
        Instant now = Instant.now();
        long sinceAnomaly = lastAnomaly.containsKey(key)
                ? Math.max(0, now.getEpochSecond() - lastAnomaly.get(key).getEpochSecond())
                : FeatureExtractionService.NO_ANOMALY_SECONDS;
        if (anomaly) lastAnomaly.put(key, now);

        RuntimeSignals signals = new RuntimeSignals(flashLoan, movementUsd, oracleDev, gasIdx, z, liquidityDeltaPct,
                callers.size(), sinceAnomaly, 0.0);

        if (quietBlock) { // oracle-monitored contract, calm block: score without an event or push
            try {
                riskFusion.evaluate(c.getId(), features.forContract(c.getId(), c.getSourceCode(), signals));
            } catch (RuntimeException e) {
                log.debug("Quiet-block risk evaluation failed for {}: {}", c.getName(), e.getMessage());
            }
            return;
        }
        String type, severity, description;
        if (flashLoan) {
            type = "FLASH_LOAN"; severity = "Critical";
            description = "Flash loan detected: a flash-loan event and activity on this contract in the same transaction"
                    + (flashHash == null ? "." : " (" + flashHash + ").");
            if (flashHash != null) firstHash = flashHash;
        } else if (oracleAnomaly) {
            type = "ORACLE_DEVIATION"; severity = "High";
            description = String.format(Locale.ROOT, "Oracle pool spot price deviated %.1f%% from its rolling baseline (pool %s).", oracleDev, pool);
        } else if (movementUsd >= largeMovementUsd) {
            type = "LARGE_FUND_MOVEMENT"; severity = "High";
            description = String.format(Locale.ROOT, "Contract balance changed by %.4f ETH (~$%,.0f) in one block.", deltaEth, movementUsd);
        } else if (Math.abs(liquidityDeltaPct) > 20) {
            // FIX: this case counted as an anomaly but fell through to a Low "TRANSACTION" event,
            // so draining a vault below the USD threshold looked like "nominal execution".
            type = "LIQUIDITY_CHANGE"; severity = "High";
            description = String.format(Locale.ROOT, "Contract balance moved %.1f%% (%.4f ETH) in one block.", liquidityDeltaPct, deltaEth);
        } else if (gasIdx > 2.5) {
            type = "GAS_ANOMALY"; severity = "Medium";
            description = String.format(Locale.ROOT, "Gas used %.1fx the rolling average.", gasIdx);
        } else if (z > 3) {
            type = "TX_BURST"; severity = "Medium";
            description = String.format(Locale.ROOT, "%d transactions in one block (z-score %.1f).", txCount, z);
        } else {
            type = "TRANSACTION"; severity = "Low";
            description = txCount + " transaction(s) from " + callers.size() + " caller(s).";
        }

        RuntimeEventDto event = new RuntimeEventDto(
                "evt-" + blockNumber + "-" + key.substring(2, 8),
                TS.format(now), c.getName(), severity, type, blockNumber.longValue(),
                firstHash == null ? "" : firstHash, String.format(Locale.ROOT, "%,d", gasUsed), description, "");
        buffer.addEvent(event);
        try {
            ws.convertAndSend("/topic/runtime", event);
        } catch (Exception e) {
            log.debug("runtime push failed: {}", e.getMessage());
        }

        // Re-score only when something actually happened, not on every empty block.
        try {
            FeatureVector fv = features.forContract(c.getId(), c.getSourceCode(), signals);
            riskFusion.evaluate(c.getId(), fv);
        } catch (RuntimeException e) {
            log.warn("Runtime risk evaluation failed for {}: {}", c.getName(), e.getMessage());
        }
    }
}
