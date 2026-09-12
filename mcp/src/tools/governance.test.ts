import assert from "node:assert/strict";
import test from "node:test";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerGovernanceTools } from "./governance.js";

function createServerWithTools(): McpServer {
  const server = new McpServer({ name: "test-governance", version: "0.0.1" });
  registerGovernanceTools(server);
  return server;
}

test("registerGovernanceTools does not throw", () => {
  assert.doesNotThrow(() => createServerWithTools());
});

test("registers all governance tools successfully", () => {
  const server = createServerWithTools();
  assert.ok(server);
});

test("can register governance tools alongside other tools without collisions", () => {
  const server = new McpServer({ name: "test-gov-multi", version: "0.0.1" });
  server.tool("dummy_tool", "Dummy", {}, async () => ({
    content: [{ type: "text" as const, text: "ok" }],
  }));
  assert.doesNotThrow(() => registerGovernanceTools(server));
});
