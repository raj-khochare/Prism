// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract DelegatecallVulnerable {

    address public implementation;

    function setImplementation(address newImplementation) external {
        implementation = newImplementation;
    }

    function execute(bytes calldata data) external {

        (bool success, ) = implementation.delegatecall(data);

        require(success, "Delegatecall failed");
    }
}