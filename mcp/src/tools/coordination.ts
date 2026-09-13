/**
 * MCP tools for Multi-Agent Coordination & Dependent Task DAG Management.
 *
 * Provides sub-task creation with parent dependencies, task DAG resolution,
 * and topological sorting with cycle detection.
 *
 * @module
 */

import { PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import {
  createDependentTask,
  getTaskDependencyTree,
  sortTaskDependencyDag,
  type DependentTaskParams,
  type TaskDependencyNode,
} from "@agenc/sdk";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { randomBytes } from "node:crypto";
import {
  getSigningProgram,
  getConnection,
  getCurrentProgramId,
} from "../utils/connection.js";
import { toolTextResponse, withToolErrorResponse } from "./response.js";

function renderDependencyTree(node: TaskDependencyNode, prefix = ""): string {
  const statusStr = node.task ? ` [Status: ${node.task.status}]` : "";
  const lines = [`${prefix}└── ${node.taskPda.toBase58()}${statusStr}`];
  for (let i = 0; i < node.children.length; i++) {
    const isLast = i === node.children.length - 1;
    const childPrefix = prefix + (isLast ? "    " : "│   ");
    lines.push(renderDependencyTree(node.children[i], childPrefix));
  }
  return lines.join("\n");
}

export function registerCoordinationTools(server: McpServer): void {
  // --------------------------------------------------------------------------
  // Create Dependent Task
  // --------------------------------------------------------------------------
  server.tool(
    "agenc_create_dependent_task",
    "Create an on-chain sub-task that depends on an existing parent task",
    {
      creator_agent_id: z
        .string()
        .describe("32-byte creator agent ID (hex string or comma-separated bytes)"),
      parent_task_pda: z
        .string()
        .describe("PDA of the parent task this new task depends on (base58)"),
      description: z
        .string()
        .min(1)
        .max(64)
        .describe("Description or instruction hash for the sub-task (max 64 bytes)"),
      reward_sol: z
        .number()
        .positive()
        .describe("Reward amount in SOL for the sub-task worker"),
      deadline_seconds: z
        .number()
        .int()
        .positive()
        .optional()
        .default(3600)
        .describe("Deadline in seconds from now (default: 3600)"),
      dependency_type: z
        .number()
        .int()
        .min(0)
        .max(3)
        .optional()
        .default(0)
        .describe("Dependency type (0 = Strict completion prerequisite, 1 = OutputFeed)"),
      required_capabilities: z
        .string()
        .optional()
        .default("0")
        .describe("Required capabilities bitmask (uint64 as string)"),
    },
    withToolErrorResponse(async (args) => {
      const { program, keypair } = await getSigningProgram();
      const connection = getConnection();

      let creatorIdBytes: Uint8Array;
      if (args.creator_agent_id.includes(",")) {
        creatorIdBytes = Uint8Array.from(
          args.creator_agent_id.split(",").map((n) => Number(n.trim())),
        );
      } else {
        creatorIdBytes = Buffer.from(
          args.creator_agent_id.replace(/^0x/, ""),
          "hex",
        );
      }
      if (creatorIdBytes.length !== 32) {
        throw new Error("creator_agent_id must be exactly 32 bytes");
      }

      const parentTaskPda = new PublicKey(args.parent_task_pda);
      const taskId = randomBytes(32);
      const rewardLamports = BigInt(
        Math.round(args.reward_sol * LAMPORTS_PER_SOL),
      );
      const deadline = Math.floor(Date.now() / 1000) + args.deadline_seconds;

      const descBuffer = Buffer.alloc(64);
      Buffer.from(args.description, "utf8").copy(descBuffer);

      const params: DependentTaskParams = {
        taskId,
        requiredCapabilities: BigInt(args.required_capabilities || "0"),
        description: descBuffer,
        rewardAmount: rewardLamports,
        maxWorkers: 1,
        deadline,
        taskType: 0,
        dependencyType: args.dependency_type,
      };

      const result = await createDependentTask(
        connection,
        program as any,
        keypair,
        creatorIdBytes,
        parentTaskPda,
        params,
      );

      return toolTextResponse(
        [
          "=== Dependent Task Created Successfully ===",
          "Child Task PDA: " + result.taskPda.toBase58(),
          "Parent Task PDA: " + parentTaskPda.toBase58(),
          "Reward: " + args.reward_sol + " SOL",
          "Dependency Type: " + args.dependency_type,
          "Transaction Signature: " + result.txSignature,
        ].join("\n"),
      );
    }),
  );

  // --------------------------------------------------------------------------
  // Get Task Dependency Tree
  // --------------------------------------------------------------------------
  server.tool(
    "agenc_get_task_dependency_tree",
    "Resolve and render the full multi-level dependency DAG starting from a root task",
    {
      root_task_pda: z.string().describe("Root task PDA (base58)"),
      max_depth: z
        .number()
        .int()
        .min(1)
        .max(20)
        .optional()
        .default(10)
        .describe("Maximum tree traversal depth (default: 10)"),
    },
    withToolErrorResponse(async (args) => {
      const connection = getConnection();
      const programId = getCurrentProgramId();
      const rootPda = new PublicKey(args.root_task_pda);

      const tree = await getTaskDependencyTree(
        connection,
        programId,
        rootPda,
        args.max_depth,
      );

      const rendered = renderDependencyTree(tree);

      return toolTextResponse(
        [
          "=== Task Dependency DAG ===",
          "Root: " + rootPda.toBase58(),
          "",
          rendered,
        ].join("\n"),
      );
    }),
  );

  // --------------------------------------------------------------------------
  // Sort Task DAG (Topological Sort & Cycle Detection)
  // --------------------------------------------------------------------------
  server.tool(
    "agenc_sort_task_dag",
    "Topologically sorts a list of tasks by dependencies and checks for circular references",
    {
      tasks: z
        .array(
          z.object({
            task_pda: z.string().describe("Task PDA (base58)"),
            depends_on_pda: z
              .string()
              .nullable()
              .optional()
              .describe("Parent task PDA this task depends on (or null if independent)"),
          }),
        )
        .min(1)
        .describe("List of tasks and their parent dependencies"),
    },
    withToolErrorResponse(async (args) => {
      const nodes = args.tasks.map((t) => ({
        taskPda: new PublicKey(t.task_pda),
        dependsOn: t.depends_on_pda ? new PublicKey(t.depends_on_pda) : null,
      }));

      const result = sortTaskDependencyDag(nodes);

      if (result.hasCycle) {
        const cycleStr = (result.cycleNodes ?? [])
          .map((p) => p.toBase58())
          .join(", ");
        return toolTextResponse(
          [
            "=== INVALID DAG: Circular Dependency Detected! ===",
            "The following tasks form an unresolved circular loop:",
            cycleStr,
            "",
            "Partial valid sequence before cycle:",
            result.sortedTaskPdas.map((p) => p.toBase58()).join(" -> "),
          ].join("\n"),
        );
      }

      return toolTextResponse(
        [
          "=== Valid Execution Order Computed ===",
          "Total Tasks: " + result.sortedTaskPdas.length,
          "Execution Order:",
          result.sortedTaskPdas
            .map((p, idx) => `  ${idx + 1}. ${p.toBase58()}`)
            .join("\n"),
        ].join("\n"),
      );
    }),
  );
}
