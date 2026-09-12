import assert from "node:assert/strict";
import test from "node:test";
import { Keypair } from "@solana/web3.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerCoordinationTools } from "./coordination.js";
import { sortTaskDependencyDag } from "@agenc/sdk";

function createServerWithTools(): McpServer {
  const server = new McpServer({ name: "test-coordination", version: "0.0.1" });
  registerCoordinationTools(server);
  return server;
}

test("registerCoordinationTools does not throw", () => {
  assert.doesNotThrow(() => createServerWithTools());
});

test("registers all coordination tools successfully", () => {
  const server = createServerWithTools();
  assert.ok(server);
});

test("sortTaskDependencyDag resolves parent before child", () => {
  const parent = Keypair.generate().publicKey;
  const child = Keypair.generate().publicKey;

  const result = sortTaskDependencyDag([
    { taskPda: child, dependsOn: parent },
    { taskPda: parent, dependsOn: null },
  ]);

  assert.equal(result.hasCycle, false);
  assert.equal(result.sortedTaskPdas.length, 2);
  assert.equal(result.sortedTaskPdas[0].toBase58(), parent.toBase58());
  assert.equal(result.sortedTaskPdas[1].toBase58(), child.toBase58());
});
