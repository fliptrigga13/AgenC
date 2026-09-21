/**
 * Read-only mainnet example: touch the LIVE AgenC marketplace program
 * (agenc-coordination, HJsZ53Zb27b8QMRbQpuDngE44AdwCGxvEZr61Zmxw1xK) with the
 * public @tetsuo-ai/marketplace-sdk read APIs.
 *
 * This example NEVER uses private keys, NEVER signs, and NEVER submits
 * transactions. It performs read-only RPC calls only.
 *
 * Usage:
 *   npx tsx examples/mainnet-readonly/index.ts
 *   AGENC_RPC_URL=https://your-gpa-enabled-rpc npx tsx examples/mainnet-readonly/index.ts
 */

import { address, createSolanaRpc } from "@solana/kit";
import { listDirectClaimableTasks } from "@tetsuo-ai/marketplace-sdk";

const MARKETPLACE_PROGRAM = address(
  "HJsZ53Zb27b8QMRbQpuDngE44AdwCGxvEZr61Zmxw1xK",
);
const RPC_URL =
  process.env.AGENC_RPC_URL ?? "https://api.mainnet-beta.solana.com";

function solString(lamports: bigint): string {
  return `${(Number(lamports) / 1_000_000_000).toFixed(4)} SOL`;
}

async function withRetries<T>(
  label: string,
  fn: () => Promise<T>,
  attempts = 4,
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const detail = String(
        (error as Error)?.message ?? error,
      ).slice(0, 100);
      console.log(`  ${label}: attempt ${attempt}/${attempts} failed (${detail}), retrying...`);
      await new Promise((resolve) => setTimeout(resolve, 2500));
    }
  }
  throw lastError;
}

async function main(): Promise<void> {
  const rpc = createSolanaRpc(RPC_URL);
  console.log(`RPC endpoint: ${RPC_URL}`);

  // 1. Prove the marketplace program is live on mainnet.
  const program = await withRetries("program account", () =>
    rpc.getAccountInfo(MARKETPLACE_PROGRAM, { encoding: "base64" }).send(),
  );
  if (!program.value || !program.value.executable) {
    throw new Error(
      "marketplace program account is missing or not executable on mainnet",
    );
  }
  console.log("Marketplace program: LIVE on Solana mainnet");
  console.log(`  address:    ${MARKETPLACE_PROGRAM}`);
  console.log(`  executable: ${program.value.executable}`);
  console.log(`  lamports:   ${program.value.lamports}`);

  // 2. List directly-claimable tasks through the SDK's trustless read path.
  //
  // NOTE: getProgramAccounts is disabled or restricted on many free public RPC
  // endpoints (api.mainnet-beta.solana.com included). That is an RPC
  // restriction, not an SDK bug — point AGENC_RPC_URL at a gPA-enabled
  // endpoint (Helius, QuickNode, Triton, ...) to see live tasks.
  console.log("\nClaimable tasks (SDK read path)...");
  try {
    const tasks = await withRetries("claimable tasks", () =>
      listDirectClaimableTasks(rpc, {}),
    );
    console.log(`  found ${tasks.length} directly-claimable task(s)`);
    for (const { address: taskAddress, account } of tasks.slice(0, 10)) {
      const deadline =
        account.deadline > 0n
          ? new Date(Number(account.deadline) * 1000).toISOString()
          : "none";
      console.log(
        `  - ${taskAddress} | reward ${solString(account.rewardAmount)} | ` +
          `status ${String(account.status)} | deadline ${deadline} | ` +
          `workers ${account.currentWorkers}/${account.maxWorkers}`,
      );
    }
  } catch (error) {
    console.log(
      "  RPC endpoint refused getProgramAccounts (common on free public RPCs).",
    );
    console.log(
      "  Set AGENC_RPC_URL to a gPA-enabled endpoint to list live tasks.",
    );
    console.log(
      `  detail: ${String((error as Error)?.message ?? error).slice(0, 160)}`,
    );
  }

  console.log("\nDone — no keys used, no transactions sent (read-only).");
}

main().catch((error) => {
  console.error("FAILED:", (error as Error)?.message ?? error);
  process.exit(1);
});
