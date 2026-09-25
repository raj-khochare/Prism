/**
 * PRISM Synthetic Demonstration Dataset (DEMO DATA)
 * Structured with strict domain semantics for Protocol Risk Intelligence and Security Monitoring.
 * Note: No fake social proof, no fake metrics, no purple styling, no AI marketing buzzwords.
 */

export const DEMO_SECURITY_STATUS = {
  isDemoData: true,
  statusLevel: 'ELEVATED RISK',
  unifiedScore: 72,
  maxScore: 100,
  highFindingsCount: 3,
  runtimeAnomaliesCount: 2,
  activeAlertsCount: 1,
  evaluatedAt: '2026-09-17 12:32:00 UTC',
  targetProtocol: 'PRISM Monitored Protocol Core'
};

export const DEMO_RISK_DRIVERS = [
  {
    id: 'rd-1',
    severity: 'High',
    title: 'Reentrancy vulnerability in withdrawCollateral()',
    explanation: 'State variable mutation userCollateral[msg.sender] executes after external call transfer.',
    source: 'Static Detector PRISM-DET-01',
    targetContract: 'LendingPoolCore',
    linkTarget: '/findings?id=f-101'
  },
  {
    id: 'rd-2',
    severity: 'High',
    title: 'Oracle price deviation exceeds reference threshold',
    explanation: 'Observed oracle price diverged by 2.14% relative to 30-minute rolling TWAP reference signal.',
    source: 'Runtime Monitor (Oracle Feed)',
    targetContract: 'ChainlinkPriceConsumer',
    linkTarget: '/runtime?contract=ChainlinkPriceConsumer'
  },
  {
    id: 'rd-3',
    severity: 'Medium',
    title: 'Abnormal liquidity outflow detected',
    explanation: 'Large capital movement of 3,200,000 USDC occurred within a single block execution frame.',
    source: 'Runtime Monitor (Balance Flow)',
    targetContract: 'BridgeVaultV2',
    linkTarget: '/runtime?contract=BridgeVaultV2'
  },
  {
    id: 'rd-4',
    severity: 'Medium',
    title: 'Access-control authorization depends on tx.origin',
    explanation: 'Bridge administrative release logic relies on tx.origin, exposing signature phishing attack paths.',
    source: 'Static Detector PRISM-DET-04',
    targetContract: 'BridgeVaultV2',
    linkTarget: '/findings?id=f-104'
  }
];

export const DEMO_RECENT_EVENTS = [
  {
    id: 'evt-recent-1',
    timestamp: '14:32:08 UTC',
    severity: 'High',
    title: 'Oracle deviation detected',
    contract: 'ChainlinkPriceConsumer',
    block: 18492815,
    txHash: '0x7b1c3e0a29486715fba3990812674011ccde882903ab1177651c0989f812bb33',
    description: 'Price feed divergence breached 2.0% warning threshold (actual 2.14%).'
  },
  {
    id: 'evt-recent-2',
    timestamp: '14:29:41 UTC',
    severity: 'Medium',
    title: 'Unusual liquidity movement',
    contract: 'BridgeVaultV2',
    block: 18492809,
    txHash: '0x19a0082f483c6168e3d8cbbec457e51c6e1d911b30df4552b712ab994025a176',
    description: 'Rapid single-block outflow of 3,200,000 USDC to external receiver address.'
  },
  {
    id: 'evt-recent-3',
    timestamp: '14:21:17 UTC',
    severity: 'High',
    title: 'Large transaction pattern detected',
    contract: 'FlashBorrowerProxy',
    block: 18492798,
    txHash: '0x992810abcdf12546879802a4b568390c9b0e271a364890c279401738209bb456',
    description: 'Multi-pool flash-borrowing pattern executed across Uniswap v3 and Curve.'
  }
];

export const DEMO_PRIORITY_INVESTIGATION = {
  id: 'inv-oracle-manipulation',
  title: 'Oracle manipulation signal',
  summary: 'PRISM detected a significant deviation between observed oracle behavior and the reference signal during high transaction velocity.',
  affectedContract: 'PriceOracle (ChainlinkPriceConsumer)',
  affectedContractAddress: '0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419',
  relatedBlocks: '#18,492,780 — #18,492,815',
  relatedTransactions: [
    '0x7b1c3e0a29486715fba3990812674011ccde882903ab1177651c0989f812bb33',
    '0x4c2a5e88b919a623bf28e100f72728994518210344d216f4459d8031d274c301'
  ],
  investigationSteps: [
    'Inspect round updatedAt timestamp in ChainlinkPriceConsumer.sol (Line 31–36).',
    'Evaluate whether flash loan funds in block #18,492,798 influenced spot pool balance.',
    'Verify if collateral liquidations were triggered during the 2.14% pricing divergence.'
  ],
  actionRoute: '/runtime?contract=ChainlinkPriceConsumer'
};

export const DEMO_SYSTEM_STATUS = [
  { component: 'RPC Provider', status: 'Connected', latency: '14ms', target: 'Ethereum Mainnet (Alchemy)' },
  { component: 'WebSocket Feed', status: 'Connected', latency: '22ms', target: 'Head Block Stream (Active)' },
  { component: 'Block Sync', status: 'Synchronized', latency: '0 blocks behind', target: 'Head #18,492,815' },
  { component: 'Analysis Engine', status: 'Available', latency: '< 40ms', target: 'AST & Pattern Matcher v2.4' }
];

export const DEMO_CONTRACTS = [
  {
    id: 'c-1',
    name: 'LendingPoolCore',
    address: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
    chain: 'Ethereum Mainnet',
    riskScore: 88,
    severity: 'Critical',
    status: 'Investigating',
    lastScan: '2026-09-17 11:20:00',
    tx24h: 14280,
    latestDetection: 'Potential reentrancy sequence in withdraw()',
    verifiedSource: true
  },
  {
    id: 'c-2',
    name: 'BridgeVaultV2',
    address: '0x88e6A0c2dDD26FEEb64F039a2c41296FcB3f5640',
    chain: 'Arbitrum One',
    riskScore: 74,
    severity: 'High',
    status: 'Warning',
    lastScan: '2026-09-17 12:10:00',
    tx24h: 6840,
    latestDetection: 'Rapid multi-hop liquidity withdrawal (3.2M USDC)',
    verifiedSource: true
  },
  {
    id: 'c-3',
    name: 'FlashBorrowerProxy',
    address: '0x3d9819210A31b4961b30EF54bE2aeD79B9c9Cd3B',
    chain: 'Ethereum Mainnet',
    riskScore: 62,
    severity: 'High',
    status: 'Warning',
    lastScan: '2026-09-17 08:30:00',
    tx24h: 1120,
    latestDetection: 'Unchecked low-level call in flashLoanCallback()',
    verifiedSource: false
  },
  {
    id: 'c-4',
    name: 'ChainlinkPriceConsumer',
    address: '0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419',
    chain: 'Optimism',
    riskScore: 45,
    severity: 'Medium',
    status: 'Active',
    lastScan: '2026-09-16 23:05:00',
    tx24h: 94300,
    latestDetection: 'Oracle deviation exceeds 2.1% against TWAP',
    verifiedSource: true
  },
  {
    id: 'c-5',
    name: 'CurveRouterSwap',
    address: '0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7',
    chain: 'Ethereum Mainnet',
    riskScore: 32,
    severity: 'Low',
    status: 'Active',
    lastScan: '2026-09-17 09:45:00',
    tx24h: 52190,
    latestDetection: 'Normal execution within baseline parameters',
    verifiedSource: true
  },
  {
    id: 'c-6',
    name: 'TimelockGovernance',
    address: '0x1a9C8182C09F50C8318d769245beA52c32BE35BC',
    chain: 'Ethereum Mainnet',
    riskScore: 15,
    severity: 'Low',
    status: 'Active',
    lastScan: '2026-09-15 18:00:00',
    tx24h: 42,
    latestDetection: 'Administrative queue schedule executed',
    verifiedSource: true
  }
];

export const DEMO_STATIC_FINDINGS = [
  {
    id: 'f-101',
    detector: 'PRISM-DET-01',
    category: 'Reentrancy',
    title: 'State Variable Update After External Call',
    severity: 'Critical',
    contract: 'LendingPoolCore',
    file: 'LendingPoolCore.sol',
    lineStart: 48,
    lineEnd: 54,
    status: 'Open',
    description: 'The withdraw collateral function transfers ETH to msg.sender before reducing userCollateral[msg.sender] balance state.',
    whyItMatters: 'An attacker-controlled receiving contract can re-enter withdraw() repeatedly before state is written, causing insolvency.',
    remediation: 'Decrement userCollateral[msg.sender] before invoking msg.sender.call{value: amount}(""), or apply OpenZeppelin ReentrancyGuard.',
    relatedFindings: ['f-105'],
    relatedRuntimeSignals: ['Recursive Call Depth Exceeded in Block #18492815'],
    codeSnippet: `function withdrawCollateral(uint256 amount) external {
    require(userCollateral[msg.sender] >= amount, "Insufficient collateral");
    (bool success, ) = msg.sender.call{value: amount}("");
    require(success, "ETH transfer failed");
    userCollateral[msg.sender] -= amount; // VULNERABLE: state updated after call
}`
  },
  {
    id: 'f-102',
    detector: 'PRISM-DET-02',
    category: 'Unchecked Calls',
    title: 'Unchecked Low-Level External Call Return Value',
    severity: 'High',
    contract: 'FlashBorrowerProxy',
    file: 'FlashBorrowerProxy.sol',
    lineStart: 82,
    lineEnd: 84,
    status: 'Open',
    description: 'Execution result of external receiver callback is not verified against return value boolean.',
    whyItMatters: 'If receiver reverts without throwing revert data, the flash loan proceeds as if successful, causing irrecoverable accounting divergence.',
    remediation: '(bool success, ) = receiver.call(payload); require(success, "Callback failed");',
    relatedFindings: [],
    relatedRuntimeSignals: ['Flash-loan-sized capital inflow prior to execution'],
    codeSnippet: `function executeArbitrage(address receiver, bytes calldata payload) external onlyOwner {
    receiver.call(payload); // VULNERABLE: return value ignored
    emit ArbitrageExecuted(receiver);
}`
  },
  {
    id: 'f-103',
    detector: 'PRISM-DET-03',
    category: 'Oracle Dependency',
    title: 'Missing Stale Price Validation in Chainlink Oracle Feed',
    severity: 'High',
    contract: 'ChainlinkPriceConsumer',
    file: 'ChainlinkPriceConsumer.sol',
    lineStart: 31,
    lineEnd: 36,
    status: 'Open',
    description: 'latestRoundData() consumed without verifying updatedAt timestamp against heartbeat window.',
    whyItMatters: 'If oracle updates fail or the L2 sequencer experiences downtime, stale asset prices are utilized to calculate collateralization ratios.',
    remediation: 'require(updatedAt > 0 && block.timestamp - updatedAt <= HEARTBEAT, "Stale price");',
    relatedFindings: [],
    relatedRuntimeSignals: ['Oracle deviation > 2.1% against 30m TWAP'],
    codeSnippet: `function getAssetPrice() public view returns (uint256) {
    (, int256 price, , uint256 updatedAt, ) = priceFeed.latestRoundData();
    require(price > 0, "Invalid price");
    // VULNERABLE: missing check: require(block.timestamp - updatedAt < 3600);
    return uint256(price);
}`
  },
  {
    id: 'f-104',
    detector: 'PRISM-DET-04',
    category: 'Access Control',
    title: 'Authentication Check Uses tx.origin',
    severity: 'Medium',
    contract: 'BridgeVaultV2',
    file: 'BridgeVaultV2.sol',
    lineStart: 112,
    lineEnd: 115,
    status: 'Under Review',
    description: 'Vault release authentication asserts tx.origin == bridgeRelayer.',
    whyItMatters: 'Enables phishing vulnerabilities if the bridgeRelayer signs a transaction interacting with an intermediary exploit contract.',
    remediation: 'Change authentication requirement to msg.sender == bridgeRelayer.',
    relatedFindings: [],
    relatedRuntimeSignals: ['Unexpected balance outflow in block #18492809'],
    codeSnippet: `modifier onlyRelayer() {
    require(tx.origin == bridgeRelayer, "Unauthorized relayer"); // VULNERABLE
    _;
}`
  },
  {
    id: 'f-105',
    detector: 'PRISM-DET-05',
    category: 'Integer / Precision',
    title: 'Division Before Multiplication Precision Loss',
    severity: 'Medium',
    contract: 'LendingPoolCore',
    file: 'LendingPoolCore.sol',
    lineStart: 140,
    lineEnd: 142,
    status: 'Resolved',
    description: 'Fee percentage calculation divides base by feeBasisPoints prior to multiplying by scalar.',
    whyItMatters: 'Remainder truncation causes fee calculation to evaluate to zero for transactions below threshold values.',
    remediation: 'Reorder expression to (amount * feeBasisPoints) / 10000.',
    relatedFindings: ['f-101'],
    relatedRuntimeSignals: [],
    codeSnippet: `function calculateProtocolFee(uint256 amount) public pure returns (uint256) {
    uint256 fee = (amount / 10000) * 25; // VULNERABLE: division before multiplication
    return fee;
}`
  }
];

export const DEMO_ALERTS = [
  {
    id: 'alt-901',
    severity: 'Critical',
    contract: 'LendingPoolCore',
    address: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
    trigger: 'Recursive Call Depth Exceeded (Reentrancy Signature)',
    riskScore: 88,
    timestamp: '2026-09-17 13:42:10 UTC',
    channel: 'Telegram Bot #SecOps',
    status: 'Active',
    acknowledged: false,
    txHash: '0x4c2a5e88b919a623bf28e100f72728994518210344d216f4459d8031d274c301'
  },
  {
    id: 'alt-902',
    severity: 'High',
    contract: 'BridgeVaultV2',
    address: '0x88e6A0c2dDD26FEEb64F039a2c41296FcB3f5640',
    trigger: 'Flash-loan-sized capital outflow ($3.2M USDC)',
    riskScore: 74,
    timestamp: '2026-09-17 13:30:45 UTC',
    channel: 'Email (sec-alerts@protocol.io)',
    status: 'Acknowledged',
    acknowledged: true,
    txHash: '0x19a0082f483c6168e3d8cbbec457e51c6e1d911b30df4552b712ab994025a176'
  },
  {
    id: 'alt-903',
    severity: 'Medium',
    contract: 'ChainlinkPriceConsumer',
    address: '0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419',
    trigger: 'Oracle deviation > 2.1% against 30m TWAP',
    riskScore: 45,
    timestamp: '2026-09-17 12:15:00 UTC',
    channel: 'Telegram Bot #SecOps',
    status: 'Active',
    acknowledged: false,
    txHash: '0x7b1c3e0a29486715fba3990812674011ccde882903ab1177651c0989f812bb33'
  },
  {
    id: 'alt-904',
    severity: 'Low',
    contract: 'CurveRouterSwap',
    address: '0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7',
    trigger: 'Gas consumption 1.8x baseline average',
    riskScore: 32,
    timestamp: '2026-09-17 09:12:30 UTC',
    channel: 'Email (sec-alerts@protocol.io)',
    status: 'Dismissed',
    acknowledged: true,
    txHash: '0x2289c09931bfa2863b15dc67098e98327150ba8761c56b82098bca120937a445'
  }
];

export const DEMO_RUNTIME_EVENTS = [
  {
    id: 'evt-501',
    timestamp: '2026-09-17 13:42:10 UTC',
    contract: 'LendingPoolCore',
    severity: 'Critical',
    eventType: 'REENTRANCY_INVOCATION',
    block: 18492815,
    txHash: '0x4c2a5e88b919a623bf28e100f72728994518210344d216f4459d8031d274c301',
    gasUsed: '382,410',
    description: 'Execution call tree entered withdrawCollateral() with nested frame depth 3',
    traceSummary: 'CALL LendingPoolCore.withdrawCollateral() -> CALL ExploitReceiver.receive() -> CALL LendingPoolCore.withdrawCollateral()'
  },
  {
    id: 'evt-502',
    timestamp: '2026-09-17 13:30:45 UTC',
    contract: 'BridgeVaultV2',
    severity: 'High',
    eventType: 'UNEXPECTED_BALANCE_DRAIN',
    block: 18492809,
    txHash: '0x19a0082f483c6168e3d8cbbec457e51c6e1d911b30df4552b712ab994025a176',
    gasUsed: '194,520',
    description: 'Net balance decreased by 3,200,000 USDC within single block execution',
    traceSummary: 'TRANSFER 3,200,000 USDC -> 0x88e6...5640'
  },
  {
    id: 'evt-503',
    timestamp: '2026-09-17 13:18:22 UTC',
    contract: 'FlashBorrowerProxy',
    severity: 'Medium',
    eventType: 'RAPID_SWAP_SEQUENCE',
    block: 18492798,
    txHash: '0x992810abcdf12546879802a4b568390c9b0e271a364890c279401738209bb456',
    gasUsed: '512,890',
    description: '4 multi-hop routing transactions executed across Uniswap v3 and Curve pool',
    traceSummary: 'SWAP WETH/USDC -> SWAP USDC/DAI -> CALL FlashBorrower'
  },
  {
    id: 'evt-504',
    timestamp: '2026-09-17 12:55:04 UTC',
    contract: 'ChainlinkPriceConsumer',
    severity: 'Medium',
    eventType: 'ORACLE_PRICE_DEVIATION',
    block: 18492780,
    txHash: '0x7b1c3e0a29486715fba3990812674011ccde882903ab1177651c0989f812bb33',
    gasUsed: '84,100',
    description: 'Spot price deviated by 2.14% relative to 30-minute historical median',
    traceSummary: 'STATIC_CALL AggregatorV3.latestRoundData() -> RETURN price=3210.42 (TWAP=3143.10)'
  },
  {
    id: 'evt-505',
    timestamp: '2026-09-17 12:40:11 UTC',
    contract: 'CurveRouterSwap',
    severity: 'Low',
    eventType: 'GAS_BURST_ANOMALY',
    block: 18492765,
    txHash: '0x5501837a28461750bfca928156e7290ba827103a89076123019ab761230ba711',
    gasUsed: '420,110',
    description: 'Gas consumption elevated during router multi-path iteration',
    traceSummary: 'ROUTER_EXECUTE pool=3pool hops=3 iterations=12'
  },
  {
    id: 'evt-506',
    timestamp: '2026-09-17 12:12:00 UTC',
    contract: 'LendingPoolCore',
    severity: 'Low',
    eventType: 'NORMAL_TELEMETRY',
    block: 18492742,
    txHash: '0x8892716301abdf82761890ca5610293847561928038102948756192837461928',
    gasUsed: '110,240',
    description: 'Standard collateral deposit processed for 2.5 WETH',
    traceSummary: 'CALL deposit(2.5 WETH) msg.sender=0x112...09a'
  }
];

export const DEMO_TELEMETRY_SERIES = [
  { time: '13:10', velocity: 18, gas: 24, deviation: 0.12, flow: 120 },
  { time: '13:15', velocity: 22, gas: 26, deviation: 0.15, flow: 140 },
  { time: '13:20', velocity: 19, gas: 25, deviation: 0.18, flow: 90 },
  { time: '13:25', velocity: 35, gas: 38, deviation: 0.45, flow: 450 },
  { time: '13:30', velocity: 94, gas: 110, deviation: 1.85, flow: 3200 },
  { time: '13:35', velocity: 68, gas: 82, deviation: 1.60, flow: 1800 },
  { time: '13:40', velocity: 140, gas: 145, deviation: 2.14, flow: 4100 },
  { time: '13:45', velocity: 45, gas: 50, deviation: 0.90, flow: 600 }
];

export const DEMO_RISK_DECOMPOSITION = {
  contract: 'LendingPoolCore',
  score: 72,
  status: 'ELEVATED RISK',
  evaluatedAt: '2026-09-17 12:32:00 UTC',
  summaryConclusion: {
    primaryConcern: 'The current risk level is primarily driven by an existing contract vulnerability combined with abnormal oracle behavior observed during runtime.',
    whatToInvestigate: [
      {
        target: 'Oracle-related transactions',
        description: 'Review price updates in block #18,492,780 to verify potential manipulation.',
        link: '/runtime?contract=ChainlinkPriceConsumer'
      },
      {
        target: 'Related contract source',
        description: 'Verify state variable ordering in LendingPoolCore.withdrawCollateral().',
        link: '/findings?id=f-101'
      },
      {
        target: 'Recent liquidity movements',
        description: 'Analyze 3,200,000 USDC single-block outflow in BridgeVaultV2.',
        link: '/runtime?contract=BridgeVaultV2'
      }
    ]
  },
  staticSignals: [
    {
      factor: 'Reentrancy vulnerability in withdrawCollateral()',
      source: 'Static Analysis (PRISM-DET-01)',
      contribution: '+20',
      explanation: 'External transfer msg.sender.call{value: amount}("") takes place prior to decrementing userCollateral balance state.'
    },
    {
      factor: 'Access-control weakness via tx.origin',
      source: 'Static Analysis (PRISM-DET-04)',
      contribution: '+18',
      explanation: 'Modifier utilizes tx.origin for authentication, permitting signature delegation and proxy phishing attacks.'
    },
    {
      factor: 'Precision loss in fee calculation',
      source: 'Static Analysis (PRISM-DET-05)',
      contribution: '+8',
      explanation: 'Base amount is divided by constant scalar before multiplying by basis points, rounding small fees down to 0.'
    },
    {
      factor: 'Verified compiler metadata & bytecode matching',
      source: 'Bytecode Matcher',
      contribution: '-5',
      explanation: 'Contract matches Solidity v0.8.20 compiler artifacts without unverified inline assembly.'
    }
  ],
  runtimeSignals: [
    {
      factor: 'Oracle price deviation exceeds threshold',
      source: 'Runtime Monitor (Oracle Pipeline)',
      contribution: '+20',
      explanation: 'Observed oracle price diverged significantly from the expected reference behavior (+2.14% vs 30m TWAP).'
    },
    {
      factor: 'Abnormal liquidity outflow anomaly',
      source: 'Runtime Monitor (Balance Flow)',
      contribution: '+14',
      explanation: 'Rapid withdrawal of 3.2M USDC within single block exceeds 3-sigma historical volume baseline.'
    },
    {
      factor: 'Recursive call execution frame depth',
      source: 'Runtime Trace Analyzer',
      contribution: '+15',
      explanation: 'Call trace entered withdrawCollateral() with nested recursion depth 3.'
    },
    {
      factor: 'Gas consumption surge',
      source: 'Telemetry Monitor',
      contribution: '+5',
      explanation: 'Execution consumed 3.8x rolling median gas across blocks #18,492,809 to #18,492,815.'
    }
  ],
  modelMetadata: [
    {
      modelName: 'Isolation Forest Anomaly Detector',
      version: 'v1.4.2-eval',
      features: ['tx_velocity', 'gas_derivative', 'call_depth', 'volume_ratio'],
      score: '0.892 (Anomaly Detected)',
      description: 'Unsupervised multidimensional tree isolation evaluating telemetry deviation against 30-day baseline.'
    },
    {
      modelName: 'XGBoost Risk Classifier',
      version: 'v2.1.0-prod',
      features: ['static_vuln_count', 'reentrancy_flag', 'flow_magnitude', 'oracle_divergence'],
      score: '0.941 Probability (High/Critical class)',
      description: 'Gradient boosted tree classifier trained on verified EVM protocol post-mortems.'
    }
  ]
};

export const SAMPLE_SOL_VULNERABLE = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title VulnerableVault
 * @notice Sample test contract for PRISM static analysis evaluation.
 * Contains classic reentrancy, unchecked low-level calls, and precision flaws.
 */
contract VulnerableVault {
    mapping(address => uint256) public balances;
    address public owner;

    event Deposit(address indexed sender, uint256 amount);
    event Withdraw(address indexed sender, uint256 amount);

    constructor() {
        owner = msg.sender;
    }

    function deposit() external payable {
        require(msg.value > 0, "Zero deposit");
        balances[msg.sender] += msg.value;
        emit Deposit(msg.sender, msg.value);
    }

    // PRISM-DET-01: Reentrancy vulnerability
    function withdraw(uint256 amount) external {
        require(balances[msg.sender] >= amount, "Insufficient balance");

        // External transfer before state update
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Transfer failed");

        // State updated after external execution
        balances[msg.sender] -= amount;
        emit Withdraw(msg.sender, amount);
    }

    // PRISM-DET-02: Unchecked call
    function notifyAuditor(address auditor, bytes calldata data) external {
        auditor.call(data);
    }

    // PRISM-DET-04: tx.origin access control
    function emergencyDrain() external {
        require(tx.origin == owner, "Not owner");
        payable(owner).transfer(address(this).balance);
    }

    // PRISM-DET-05: Precision loss
    function calculateFee(uint256 amount) public pure returns (uint256) {
        return (amount / 1000) * 15;
    }
}
`;

export const SAMPLE_SOL_ORACLE = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface AggregatorV3Interface {
    function latestRoundData() external view returns (
        uint80 roundId,
        int256 answer,
        uint256 startedAt,
        uint256 updatedAt,
        uint80 answeredInRound
    );
}

/**
 * @title OraclePriceConsumer
 * @notice Sample contract consuming Chainlink feed without stale round checks.
 */
contract OraclePriceConsumer {
    AggregatorV3Interface internal priceFeed;

    constructor(address _priceFeed) {
        priceFeed = AggregatorV3Interface(_priceFeed);
    }

    // PRISM-DET-03: Stale oracle price vulnerability
    function getLatestPrice() public view returns (int256) {
        (, int256 price, , , ) = priceFeed.latestRoundData();
        return price;
    }
}
`;
