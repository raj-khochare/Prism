import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "deployments");

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Addresses written by a deploy step, so the attack step needs no copy-pasting. */
export function loadDeployment(name) {
  const f = path.join(dir, `${name}.json`);
  return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, "utf8")) : null;
}

export function saveDeployment(name, data) {
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, `${name}.json`), JSON.stringify(data, null, 2));
}

/** A saved deployment is only valid if every address still has code (the node may have been reset). */
export async function stillDeployed(ethers, deployment) {
  if (!deployment) return false;
  for (const addr of Object.values(deployment)) {
    if (typeof addr === "string" && addr.startsWith("0x") && (await ethers.provider.getCode(addr)) === "0x") {
      return false;
    }
  }
  return true;
}

export function banner(title) {
  console.log("\n" + "=".repeat(64) + "\n" + title + "\n" + "=".repeat(64));
}
