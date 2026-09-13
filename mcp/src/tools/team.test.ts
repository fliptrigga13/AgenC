import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerTeamTools, resetMcpTeamEngine } from "./team.js";

function createMockServer() {
  const server = new McpServer({ name: "test-server", version: "1.0.0" });
  registerTeamTools(server);
  return server;
}

describe("MCP Team Tools", () => {
  let server: McpServer;

  beforeEach(() => {
    resetMcpTeamEngine();
    server = createMockServer();
  });

  it("creates a team contract and queries its snapshot", async () => {
    // @ts-expect-error accessing private tools map for testing
    const createTool = server._registeredTools["agenc_create_team"];
    assert.ok(createTool, "agenc_create_team tool should be registered");

    const createRes = await createTool.handler({
      team_id: "test-team-01",
      creator_id: "agent-lead",
      name: "Alpha Swarm",
      description: "Autonomous research team",
      payout_type: "weighted",
      total_budget_sol: 5.0,
      roles: [
        { role_id: "lead", min_count: 1, max_count: 1 },
        { role_id: "researcher", min_count: 1, max_count: 3 },
      ],
      checkpoints: [
        { checkpoint_id: "cp-1", title: "Gather data" },
        { checkpoint_id: "cp-2", title: "Generate report", parent_checkpoint_ids: ["cp-1"] },
      ],
    });

    const createData = JSON.parse(createRes.content[0].text);
    assert.equal(createData.team_id, "test-team-01");
    assert.equal(createData.status, "draft");
    assert.equal(createData.roles_defined, 2);

    // Query snapshot
    // @ts-expect-error accessing private tools map
    const getTool = server._registeredTools["agenc_get_team"];
    const getRes = await getTool.handler({ team_id: "test-team-01" });
    const getData = JSON.parse(getRes.content[0].text);
    assert.equal(getData.team_id, "test-team-01");
    assert.equal(getData.name, "Alpha Swarm");
  });

  it("handles agent joining and checkpoint completion lifecycle", async () => {
    // @ts-expect-error accessing private tools map
    const createTool = server._registeredTools["agenc_create_team"];
    await createTool.handler({
      team_id: "test-team-02",
      creator_id: "agent-coordinator",
      name: "Execution Team",
      payout_type: "weighted",
      total_budget_sol: 2.5,
      roles: [{ role_id: "worker", min_count: 1, max_count: 2 }],
      checkpoints: [{ checkpoint_id: "cp-work", title: "Execute Work" }],
    });

    // Join team
    // @ts-expect-error accessing private tools map
    const joinTool = server._registeredTools["agenc_join_team"];
    const joinRes = await joinTool.handler({
      team_id: "test-team-02",
      member_id: "agent-executor-1",
      role_id: "worker",
      wallet: "11111111111111111111111111111111",
    });
    const joinData = JSON.parse(joinRes.content[0].text);
    assert.equal(joinData.joined_member.id, "agent-executor-1");
    assert.equal(joinData.total_members, 1);

    // Complete checkpoint
    // @ts-expect-error accessing private tools map
    const cpTool = server._registeredTools["agenc_complete_team_checkpoint"];
    const cpRes = await cpTool.handler({
      team_id: "test-team-02",
      checkpoint_id: "cp-work",
      member_id: "agent-executor-1",
      output_digest: "sha256:abcd1234efgh5678",
    });
    const cpData = JSON.parse(cpRes.content[0].text);
    assert.equal(cpData.checkpoint_status, "completed");

    // Finalize payout
    // @ts-expect-error accessing private tools map
    const payoutTool = server._registeredTools["agenc_finalize_team_payout"];
    const payoutRes = await payoutTool.handler({
      team_id: "test-team-02",
      total_reward_sol: 2.5,
    });
    const payoutData = JSON.parse(payoutRes.content[0].text);
    assert.equal(payoutData.contract_status, "finalized");
    assert.ok(payoutData.shares["agent-executor-1"]);
    assert.equal(payoutData.shares["agent-executor-1"].sol, 2.5);
  });
});
