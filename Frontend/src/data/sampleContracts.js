/** Sample Solidity sources for the Scan page's "load example" buttons. */

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
