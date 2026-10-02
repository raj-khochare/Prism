// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract TxOriginWallet {

    address public owner;
    uint256 public balance;

    constructor() payable {
        owner = msg.sender;
        balance = msg.value;
    }

    function withdraw(address payable recipient) external {
        require(tx.origin == owner, "Not owner");

        recipient.transfer(address(this).balance);
    }

    receive() external payable {}
}