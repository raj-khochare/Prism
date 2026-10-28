// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// DEMO ONLY. A share-based ETH vault that emits events. The monitored contract in the
/// flash-loan replay: a flash loan can pump huge value through it inside ONE transaction and
/// leave its end-of-block balance unchanged, which is why balance-delta checks alone miss it.
contract MockYieldVault {
    mapping(address => uint256) public shares;
    uint256 public totalShares;

    event Deposit(address indexed user, uint256 amount, uint256 sharesMinted);
    event Withdraw(address indexed user, uint256 amount, uint256 sharesBurned);

    function deposit() external payable {
        uint256 balanceBefore = address(this).balance - msg.value;
        uint256 minted = (totalShares == 0 || balanceBefore == 0)
            ? msg.value
            : (msg.value * totalShares) / balanceBefore;
        shares[msg.sender] += minted;
        totalShares += minted;
        emit Deposit(msg.sender, msg.value, minted);
    }

    function withdraw(uint256 burn) external {
        require(shares[msg.sender] >= burn, "not enough shares");
        uint256 amount = (burn * address(this).balance) / totalShares;
        shares[msg.sender] -= burn;
        totalShares -= burn;
        (bool ok, ) = msg.sender.call{value: amount}("");
        require(ok, "transfer failed");
        emit Withdraw(msg.sender, amount, burn);
    }
}
