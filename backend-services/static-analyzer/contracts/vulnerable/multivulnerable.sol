// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract MultiVulnerable {

    address public owner;
    address public winner;

    mapping(address => uint256) public balances;

    constructor() payable {
        owner = msg.sender;
    }

    // --------------------------------------------------
    // 1. TX.ORIGIN AUTHENTICATION
    // --------------------------------------------------

    function privilegedAction() external {
        require(tx.origin == owner, "Not authorized");
        owner = msg.sender;
    }

    // --------------------------------------------------
    // 2. WEAK RANDOMNESS
    // --------------------------------------------------

    function pickWinner() external {
        uint256 random = uint256(
            keccak256(
                abi.encodePacked(
                    block.timestamp,
                    block.prevrandao,
                    msg.sender
                )
            )
        );

        if (random % 10 == 0) {
            winner = msg.sender;
        }
    }

    // --------------------------------------------------
    // 3. REENTRANCY
    // --------------------------------------------------

    function deposit() external payable {
        balances[msg.sender] += msg.value;
    }

    function withdraw(uint256 amount) external {
        require(balances[msg.sender] >= amount, "Insufficient");

        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Transfer failed");

        balances[msg.sender] -= amount;
    }

    // --------------------------------------------------
    // 4. UNCHECKED LOW LEVEL CALL
    // --------------------------------------------------

    function unsafeCall(address target) external {
        target.call("");
    }

    // --------------------------------------------------
    // 5. ARBITRARY ETH TRANSFER
    // --------------------------------------------------

    function sendFunds(address payable recipient) external {
        recipient.transfer(address(this).balance);
    }

    // --------------------------------------------------
    // 6. SELFDESTRUCT / SUICIDAL
    // --------------------------------------------------

    function destroy() external {
        selfdestruct(payable(msg.sender));
    }

    receive() external payable {}
}