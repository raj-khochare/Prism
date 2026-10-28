// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// DEMO ONLY. A constant-product ETH/token pool with internal token accounting. getReserves()
/// uses the Uniswap-V2 return layout so the backend's oracle reader works unchanged against
/// real V2-style pools on a fork. Spot price = reserveETH / reserveToken.
contract MockAmmPool {
    uint112 private reserveEth;
    uint112 private reserveToken;
    uint32 private lastTimestamp;

    mapping(address => uint256) public tokenBalance;
    address public immutable deployer;
    address public consumer;

    event Swap(address indexed trader, bool ethIn, uint256 amountIn, uint256 amountOut);
    event Sync(uint112 reserve0, uint112 reserve1);

    constructor() {
        deployer = msg.sender;
    }

    /// One-time liquidity: send ETH, name the token reserve.
    function seed(uint112 tokens) external payable {
        require(reserveEth == 0 && reserveToken == 0, "already seeded");
        reserveEth = uint112(msg.value);
        reserveToken = tokens;
        lastTimestamp = uint32(block.timestamp);
        emit Sync(reserveEth, reserveToken);
    }

    function setConsumer(address c) external {
        require(msg.sender == deployer, "deployer only");
        consumer = c;
    }

    function getReserves() external view returns (uint112, uint112, uint32) {
        return (reserveEth, reserveToken, lastTimestamp);
    }

    /// wei per whole token (1e18-scaled token units)
    function spotPriceWei() public view returns (uint256) {
        return (uint256(reserveEth) * 1e18) / uint256(reserveToken);
    }

    function swapEthForTokens() external payable returns (uint256 out) {
        out = (msg.value * reserveToken) / (uint256(reserveEth) + msg.value);
        require(out > 0 && out < reserveToken, "bad swap");
        reserveEth += uint112(msg.value);
        reserveToken -= uint112(out);
        tokenBalance[msg.sender] += out;
        lastTimestamp = uint32(block.timestamp);
        emit Swap(msg.sender, true, msg.value, out);
        emit Sync(reserveEth, reserveToken);
    }

    function swapTokensForEth(uint256 amount) external returns (uint256 out) {
        require(tokenBalance[msg.sender] >= amount && amount > 0, "no tokens");
        out = (amount * reserveEth) / (uint256(reserveToken) + amount);
        tokenBalance[msg.sender] -= amount;
        reserveToken += uint112(amount);
        reserveEth -= uint112(out);
        lastTimestamp = uint32(block.timestamp);
        (bool ok, ) = msg.sender.call{value: out}("");
        require(ok, "transfer failed");
        emit Swap(msg.sender, false, amount, out);
        emit Sync(reserveEth, reserveToken);
    }

    function spendTokens(address owner_, uint256 amount) external {
        require(msg.sender == consumer, "consumer only");
        require(tokenBalance[owner_] >= amount, "not enough tokens");
        tokenBalance[owner_] -= amount;
    }
}
