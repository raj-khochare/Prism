import { network } from "hardhat";
import { banner, loadDeployment, saveDeployment, sleep, stillDeployed, topUp } from "./lib/common.js";

/**
 * ORACLE-MANIPULATION replay (local, no mainnet needed).
 *
 * The monitored contract is the OracleLender (it values collateral at the pool's SPOT price).
 * Run 1 (deploys): npx hardhat run scripts/replay-oracle.js
 *   -> prints the lender address and an ORACLE_POOLS line for prism-Backend/.env.
 *      1) register the lender in Registry  2) put the ORACLE_POOLS line in prism-Backend/.env
 *      3) docker compose up -d --force-recreate backend
 * Run 2 (attacks): npx hardhat run scripts/replay-oracle.js
 *   -> six small normal swaps (the baseline), then the attacker pumps the pool with 40 ETH,
 *      borrows against the inflated price, and walks away with more ETH than it paid.
 * Redeploy fresh: set FRESH=1 first (PowerShell: $env:FRESH = "1"), run, then Remove-Item Env:FRESH.
 */
async function main() {
  const { ethers } = await network.create("localhost");
  const [deployer, , bob, attacker] = await ethers.getSigners();

  let dep = loadDeployment("oracle");
  const fresh = process.env.FRESH === "1" || !(await stillDeployed(ethers, dep));

  if (fresh) {
    banner("Deploying oracle scenario");
    await topUp(ethers, [deployer, bob, attacker]);
    const Pool = await ethers.getContractFactory("MockAmmPool");
    const pool = await Pool.deploy();
    await pool.waitForDeployment();
    await (await pool.seed(ethers.parseEther("100"), { value: ethers.parseEther("100") })).wait();

    const Lender = await ethers.getContractFactory("OracleLender");
    const lender = await Lender.deploy(await pool.getAddress());
    await lender.waitForDeployment();
    await (await pool.setConsumer(await lender.getAddress())).wait();
    await (await deployer.sendTransaction({ to: await lender.getAddress(), value: ethers.parseEther("200") })).wait();

    dep = { pool: await pool.getAddress(), lender: await lender.getAddress() };
    saveDeployment("oracle", dep);
    console.log("Pool  :", dep.pool);
    console.log("Lender:", dep.lender, "  <-- register THIS in Registry (name it OracleLender)");
    console.log("\nAdd to prism-Backend/.env, then: docker compose up -d --force-recreate backend");
    console.log(`ORACLE_POOLS=${dep.lender}=${dep.pool}`);
    console.log("\nThen run this script again to launch the attack.");
    return;
  }

  banner("Oracle manipulation attack");
  const pool = await ethers.getContractAt("MockAmmPool", dep.pool);
  const lender = await ethers.getContractAt("OracleLender", dep.lender);
  const price = async () => {
    const [r0, r1] = await pool.getReserves();
    return Number(r0) / Number(r1);
  };

  // WARMUP=0 skips the built-in normal swaps (the ML data collector runs benign-traffic.js separately).
  if (process.env.WARMUP !== "0") {
    console.log("Normal swaps first (the monitor's baseline)...");
    for (let i = 0; i < 6; i++) {
      await (await pool.connect(bob).swapEthForTokens({ value: ethers.parseEther("0.5") })).wait();
      console.log("  spot price:", (await price()).toFixed(4));
      await sleep(700);
    }
  }

  const lenderBefore = await ethers.provider.getBalance(dep.lender);
  console.log("\nAttacker pumps the pool with 40 ETH...");
  const pump = await (await pool.connect(attacker).swapEthForTokens({ value: ethers.parseEther("40") })).wait();
  console.log("  spot price:", (await price()).toFixed(4), "  <-- manipulated");
  await sleep(1500);

  const tokens = await pool.tokenBalance(await attacker.getAddress());
  const rc = await (await lender.connect(attacker).borrow(tokens)).wait();
  const ev = lender.interface.parseLog(rc.logs.find((l) => l.address === dep.lender));
  const out = ev.args[2];
  console.log("ATTACK_BLOCKS", pump.blockNumber, rc.blockNumber);
  console.log(
    `Borrowed ${ethers.formatEther(out)} ETH against ${ethers.formatEther(tokens)} tokens ` +
      `(paid 40 ETH into the pool) -> net ${ethers.formatEther(out - ethers.parseEther("40"))} ETH`
  );
  await sleep(500);
  console.log("Lender liquidity:", ethers.formatEther(lenderBefore), "->", ethers.formatEther(await ethers.provider.getBalance(dep.lender)), "ETH");
  console.log("\nExpected in the dashboard within a few seconds: an ORACLE_DEVIATION (High) event on the lender.");
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
