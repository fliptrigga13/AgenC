import assert from "node:assert/strict";
import test from "node:test";
import { Keypair, PublicKey } from "@solana/web3.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  registerReputationTools,
  deriveReputationStakePda,
  deriveReputationDelegationPda,
} from "./reputation.js";

function createServerWithTools(): McpServer {
  const server = new McpServer({ name: "test-reputation", version: "0.0.1" });
  registerReputationTools(server);
  return server;
}

test("registerReputationTools does not throw", () => {
  assert.doesNotThrow(() => createServerWithTools());
});

test("registers all reputation tools successfully", () => {
  const server = createServerWithTools();
  assert.ok(server);
});

test("deriveReputationStakePda derives deterministic PDA", () => {
  const agentPda = Keypair.generate().publicKey;
  const programId = new PublicKey("11111111111111111111111111111111");
  const [pda1, bump1] = deriveReputationStakePda(agentPda, programId);
  const [pda2, bump2] = deriveReputationStakePda(agentPda, programId);

  assert.equal(pda1.toBase58(), pda2.toBase58());
  assert.equal(bump1, bump2);
});

test("deriveReputationDelegationPda derives deterministic PDA", () => {
  const delegator = Keypair.generate().publicKey;
  const delegatee = Keypair.generate().publicKey;
  const programId = new PublicKey("11111111111111111111111111111111");
  const [pda1, bump1] = deriveReputationDelegationPda(
    delegator,
    delegatee,
    programId,
  );
  const [pda2, bump2] = deriveReputationDelegationPda(
    delegator,
    delegatee,
    programId,
  );

  assert.equal(pda1.toBase58(), pda2.toBase58());
  assert.equal(bump1, bump2);
});
