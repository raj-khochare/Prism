/**
 * PRISM Synthetic Demonstration Dataset (DEMO DATA)
 * High-integrity synthetic records for protocol risk monitoring.
 */

export const DEMO_SYSTEM_METRICS = {
  monitoredContracts: 6,
  openFindings: 14,
  highCriticalFindings: 5,
  activeAlerts: 3,
  currentBlock: 18492815,
  network: 'Ethereum Mainnet',
  nodeStatus: 'Synced',
  contractsLive: 6,
  rpcFeed: 'Healthy (14ms)',
  blockSynced: '#18,492,815'
};

export const DEMO_SYSTEM_STATUS = [
  { component: 'RPC Provider', status: 'Healthy', latency: '14ms', endpoint: 'https://eth-mainnet.alchemy.io/v2/***' },
  { component: 'WebSocket Feed', status: 'Active', latency: '22ms', endpoint: 'wss://eth-mainnet.alchemy.io/v2/***' },
  { component: 'Block Synchronizer', status: 'Synced', latency: '0 blocks behind', endpoint: 'Header listener (Head #18,492,815)' },
  { component: 'Static Analysis Engine', status: 'Operational', latency: '< 50ms', endpoint: 'Client-side AST parser v2.4.1' }
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
    lastScan: '2026-09-15 11:20:00',
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
    lastScan: '2026-09-15 12:10:00',
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
    lastScan: '2026-09-15 08:30:00',
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
    lastScan: '2026-09-14 23:05:00',
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
    lastScan: '2026-09-15 09:45:00',
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
    lastScan: '2026-09-13 18:00:00',
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
    description: 'The withdraw collateral function transfers ETH to msg.sender before reducing userCollateral[msg.sender] balance state.',
    whyItMatters: 'An attacker-controlled receiving contract can re-enter withdraw() repeatedly before state is written, causing insolvency.',
    remediation: 'Decrement userCollateral[msg.sender] before invoking msg.sender.call{value: amount}(""), or apply OpenZeppelin ReentrancyGuard.',
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
    description: 'Execution result of external receiver callback is not verified against return value boolean.',
    whyItMatters: 'If receiver reverts without throwing revert data, the flash loan proceeds as if successful, causing irrecoverable accounting divergence.',
    remediation: '(bool success, ) = receiver.call(payload); require(success, "Callback failed");',
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
    description: 'latestRoundData() consumed without verifying updatedAt timestamp against heartbeat window.',
    whyItMatters: 'If oracle updates fail or the L2 sequencer experiences downtime, stale asset prices are utilized to calculate collateralization ratios.',
    remediation: 'require(updatedAt > 0 && block.timestamp - updatedAt <= HEARTBEAT, "Stale price");',
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
    description: 'Vault release authentication asserts tx.origin == bridgeRelayer.',
    whyItMatters: 'Enables phishing vulnerabilities if the bridgeRelayer signs a malicious transaction interacting with an intermediary exploit contract.',
    remediation: 'Change authentication requirement to msg.sender == bridgeRelayer.',
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
    description: 'Fee percentage calculation divides base by feeBasisPoints prior to multiplying by scalar.',
    whyItMatters: 'Remainder truncation causes fee calculation to evaluate to zero for transactions below threshold values.',
    remediation: 'Reorder expression to (amount * feeBasisPoints) / 10000.',
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
    timestamp: '2026-09-15 13:42:10 UTC',
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
    timestamp: '2026-09-15 13:30:45 UTC',
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
    timestamp: '2026-09-15 12:15:00 UTC',
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
    timestamp: '2026-09-15 09:12:30 UTC',
    channel: 'Email (sec-alerts@protocol.io)',
    status: 'Dismissed',
    acknowledged: true,
    txHash: '0x2289c09931bfa2863b15dc67098e98327150ba8761c56b82098bca120937a445'
  }
];

export const DEMO_RUNTIME_EVENTS = [
  {
    id: 'evt-501',
    timestamp: '2026-09-15 13:42:10 UTC',
    contract: 'LendingPoolCore',
    severity: 'Critical',
    eventType: 'REENTRANCY_INVOCATION',
    block: 18492815,
    txHash: '0x4c2a5e88b919a623bf28e100f72728994518210344d216f4459d8031d274c301',
    gasUsed: '382,410',
    description: 'Execution call tree entered withdrawCollateral() with nested frame depth 3'
  },
  {
    id: 'evt-502',
    timestamp: '2026-09-15 13:30:45 UTC',
    contract: 'BridgeVaultV2',
    severity: 'High',
    eventType: 'UNEXPECTED_BALANCE_DRAIN',
    block: 18492809,
    txHash: '0x19a0082f483c6168e3d8cbbec457e51c6e1d911b30df4552b712ab994025a176',
    gasUsed: '194,520',
    description: 'Net balance decreased by 3,200,000 USDC within single block execution'
  },
  {
    id: 'evt-503',
    timestamp: '2026-09-15 13:18:22 UTC',
    contract: 'FlashBorrowerProxy',
    severity: 'Medium',
    eventType: 'RAPID_SWAP_SEQUENCE',
    block: 18492798,
    txHash: '0x992810abcdf12546879802a4b568390c9b0e271a364890c279401738209bb456',
    gasUsed: '512,890',
    description: '4 multi-hop routing transactions executed across Uniswap v3 and Curve pool'
  },
  {
    id: 'evt-504',
    timestamp: '2026-09-15 12:55:04 UTC',
    contract: 'ChainlinkPriceConsumer',
    severity: 'Medium',
    eventType: 'ORACLE_PRICE_DEVIATION',
    block: 18492780,
    txHash: '0x7b1c3e0a29486715fba3990812674011ccde882903ab1177651c0989f812bb33',
    gasUsed: '84,100',
    description: 'Spot price deviated by 2.14% relative to 30-minute historical median'
  },
  {
    id: 'evt-505',
    timestamp: '2026-09-15 12:40:11 UTC',
    contract: 'CurveRouterSwap',
    severity: 'Low',
    eventType: 'GAS_BURST_ANOMALY',
    block: 18492765,
    txHash: '0x5501837a28461750bfca928156e7290ba827103a89076123019ab761230ba711',
    gasUsed: '420,110',
    description: 'Gas consumption elevated during router routing iteration'
  },
  {
    id: 'evt-506',
    timestamp: '2026-09-15 12:12:00 UTC',
    contract: 'LendingPoolCore',
    severity: 'Low',
    eventType: 'NORMAL_TELEMETRY',
    block: 18492742,
    txHash: '0x8892716301abdf82761890ca5610293847561928038102948756192837461928',
    gasUsed: '110,240',
    description: 'Standard collateral deposit processed for 2.5 WETH'
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

export const DEMO_RISK_FACTORS = {
  contract: 'LendingPoolCore',
  score: 88,
  level: 'Critical',
  confidence: '94.2%',
  threshold: 75,
  staticSignals: [
    {
      factor: 'Reentrancy in withdrawCollateral()',
      source: 'Static Detector PRISM-DET-01',
      contribution: '+35 pts',
      explanation: 'State variable mutation userCollateral[msg.sender] executes after external call transfer.'
    },
    {
      factor: 'Division before multiplication precision loss',
      source: 'Static Detector PRISM-DET-05',
      contribution: '+8 pts',
      explanation: 'Protocol fee calculation truncates precision to 0 for lower principal amounts.'
    },
    {
      factor: 'Verified Solidity source code',
      source: 'Bytecode Matcher',
      contribution: '-5 pts',
      explanation: 'Exact match with public compiler metadata; no unverified assembly blocks.'
    }
  ],
  runtimeSignals: [
    {
      factor: 'Recursive call execution signature',
      source: 'Runtime Trace Analyzer',
      contribution: '+30 pts',
      explanation: 'EVM call frame nested execution depth 3 detected during withdrawal call.'
    },
    {
      factor: 'Flash-loan-sized capital inflow prior to execution',
      source: 'Balance Flow Monitor',
      contribution: '+15 pts',
      explanation: '5,000 ETH borrowed via Balancer vault and injected 1 block prior to anomaly.'
    },
    {
      factor: 'Gas consumption spike (3.8x baseline)',
      source: 'Telemetry Anomaly Detector',
      contribution: '+5 pts',
      explanation: 'Gas consumption reached 382,410 gas vs 105,000 gas 7-day rolling median.'
    }
  ],
  modelMetadata: [
    {
      name: 'Isolation Forest Anomaly Detector',
      version: 'v1.4.2-eval',
      score: '0.892 (Outlier)',
      features: 'tx_velocity, gas_derivative, call_depth, volume_ratio',
      description: 'Identifies multi-dimensional structural deviations from contract baseline telemetry.'
    },
    {
      name: 'XGBoost Risk Classifier',
      version: 'v2.1.0-prod',
      score: '0.941 probability (High/Critical class)',
      features: 'static_vuln_count, reentrancy_flag, flow_magnitude, oracle_divergence',
      description: 'Supervised classification trained on historical post-mortem exploit traces.'
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
