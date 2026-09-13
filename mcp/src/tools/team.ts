/**
 * MCP tools for Multi-Agent Team Formation & Contract Management.
 *
 * Exposes the AgenC TeamContractEngine through MCP tools, allowing
 * AI agents to autonomously create teams, assign roles, track milestones,
 * and finalize rewards.
 *
 * @module
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import {
  TeamContractEngine,
  type TeamTemplate,
  type TeamRoleTemplate,
  type TeamCheckpointTemplate,
  type TeamPayoutConfig,
} from "@agenc/runtime";
import { toolTextResponse, withToolErrorResponse } from "./response.js";

// Shared team engine instance for MCP runtime
let globalTeamEngine: TeamContractEngine | null = null;

export function getMcpTeamEngine(): TeamContractEngine {
  if (!globalTeamEngine) {
    globalTeamEngine = new TeamContractEngine();
  }
  return globalTeamEngine;
}

export function resetMcpTeamEngine(): void {
  globalTeamEngine = new TeamContractEngine();
}

export function registerTeamTools(server: McpServer): void {
  // --------------------------------------------------------------------------
  // Create Team Contract
  // --------------------------------------------------------------------------
  server.tool(
    "agenc_create_team",
    "Create an autonomous multi-agent team contract with role specifications, milestone checkpoints, and reward payout structure",
    {
      team_id: z
        .string()
        .min(1)
        .max(64)
        .describe("Unique team identifier slug (e.g. 'research-swarm-01')"),
      creator_id: z
        .string()
        .describe("Agent ID of the team coordinator / creator"),
      name: z
        .string()
        .describe("Display name for the team contract"),
      description: z
        .string()
        .optional()
        .describe("Mission objective or scope of work"),
      payout_type: z
        .enum(["fixed", "weighted", "milestone"])
        .default("weighted")
        .describe("Payout distribution model"),
      total_budget_sol: z
        .number()
        .positive()
        .describe("Total contract budget in SOL"),
      roles: z
        .array(
          z.object({
            role_id: z.string().describe("Role ID (e.g. 'lead-analyst')"),
            min_count: z.number().int().min(1).default(1),
            max_count: z.number().int().min(1).default(1),
            description: z.string().optional(),
          }),
        )
        .optional()
        .describe("Defined roles required for the team"),
      checkpoints: z
        .array(
          z.object({
            checkpoint_id: z.string().describe("Unique checkpoint ID (e.g. 'cp-draft')"),
            title: z.string().describe("Milestone checkpoint title"),
            parent_checkpoint_ids: z.array(z.string()).optional(),
          }),
        )
        .optional()
        .describe("Ordered checkpoints/milestones required for project completion"),
    },
    withToolErrorResponse(async (args) => {
      const engine = getMcpTeamEngine();

      const roles: TeamRoleTemplate[] =
        args.roles && args.roles.length > 0
          ? args.roles.map((r) => ({
              id: r.role_id,
              requiredCapabilities: 0n,
              minMembers: r.min_count,
              maxMembers: r.max_count,
            }))
          : [
              { id: "lead", requiredCapabilities: 0n, minMembers: 1, maxMembers: 1 },
              { id: "worker", requiredCapabilities: 0n, minMembers: 1, maxMembers: 5 },
            ];

      const defaultRoleId = roles[0].id;

      const checkpoints: TeamCheckpointTemplate[] =
        args.checkpoints && args.checkpoints.length > 0
          ? args.checkpoints.map((c) => ({
              id: c.checkpoint_id,
              roleId: defaultRoleId,
              label: c.title,
              dependsOn: c.parent_checkpoint_ids ?? [],
              required: true,
            }))
          : [
              {
                id: "checkpoint-final",
                roleId: defaultRoleId,
                label: "Final Deliverable Completion",
                dependsOn: [],
                required: true,
              },
            ];

      let payoutConfig: TeamPayoutConfig;
      if (args.payout_type === "fixed") {
        const splitBps = Math.floor(10000 / roles.length);
        const rolePayoutBps: Record<string, number> = {};
        let sum = 0;
        for (let i = 0; i < roles.length; i++) {
          const bps = i === roles.length - 1 ? 10000 - sum : splitBps;
          rolePayoutBps[roles[i].id] = bps;
          sum += bps;
        }
        payoutConfig = { mode: "fixed", rolePayoutBps };
      } else if (args.payout_type === "milestone") {
        const splitBps = Math.floor(10000 / checkpoints.length);
        const milestonePayoutBps: Record<string, number> = {};
        let sum = 0;
        for (let i = 0; i < checkpoints.length; i++) {
          const bps = i === checkpoints.length - 1 ? 10000 - sum : splitBps;
          milestonePayoutBps[checkpoints[i].id] = bps;
          sum += bps;
        }
        payoutConfig = { mode: "milestone", milestonePayoutBps };
      } else {
        const roleWeights: Record<string, number> = {};
        for (const r of roles) {
          roleWeights[r.id] = 1;
        }
        payoutConfig = { mode: "weighted", roleWeights };
      }

      const template: TeamTemplate = {
        id: args.team_id,
        name: args.name,
        roles,
        checkpoints,
        payout: payoutConfig,
        metadata: args.description ? { description: args.description } : undefined,
      };

      const snapshot = engine.createContract({
        contractId: args.team_id,
        creatorId: args.creator_id,
        template,
      });

      return toolTextResponse(
        JSON.stringify(
          {
            team_id: snapshot.id,
            name: snapshot.template.name,
            status: snapshot.status,
            roles_defined: snapshot.template.roles.length,
            checkpoints_defined: snapshot.template.checkpoints.length,
            payout_type: snapshot.template.payout.mode,
            budget_sol: args.total_budget_sol,
            created_at: new Date().toISOString(),
          },
          null,
          2,
        ),
      );
    }),
  );

  // --------------------------------------------------------------------------
  // Join Team
  // --------------------------------------------------------------------------
  server.tool(
    "agenc_join_team",
    "Register an autonomous agent as a member of a team contract",
    {
      team_id: z.string().describe("Target team contract ID"),
      member_id: z.string().describe("Agent ID joining the team"),
      role_id: z.string().describe("Desired role ID defined in the team template"),
      wallet: z.string().describe("Payout recipient wallet address (base58)"),
      capabilities: z.number().int().optional().describe("Bitmask of agent capabilities"),
    },
    withToolErrorResponse(async (args) => {
      const engine = getMcpTeamEngine();

      const snapshot = engine.joinContract({
        contractId: args.team_id,
        member: {
          id: args.member_id,
          capabilities: typeof args.capabilities === "number" ? BigInt(args.capabilities) : 0n,
          roles: args.role_id ? [args.role_id] : [],
          metadata: { wallet: args.wallet },
        },
      });

      const member = snapshot.members.find((m) => m.id === args.member_id);

      return toolTextResponse(
        JSON.stringify(
          {
            team_id: snapshot.id,
            status: snapshot.status,
            joined_member: {
              id: member?.id,
              role: member?.roles[0] ?? args.role_id,
              wallet: args.wallet,
              joined_at: member?.joinedAt ? new Date(member.joinedAt).toISOString() : undefined,
            },
            total_members: snapshot.members.length,
          },
          null,
          2,
        ),
      );
    }),
  );

  // --------------------------------------------------------------------------
  // Assign Team Role
  // --------------------------------------------------------------------------
  server.tool(
    "agenc_assign_team_role",
    "Assign or reassign an agent to a specific role in a team contract",
    {
      team_id: z.string().describe("Team contract ID"),
      member_id: z.string().describe("Agent ID whose role is being updated"),
      role_id: z.string().describe("New role ID to assign"),
    },
    withToolErrorResponse(async (args) => {
      const engine = getMcpTeamEngine();

      const snapshot = engine.assignRole({
        contractId: args.team_id,
        memberId: args.member_id,
        roleId: args.role_id,
      });

      return toolTextResponse(
        JSON.stringify(
          {
            team_id: snapshot.id,
            member_id: args.member_id,
            assigned_role: args.role_id,
            status: snapshot.status,
          },
          null,
          2,
        ),
      );
    }),
  );

  // --------------------------------------------------------------------------
  // Complete Checkpoint
  // --------------------------------------------------------------------------
  server.tool(
    "agenc_complete_team_checkpoint",
    "Mark a team milestone checkpoint completed with cryptographic or artifact evidence",
    {
      team_id: z.string().describe("Team contract ID"),
      checkpoint_id: z.string().describe("Checkpoint milestone ID completed"),
      member_id: z.string().describe("Agent ID that executed the milestone"),
      output_digest: z.string().optional().describe("SHA-256 or deliverable URI hash"),
    },
    withToolErrorResponse(async (args) => {
      const engine = getMcpTeamEngine();

      const existing = engine.getContract(args.team_id);
      if (!existing) {
        throw new Error(`Team contract "${args.team_id}" not found`);
      }
      if (existing.status === "draft") {
        engine.startRun(args.team_id);
      }

      const snapshot = engine.completeCheckpoint({
        contractId: args.team_id,
        checkpointId: args.checkpoint_id,
        memberId: args.member_id,
        outputDigest: args.output_digest,
      });

      const completedCp = snapshot.checkpoints[args.checkpoint_id];

      return toolTextResponse(
        JSON.stringify(
          {
            team_id: snapshot.id,
            checkpoint_id: args.checkpoint_id,
            checkpoint_status: completedCp?.status,
            completed_by: args.member_id,
            contract_status: snapshot.status,
          },
          null,
          2,
        ),
      );
    }),
  );

  // --------------------------------------------------------------------------
  // Finalize Team Payout
  // --------------------------------------------------------------------------
  server.tool(
    "agenc_finalize_team_payout",
    "Compute and finalize payout reward shares for all active members of a completed team contract",
    {
      team_id: z.string().describe("Team contract ID"),
      total_reward_sol: z.number().positive().describe("Total reward amount in SOL to distribute"),
    },
    withToolErrorResponse(async (args) => {
      const engine = getMcpTeamEngine();
      const lamports = BigInt(Math.round(args.total_reward_sol * LAMPORTS_PER_SOL));

      const payout = engine.finalizePayout({
        contractId: args.team_id,
        totalRewardLamports: lamports,
      });

      const shares: Record<string, { lamports: string; sol: number }> = {};
      for (const [memberId, memberLamports] of Object.entries(payout.memberPayouts)) {
        shares[memberId] = {
          lamports: memberLamports.toString(),
          sol: Number(memberLamports) / LAMPORTS_PER_SOL,
        };
      }

      return toolTextResponse(
        JSON.stringify(
          {
            team_id: args.team_id,
            contract_status: "finalized",
            total_distributed_sol:
              Number(payout.totalRewardLamports - payout.unallocatedLamports) / LAMPORTS_PER_SOL,
            shares,
          },
          null,
          2,
        ),
      );
    }),
  );

  // --------------------------------------------------------------------------
  // Get Team Snapshot
  // --------------------------------------------------------------------------
  server.tool(
    "agenc_get_team",
    "Retrieve the full operational state, member roster, checkpoints, and payout details of a team contract",
    {
      team_id: z.string().describe("Team contract ID"),
    },
    withToolErrorResponse(async (args) => {
      const engine = getMcpTeamEngine();
      const snapshot = engine.getContract(args.team_id);

      if (!snapshot) {
        throw new Error(`Team contract "${args.team_id}" not found`);
      }

      return toolTextResponse(
        JSON.stringify(
          {
            team_id: snapshot.id,
            creator_id: snapshot.creatorId,
            name: snapshot.template.name,
            description: (snapshot.template.metadata?.description as string) ?? "",
            status: snapshot.status,
            members: snapshot.members.map((m) => ({
              id: m.id,
              roles: m.roles,
              wallet: (m.metadata?.wallet as string) ?? "",
              joined_at: new Date(m.joinedAt).toISOString(),
            })),
            checkpoints: Object.values(snapshot.checkpoints).map((c) => ({
              id: c.id,
              title: c.label,
              status: c.status,
              completed_by: c.completedBy,
              completed_at: c.completedAt ? new Date(c.completedAt).toISOString() : undefined,
            })),
            payout_type: snapshot.template.payout.mode,
            finalized: snapshot.finalizedPayout !== null,
          },
          null,
          2,
        ),
      );
    }),
  );
}
