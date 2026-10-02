// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract UncheckedCall {

    bool public completed;

    function execute(address target) external {

        target.call(
            abi.encodeWithSignature("doSomething()")
        );

        completed = true;
    }
}