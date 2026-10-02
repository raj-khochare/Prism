// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract ArbitrarySend {

    mapping(address => uint256) public balances;

    function deposit() external payable {
        balances[msg.sender] += msg.value;
    }

    function sendTo(address payable recipient) external {

        uint256 amount = address(this).balance;

        recipient.transfer(amount);
    }

    receive() external payable {}
}