// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IFlashBorrower {
    function onFlashLoan(uint256 amount, uint256 fee) external payable;
}

/// DEMO ONLY. A minimal ETH flash lender. The event layout mirrors the shape of real lenders
/// (borrower, amount, fee) so the backend's receipt-log detector can be tested locally; on a
/// mainnet fork the same detector matches Aave V3 / Balancer V2 FlashLoan topics instead.
contract MockFlashLender {
    event FlashLoan(address indexed receiver, uint256 amount, uint256 fee);

    uint256 public constant FEE_BPS = 9; // 0.09%

    receive() external payable {}

    function flashLoan(address receiver, uint256 amount) external {
        uint256 before = address(this).balance;
        require(amount <= before, "insufficient liquidity");
        uint256 fee = (amount * FEE_BPS) / 10_000;

        IFlashBorrower(receiver).onFlashLoan{value: amount}(amount, fee);

        require(address(this).balance >= before + fee, "loan not repaid");
        emit FlashLoan(receiver, amount, fee);
    }
}
