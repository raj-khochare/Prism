import { network } from "hardhat";
import { banner, loadDeployment, saveDeployment, sleep, stillDeployed } from "./lib/common.js";

/**
 * FLASH-LOAN replay (local, no mainnet needed).
 *
 * Run 1  (deploys)  : npx hardhat run scripts/replay-flashloan.js
 *        -> prints the vault address. Register it in the dashboard BEFORE the next run.
 * Run 2  (attacks)  : npx hardhat run scripts/replay-flashloan.js
 *        -> a few normal deposits/withdrawals, then ONE transaction that borrows 500 ETH,
 *           pushes it through the vault and repays. The vault's end-of-block balance does not
 *           change, so only the receipt-log detector (FLASH_LOAN event) can see it.
 * Redeploy fresh    : set FRESH=1 first (PowerShell: $env:FRESH = "1"), run, then Remove-Item Env:FRESH.
 */
async function main() {
  const { ethers } = await network.create("localhost");
  const [deployer, alice, bob, attackerOwner] = await ethers.getSigners();

  let dep = loadDeployment("flashloan");
  const fresh = process.env.FRESH === "1" || !(await stillDeployed(ethers, dep));

  if (fresh) {
    banner("Deploying flash-loan scenario");
    const Lender = await ethers.getContractFactory("MockFlashLender");
    const lender = await Lender.deploy();
    await lender.waitForDeployment();
    await (await deployer.sendTransaction({ to: await lender.getAddress(), value: ethers.parseEther("1000") })).wait();

    const Vault = await ethers.getContractFactory("MockYieldVault");
    const vault = await Vault.deploy();
    await vault.waitForDeployment();
    await (await vault.connect(alice).deposit({ value: ethers.parseEther("20") })).wait();
    await (await vault.connect(bob).deposit({ value: ethers.parseEther("10") })).wait();

    const Attacker = await ethers.getContractFactory("FlashLoanAttacker", attackerOwner);
    const attacker = await Attacker.deploy(await lender.getAddress(), await vault.getAddress());
    await attacker.waitForDeployment();

    dep = {
      lender: await lender.getAddress(),
      vault: await vault.getAddress(),
      attacker: await attacker.getAddress(),
    };
    saveDeployment("flashloan", dep);
    console.log("Lender  :", dep.lender);
    console.log("Vault   :", dep.vault, "  <-- register THIS in Registry (name it MockYieldVault)");
    console.log("Attacker:", dep.attacker);
    console.log("\nNow run this script again to launch the attack.");
    return;
  }

  banner("Flash-loan attack");
  const vault = await ethers.getContractAt("MockYieldVault", dep.vault);
  const attacker = await ethers.getContractAt("FlashLoanAttacker", dep.attacker, attackerOwner);

  console.log("Normal activity first (gives the monitor a baseline)...");
  for (let i = 0; i < 3; i++) {
    await (await vault.connect(alice).deposit({ value: ethers.parseEther("0.5") })).wait();
    await sleep(500);
  }

  const before = await ethers.provider.getBalance(dep.vault);
  console.log("Vault balance before:", ethers.formatEther(before), "ETH");
  const tx = await attacker.attack(ethers.parseEther("500"), { value: ethers.parseEther("1") });
  const receipt = await tx.wait();
  await sleep(500);
  const after = await ethers.provider.getBalance(dep.vault);
  console.log("Flash loan of 500 ETH executed in block", receipt.blockNumber, "tx", receipt.hash);
  console.log("Vault balance after :", ethers.formatEther(after), "ETH  (unchanged: round trip inside one tx)");
  console.log("\nExpected in the dashboard within a few seconds: a FLASH_LOAN (Critical) event on the vault.");
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
