# Phase 1/2 runbook: replay scripts + flash-loan and oracle detectors

All commands from `blockchain-env/` unless noted. PowerShell syntax.

## What was added
| Piece | Files |
|---|---|
| Demo contracts | `contracts/sim/` MockFlashLender, MockYieldVault, FlashLoanAttacker, MockAmmPool, OracleLender |
| Replay scripts | `scripts/replay-flashloan.js`, `scripts/replay-oracle.js`, `scripts/benign-traffic.js` |
| Detectors | `RuntimeSignalDetectors.java` (+ `RuntimeSignalDetectorsTest`), wired into `RuntimeMonitorService` |
| Now real features | `flashLoanDetected`, `oracleDeviationPct`. `governanceTokenConcentrationDelta` is still neutral. |

`OracleLender` is **intentionally vulnerable** and all `contracts/sim/*` are demo code. Never deploy them for real.

## How the detectors work
- **Flash loan:** a transaction counts when its receipt has a flash-loan event (mock lender, Aave V3 or Balancer V2 topic) AND the monitored contract also emitted a log in that same transaction. Receipts, not `tx.to`, so attacks through an attacker contract are seen, and a loan that leaves the end-of-block balance unchanged is still caught.
- **Oracle:** for a contract with a pool configured in `ORACLE_POOLS`, every block reads `getReserves()` (Uniswap-V2 layout), computes the spot price and compares it with the mean of earlier samples (needs 3). Samples above the threshold (default 5%) are kept out of the baseline.
- Both feed the existing risk fusion, so they raise the score and can trigger alerts.

## Run it
1. Rebuild: `docker compose up --build -d` (keep your `.env` files; add the new vars from `.env.example` if you want to tune).
2. Alerts page: set the threshold to 35 for testing, save.

### Flash loan
```powershell
npx hardhat run scripts/benign-traffic.js        # optional, after the deploy step below
npx hardhat run scripts/replay-flashloan.js      # run 1: deploys, prints the Vault address
```
Register the printed **Vault** in Registry (name `MockYieldVault`), then:
```powershell
npx hardhat run scripts/replay-flashloan.js      # run 2: attack
```
Expect a `FLASH_LOAN` (Critical) event on the vault, a higher score and an alert. The vault balance printed before/after is identical: that is the point.

### Oracle manipulation
```powershell
npx hardhat run scripts/replay-oracle.js         # run 1: deploys, prints Lender + an ORACLE_POOLS line
```
1. Register the **Lender** (name `OracleLender`).
2. Put the printed `ORACLE_POOLS=...` line in `prism-Backend/.env`.
3. `docker compose up -d --force-recreate backend`
```powershell
npx hardhat run scripts/replay-oracle.js         # run 2: 6 normal swaps, then the attack
```
Expect an `ORACLE_DEVIATION` (High) event (~97%) on the lender.

### Notes
- Addresses are saved in `blockchain-env/deployments/` (git-ignored). If the node is reset, the next run redeploys automatically. Force a redeploy with `$env:FRESH = "1"` (then `Remove-Item Env:FRESH`).
- Re-register after redeploying: delete the old registry entry first (Registry -> Delete).
- The monitor only sees blocks mined after the contract is registered, and the backend restart clears in-memory runtime data.
- Real lenders on a mainnet fork: the Aave V3 and Balancer V2 topics are built in; verify them against the lender ABI you fork. Set `FLASH_LOAN_LENDERS` to the real lender addresses to avoid matching unknown emitters.

## Oracle pool without restarting
`PUT /api/runtime/oracle-pools` (Developer) `{contractAddress, poolAddress}` points the detector at a pool at runtime; `ORACLE_POOLS` + restart is no longer required (it still works). In-memory only.

## Still open
- `governanceTokenConcentrationDelta` (needs a governance token + holder tracking). State it as a limitation, or build a small `MockGovToken` replay next.
- Oracle detection needs a configured pool per contract; there is no auto-discovery.
- Mainnet fork config (`hardhat.config.js`) is not done yet.
