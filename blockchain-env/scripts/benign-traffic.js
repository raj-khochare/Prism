import { network } from "hardhat";
import { banner, loadDeployment, sleep, stillDeployed } from "./lib/common.js";

/**
 * NORMAL traffic on the scenarios deployed by replay-flashloan.js / replay-oracle.js.
 * Gives the monitor realistic baselines (tx rate, gas, oracle spot) and produces the benign
 * rows the ML dataset needs. Run it BEFORE an attack replay, and for dataset collection run it
 * with a different ROUNDS value on each contract you want negatives for.
 *
 *   npx hardhat run scripts/benign-traffic.js
 *   ROUNDS=60 (default 25) and DELAY_MS=800 (default) are read from the environment.
 */
async function main() {
  const { ethers } = await network.create("localhost");
  const [, alice, bob, carol] = await ethers.getSigners();
  const users = [alice, bob, carol];
  const rounds = Number(process.env.ROUNDS || 25);
  const delay = Number(process.env.DELAY_MS || 800);

  const fl = loadDeployment("flashloan");
  const or = loadDeployment("oracle");
  const useFl = await stillDeployed(ethers, fl);
  const useOr = await stillDeployed(ethers, or);
  if (!useFl && !useOr) {
    console.log("No deployed scenario found. Run replay-flashloan.js and/or replay-oracle.js once first (the deploy step).");
    return;
  }

  const vault = useFl ? await ethers.getContractAt("MockYieldVault", fl.vault) : null;
  const pool = useOr ? await ethers.getContractAt("MockAmmPool", or.pool) : null;
  const rnd = (min, max) => min + Math.random() * (max - min);
  const eth = (x) => ethers.parseEther(x.toFixed(4));

  banner(`Benign traffic: ${rounds} rounds`);
  for (let i = 0; i < rounds; i++) {
    const u = users[i % users.length];
    try {
      if (vault) {
        if (Math.random() < 0.6) {
          await (await vault.connect(u).deposit({ value: eth(rnd(0.1, 2)) })).wait();
        } else {
          const s = await vault.shares(await u.getAddress());
          if (s > 0n) await (await vault.connect(u).withdraw(s / 4n + 1n)).wait();
        }
      }
      if (pool) {
        if (Math.random() < 0.65) {
          await (await pool.connect(u).swapEthForTokens({ value: eth(rnd(0.05, 0.6)) })).wait();
        } else {
          const t = await pool.tokenBalance(await u.getAddress());
          if (t > 0n) await (await pool.connect(u).swapTokensForEth(t / 3n + 1n)).wait();
        }
      }
    } catch (e) {
      console.log("  skipped a round:", (e.shortMessage || e.message).slice(0, 80));
    }
    if ((i + 1) % 5 === 0) console.log(`  ${i + 1}/${rounds} rounds done`);
    await sleep(delay);
  }
  console.log("Done.");
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
