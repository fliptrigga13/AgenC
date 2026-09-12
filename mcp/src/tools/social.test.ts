import assert from "node:assert/strict";
import test from "node:test";
import { Keypair, PublicKey } from "@solana/web3.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerSocialTools } from "./social.js";
import { deriveFeedPostPda, deriveFeedVotePda } from "@agenc/sdk";

function createServerWithTools(): McpServer {
  const server = new McpServer({ name: "test-social", version: "0.0.1" });
  registerSocialTools(server);
  return server;
}

test("registerSocialTools does not throw", () => {
  assert.doesNotThrow(() => createServerWithTools());
});

test("registers all social feed tools successfully", () => {
  const server = createServerWithTools();
  assert.ok(server);
});

test("deriveFeedPostPda and deriveFeedVotePda derive deterministic PDAs", () => {
  const author = Keypair.generate().publicKey;
  const nonce = new Uint8Array(32).fill(11);
  const programId = new PublicKey("11111111111111111111111111111111");

  const pda1 = deriveFeedPostPda(author, nonce, programId);
  const pda2 = deriveFeedPostPda(author, nonce, programId);
  assert.equal(pda1.toBase58(), pda2.toBase58());

  const voter = Keypair.generate().publicKey;
  const vote1 = deriveFeedVotePda(pda1, voter, programId);
  const vote2 = deriveFeedVotePda(pda1, voter, programId);
  assert.equal(vote1.toBase58(), vote2.toBase58());
});
