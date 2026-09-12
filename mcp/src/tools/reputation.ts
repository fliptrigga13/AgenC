/**
 * MCP tools for interacting with the on-chain Reputation Economy.
 *
 * Provides staking, delegation, withdrawal, revocation, and inspection
 * of agent reputation accounts.
 *
 * @module
 */

import { PublicKey, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import { SEEDS, PROGRAM_ID } from "@agenc/sdk";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  getReadOnlyProgram,
  getSigningProgram,
  getCurrentProgramId,
  getConnection,
} from "../utils/connection.js";
import {
  formatSol,
  formatTimestamp,
  safePubkey,
  safeBigInt,
} from "../utils/formatting.js";
import { toolTextResponse, withToolErrorResponse } from "./response.js";

export function deriveReputationStakePda(
  agentPda: PublicKey,
  programId: PublicKey = PROGRAM_ID,
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [SEEDS.REPUTATION_STAKE, agentPda.toBuffer()],
    programId,
  );
}

export function deriveReputationDelegationPda(
  delegatorPda: PublicKey,
  delegateePda: PublicKey,
  programId: PublicKey = PROGRAM_ID,
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [
      SEEDS.REPUTATION_DELEGATION,
      delegatorPda.toBuffer(),
      delegateePda.toBuffer(),
    ],
    programId,
  );
}

function formatReputationStakeAccount(
  account: Record<string, unknown>,
  pda: PublicKey,
): string {
  const stakedAmount = safeBigInt(account.stakedAmount);
  const lockedUntil = Number(account.lockedUntil ?? 0);
  const slashCount = Number(account.slashCount ?? 0);

  const lines = [
    "Reputation Stake PDA: " + pda.toBase58(),
    "Agent: " + safePubkey(account.agent),
    "Staked Amount: " + formatSol(stakedAmount) + ` (${stakedAmount} lamports)`,
    "Cooldown / Locked Until: " + formatTimestamp(lockedUntil),
    "Slash Count: " + slashCount,
  ];

  return lines.join("\n");
}

function formatReputationDelegationAccount(
  account: Record<string, unknown>,
  pda: PublicKey,
): string {
  const points = Number(account.points ?? 0);
  const expiresAt = Number(account.expiresAt ?? 0);

  const lines = [
    "Reputation Delegation PDA: " + pda.toBase58(),
    "Delegator Agent: " + safePubkey(account.delegator),
    "Delegatee Agent: " + safePubkey(account.delegatee),
    "Delegated Points: " + points,
    "Expires At: " + (expiresAt === 0 ? "Never (Permanent)" : formatTimestamp(expiresAt)),
  ];

  return lines.join("\n");
}

export function registerReputationTools(server: McpServer): void {
  // --------------------------------------------------------------------------
  // Stake Reputation
  // --------------------------------------------------------------------------
  server.tool(
    "agenc_stake_reputation",
    "Stake SOL to back an agent's reputation in the network",
    {
      agent_pda: z.string().describe("Agent PDA to stake reputation for (base58)"),
      amount_sol: z.number().positive().describe("Amount of SOL to stake"),
    },
    withToolErrorResponse(async ({ agent_pda, amount_sol }) => {
      const { program, keypair } = await getSigningProgram();
      const agentPda = new PublicKey(agent_pda);
      const programId = getCurrentProgramId();

      const [stakePda] = deriveReputationStakePda(agentPda, programId);
      const lamports = Math.floor(amount_sol * LAMPORTS_PER_SOL);

      const tx = await program.methods
        .stakeReputation(new anchor.BN(lamports.toString()))
        .accountsPartial({
          authority: keypair.publicKey,
          agent: agentPda,
          reputationStake: stakePda,
          systemProgram: SystemProgram.programId,
        })
        .signers([keypair])
        .rpc();

      await getConnection().confirmTransaction(tx, "confirmed");

      return toolTextResponse(
        [
          `Staked ${amount_sol} SOL (${lamports} lamports) successfully.`,
          `Reputation Stake PDA: ${stakePda.toBase58()}`,
          `Transaction Signature: ${tx}`,
        ].join("\n"),
      );
    }),
  );

  // --------------------------------------------------------------------------
  // Withdraw Reputation Stake
  // --------------------------------------------------------------------------
  server.tool(
    "agenc_withdraw_reputation_stake",
    "Withdraw staked reputation SOL after the 7-day cooldown period has elapsed",
    {
      agent_pda: z.string().describe("Agent PDA to withdraw stake from (base58)"),
      amount_sol: z.number().positive().describe("Amount of SOL to withdraw"),
    },
    withToolErrorResponse(async ({ agent_pda, amount_sol }) => {
      const { program, keypair } = await getSigningProgram();
      const agentPda = new PublicKey(agent_pda);
      const programId = getCurrentProgramId();

      const [stakePda] = deriveReputationStakePda(agentPda, programId);
      const lamports = Math.floor(amount_sol * LAMPORTS_PER_SOL);

      const tx = await program.methods
        .withdrawReputationStake(new anchor.BN(lamports.toString()))
        .accountsPartial({
          authority: keypair.publicKey,
          agent: agentPda,
          reputationStake: stakePda,
        })
        .signers([keypair])
        .rpc();

      await getConnection().confirmTransaction(tx, "confirmed");

      return toolTextResponse(
        [
          `Withdrew ${amount_sol} SOL (${lamports} lamports) successfully.`,
          `Reputation Stake PDA: ${stakePda.toBase58()}`,
          `Transaction Signature: ${tx}`,
        ].join("\n"),
      );
    }),
  );

  // --------------------------------------------------------------------------
  // Delegate Reputation
  // --------------------------------------------------------------------------
  server.tool(
    "agenc_delegate_reputation",
    "Delegate reputation points from one agent to another (with optional expiration)",
    {
      delegator_agent_pda: z.string().describe("Delegator agent PDA (base58)"),
      delegatee_agent_pda: z.string().describe("Delegatee agent PDA (base58)"),
      points: z.number().int().positive().describe("Reputation points to delegate"),
      expires_at: z
        .number()
        .optional()
        .describe("Unix timestamp expiration (0 or omitted for no expiry)"),
    },
    withToolErrorResponse(
      async ({
        delegator_agent_pda,
        delegatee_agent_pda,
        points,
        expires_at,
      }) => {
        const { program, keypair } = await getSigningProgram();
        const delegatorPda = new PublicKey(delegator_agent_pda);
        const delegateePda = new PublicKey(delegatee_agent_pda);
        const programId = getCurrentProgramId();

        const [delegationPda] = deriveReputationDelegationPda(
          delegatorPda,
          delegateePda,
          programId,
        );

        const expiry = expires_at ?? 0;

        const tx = await program.methods
          .delegateReputation(points, new anchor.BN(expiry.toString()))
          .accountsPartial({
            authority: keypair.publicKey,
            delegatorAgent: delegatorPda,
            delegateeAgent: delegateePda,
            delegation: delegationPda,
            systemProgram: SystemProgram.programId,
          })
          .signers([keypair])
          .rpc();

        await getConnection().confirmTransaction(tx, "confirmed");

        return toolTextResponse(
          [
            `Delegated ${points} reputation points successfully.`,
            `Delegation PDA: ${delegationPda.toBase58()}`,
            `Transaction Signature: ${tx}`,
          ].join("\n"),
        );
      },
    ),
  );

  // --------------------------------------------------------------------------
  // Revoke Reputation Delegation
  // --------------------------------------------------------------------------
  server.tool(
    "agenc_revoke_reputation_delegation",
    "Revoke an active reputation delegation between two agents",
    {
      delegator_agent_pda: z.string().describe("Delegator agent PDA (base58)"),
      delegatee_agent_pda: z.string().describe("Delegatee agent PDA (base58)"),
    },
    withToolErrorResponse(
      async ({ delegator_agent_pda, delegatee_agent_pda }) => {
        const { program, keypair } = await getSigningProgram();
        const delegatorPda = new PublicKey(delegator_agent_pda);
        const delegateePda = new PublicKey(delegatee_agent_pda);
        const programId = getCurrentProgramId();

        const [delegationPda] = deriveReputationDelegationPda(
          delegatorPda,
          delegateePda,
          programId,
        );

        const tx = await program.methods
          .revokeDelegation()
          .accountsPartial({
            authority: keypair.publicKey,
            delegatorAgent: delegatorPda,
            delegation: delegationPda,
          })
          .signers([keypair])
          .rpc();

        await getConnection().confirmTransaction(tx, "confirmed");

        return toolTextResponse(
          [
            "Reputation delegation revoked successfully.",
            `Delegation PDA: ${delegationPda.toBase58()}`,
            `Transaction Signature: ${tx}`,
          ].join("\n"),
        );
      },
    ),
  );

  // --------------------------------------------------------------------------
  // Get Reputation Stake
  // --------------------------------------------------------------------------
  server.tool(
    "agenc_get_reputation_stake",
    "Inspect staked reputation and cooldown lock state for an agent",
    {
      agent_pda: z.string().describe("Agent PDA (base58)"),
    },
    withToolErrorResponse(async ({ agent_pda }) => {
      const program = getReadOnlyProgram();
      const agentPda = new PublicKey(agent_pda);
      const [stakePda] = deriveReputationStakePda(
        agentPda,
        getCurrentProgramId(),
      );

      const account = await (program.account as any).reputationStake.fetch(
        stakePda,
      );

      return toolTextResponse(
        formatReputationStakeAccount(
          account as Record<string, unknown>,
          stakePda,
        ),
      );
    }),
  );

  // --------------------------------------------------------------------------
  // Get Reputation Delegation
  // --------------------------------------------------------------------------
  server.tool(
    "agenc_get_reputation_delegation",
    "Inspect reputation delegation points and expiry between delegator and delegatee agents",
    {
      delegator_agent_pda: z.string().describe("Delegator agent PDA (base58)"),
      delegatee_agent_pda: z.string().describe("Delegatee agent PDA (base58)"),
    },
    withToolErrorResponse(
      async ({ delegator_agent_pda, delegatee_agent_pda }) => {
        const program = getReadOnlyProgram();
        const delegatorPda = new PublicKey(delegator_agent_pda);
        const delegateePda = new PublicKey(delegatee_agent_pda);
        const [delegationPda] = deriveReputationDelegationPda(
          delegatorPda,
          delegateePda,
          getCurrentProgramId(),
        );

        const account = await (
          program.account as any
        ).reputationDelegation.fetch(delegationPda);

        return toolTextResponse(
          formatReputationDelegationAccount(
            account as Record<string, unknown>,
            delegationPda,
          ),
        );
      },
    ),
  );
}
