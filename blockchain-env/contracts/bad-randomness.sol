// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract WeakRandomness {
    address public winner;

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
}