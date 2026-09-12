import assert from "node:assert/strict";
import test from "node:test";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerSkillTools } from "./skills.js";

function createServerWithTools(): McpServer {
  const server = new McpServer({ name: "test-skills", version: "0.0.1" });
  registerSkillTools(server);
  return server;
}

test("registerSkillTools does not throw", () => {
  assert.doesNotThrow(() => createServerWithTools());
});

test("registers all skill tools successfully", () => {
  const server = createServerWithTools();
  assert.ok(server);
});

test("can register skill tools alongside other tools without collisions", () => {
  const server = new McpServer({ name: "test-skills-multi", version: "0.0.1" });
  server.tool("dummy_tool", "Dummy", {}, async () => ({
    content: [{ type: "text" as const, text: "ok" }],
  }));
  assert.doesNotThrow(() => registerSkillTools(server));
});
