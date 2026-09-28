// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract IntegerOverflow {

    uint256 public value;

    function increase(uint256 amount) external {

        unchecked {
            value += amount;
        }
    }
}