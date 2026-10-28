// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./MockFlashLender.sol";
import "./MockYieldVault.sol";

/// DEMO ONLY. Borrows, pushes the loan through the vault (deposit + withdraw) and repays,
/// all inside a single transaction. Not a profitable exploit - it reproduces the on-chain
/// *footprint* of a flash-loan attack (huge in/out flow, one block) for the monitor.
contract FlashLoanAttacker is IFlashBorrower {
    MockFlashLender public immutable lender;
    MockYieldVault public immutable vault;
    address public immutable owner;

    constructor(address lender_, address vault_) {
        lender = MockFlashLender(payable(lender_));
        vault = MockYieldVault(vault_);
        owner = msg.sender;
    }

    receive() external payable {}

    /// Send ETH with the call to cover the lender's fee.
    function attack(uint256 amount) external payable {
        require(msg.sender == owner, "owner only");
        lender.flashLoan(address(this), amount);
        (bool ok, ) = owner.call{value: address(this).balance}("");
        require(ok, "sweep failed");
    }

    function onFlashLoan(uint256 amount, uint256 fee) external payable override {
        require(msg.sender == address(lender), "lender only");
        vault.deposit{value: amount}();
        vault.withdraw(vault.shares(address(this)));
        (bool ok, ) = address(lender).call{value: amount + fee}("");
        require(ok, "repay failed");
    }
}
