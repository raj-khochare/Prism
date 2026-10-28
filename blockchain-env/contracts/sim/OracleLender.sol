// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./MockAmmPool.sol";

/// DEMO ONLY - INTENTIONALLY VULNERABLE. Values collateral at the pool's *spot* price, which
/// anyone can move inside a single transaction. This is the classic oracle-manipulation bug.
contract OracleLender {
    MockAmmPool public immutable pool;

    event Borrow(address indexed user, uint256 collateralTokens, uint256 ethOut, uint256 price);

    constructor(address pool_) {
        pool = MockAmmPool(pool_);
    }

    receive() external payable {}

    function borrow(uint256 collateralTokens) external {
        uint256 price = pool.spotPriceWei(); // manipulable spot price
        uint256 out = (collateralTokens * price) / 1e18;
        require(out <= address(this).balance, "no liquidity");
        pool.spendTokens(msg.sender, collateralTokens);
        (bool ok, ) = msg.sender.call{value: out}("");
        require(ok, "transfer failed");
        emit Borrow(msg.sender, collateralTokens, out, price);
    }
}
