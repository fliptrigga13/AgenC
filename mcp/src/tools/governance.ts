/**
 * MCP tools for interacting with on-chain AgenC Governance.
 *
 * @module
 */

import { PublicKey } from "@solana/web3.js";
import {
  deriveGovernanceConfigPda,
  createProposal,
  voteProposal,
  executeProposal,
  cancelProposal,
  ProposalType,
  ProposalStatus,
} from "@agenc/sdk";
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
import { createHash } from "node:crypto";

function formatProposalType(val: unknown): string {
  const num = typeof val === "number" ? val : -1;
  switch (num) {
    case ProposalType.ProtocolUpgrade:
      return "ProtocolUpgrade (0)";
    case ProposalType.FeeChange:
      return "FeeChange (1)";
    case ProposalType.TreasurySpend:
      return "TreasurySpend (2)";
    case ProposalType.RateLimitChange:
      return "RateLimitChange (3)";
    default:
      if (typeof val === "object" && val !== null) {
        return Object.keys(val)[0] ?? String(val);
      }
      return String(val);
  }
}

function formatProposalStatus(val: unknown): string {
  const num = typeof val === "number" ? val : -1;
  switch (num) {
    case ProposalStatus.Active:
      return "Active (0)";
    case ProposalStatus.Executed:
      return "Executed (1)";
    case ProposalStatus.Defeated:
      return "Defeated (2)";
    case ProposalStatus.Cancelled:
      return "Cancelled (3)";
    default:
      if (typeof val === "object" && val !== null) {
        return Object.keys(val)[0] ?? String(val);
      }
      return String(val);
  }
}

function formatProposalAccount(
  account: Record<string, unknown>,
  pda: PublicKey,
): string {
  const titleHash = Buffer.from(
    account.titleHash as Uint8Array | number[],
  ).toString("hex");
  const descHash = Buffer.from(
    account.descriptionHash as Uint8Array | number[],
  ).toString("hex");
  const payloadHex = account.payload
    ? Buffer.from(account.payload as Uint8Array | number[]).toString("hex")
    : "None";

  const votesFor = safeBigInt(account.votesFor);
  const votesAgainst = safeBigInt(account.votesAgainst);
  const quorum = safeBigInt(account.quorum);

  const lines = [
    "Proposal PDA: " + pda.toBase58(),
    "Proposer Agent: " + safePubkey(account.proposer),
    "Proposer Authority: " + safePubkey(account.proposerAuthority),
    "Nonce: " + safeBigInt(account.nonce).toString(),
    "Type: " + formatProposalType(account.proposalType),
    "Status: " + formatProposalStatus(account.status),
    "",
    "--- Content Hashes ---",
    "Title Hash: " + titleHash,
    "Description Hash: " + descHash,
    "Payload (Hex): " + payloadHex,
    "",
    "--- Voting State ---",
    "Votes For (Weight): " + votesFor.toString(),
    "Votes Against (Weight): " + votesAgainst.toString(),
    "Total Voters: " + (account.totalVoters ?? 0),
    "Quorum Required: " + quorum.toString(),
    "",
    "--- Timestamps & Deadlines ---",
    "Created: " + formatTimestamp(Number(account.createdAt ?? 0)),
    "Voting Deadline: " + formatTimestamp(Number(account.votingDeadline ?? 0)),
    "Execution After: " + formatTimestamp(Number(account.executionAfter ?? 0)),
    "Executed At: " + formatTimestamp(Number(account.executedAt ?? 0)),
  ];

  return lines.join("\n");
}

export function registerGovernanceTools(server: McpServer): void {
  // --------------------------------------------------------------------------
  // Create Proposal
  // --------------------------------------------------------------------------
  server.tool(
    "agenc_create_proposal",
    "Create a new governance proposal (e.g. Protocol Upgrade, Fee Change, Treasury Spend, Rate Limit Change)",
    {
      proposer_agent_pda: z.string().describe("Proposer agent PDA (base58)"),
      proposal_type: z
        .number()
        .int()
        .min(0)
        .max(3)
        .describe(
          "Proposal type: 0=ProtocolUpgrade, 1=FeeChange, 2=TreasurySpend, 3=RateLimitChange",
        ),
      title: z.string().describe("Proposal title text (will be SHA-256 hashed)"),
      description: z
        .string()
        .describe("Proposal description text (will be SHA-256 hashed)"),
      payload_hex: z
        .string()
        .optional()
        .describe("Payload hex data (64 bytes hex or string)"),
      nonce: z
        .number()
        .optional()
        .describe("Proposal nonce (default: random unix timestamp)"),
      voting_period: z
        .number()
        .optional()
        .describe("Optional custom voting period in seconds (0 for default)"),
    },
    withToolErrorResponse(
      async ({
        proposer_agent_pda,
        proposal_type,
        title,
        description,
        payload_hex,
        nonce,
        voting_period,
      }) => {
        const { program, keypair } = await getSigningProgram();
        const proposerAgentPda = new PublicKey(proposer_agent_pda);

        const titleHash = new Uint8Array(
          createHash("sha256").update(title).digest(),
        );
        const descriptionHash = new Uint8Array(
          createHash("sha256").update(description).digest(),
        );

        let payload = new Uint8Array(64);
        if (payload_hex) {
          const cleanHex = payload_hex.replace(/^0x/, "");
          if (cleanHex.length <= 128 && /^[0-9a-fA-F]*$/.test(cleanHex)) {
            const buf = Buffer.from(cleanHex, "hex");
            payload.set(buf.subarray(0, 64));
          } else {
            const enc = new TextEncoder().encode(payload_hex);
            payload.set(enc.subarray(0, 64));
          }
        }

        const proposalNonce = nonce ?? Math.floor(Date.now() / 1000);

        const { proposalPda, txSignature } = await createProposal(
          getConnection(),
          program as any,
          keypair,
          {
            proposerAgentPda,
            nonce: proposalNonce,
            proposalType: proposal_type,
            titleHash,
            descriptionHash,
            payload,
            votingPeriod: voting_period,
          },
        );

        return toolTextResponse(
          [
            "Governance proposal created successfully.",
            `Proposal PDA: ${proposalPda.toBase58()}`,
            `Nonce: ${proposalNonce}`,
            `Transaction Signature: ${txSignature}`,
          ].join("\n"),
        );
      },
    ),
  );

  // --------------------------------------------------------------------------
  // Vote Proposal
  // --------------------------------------------------------------------------
  server.tool(
    "agenc_vote_proposal",
    "Cast a vote (for or against) on an active governance proposal",
    {
      proposal_pda: z.string().describe("Proposal account PDA (base58)"),
      voter_agent_pda: z.string().describe("Voter agent PDA (base58)"),
      approve: z.boolean().describe("True to vote in favor, false to vote against"),
    },
    withToolErrorResponse(async ({ proposal_pda, voter_agent_pda, approve }) => {
      const { program, keypair } = await getSigningProgram();
      const proposalPda = new PublicKey(proposal_pda);
      const voterAgentPda = new PublicKey(voter_agent_pda);

      const { txSignature, votePda } = await voteProposal(
        getConnection(),
        program as any,
        keypair,
        proposalPda,
        voterAgentPda,
        approve,
      );

      return toolTextResponse(
        [
          `Vote cast successfully (${approve ? "APPROVE" : "REJECT"}).`,
          `Vote PDA: ${votePda.toBase58()}`,
          `Transaction Signature: ${txSignature}`,
        ].join("\n"),
      );
    }),
  );

  // --------------------------------------------------------------------------
  // Execute Proposal
  // --------------------------------------------------------------------------
  server.tool(
    "agenc_execute_proposal",
    "Execute an approved governance proposal whose execution delay has elapsed",
    {
      proposal_pda: z.string().describe("Proposal account PDA (base58)"),
      treasury: z.string().optional().describe("Treasury PDA (if required)"),
      recipient: z
        .string()
        .optional()
        .describe("Recipient public key (for treasury spend proposals)"),
    },
    withToolErrorResponse(async ({ proposal_pda, treasury, recipient }) => {
      const { program, keypair } = await getSigningProgram();
      const proposalPda = new PublicKey(proposal_pda);
      const treasuryPk = treasury ? new PublicKey(treasury) : undefined;
      const recipientPk = recipient ? new PublicKey(recipient) : undefined;

      const { txSignature } = await executeProposal(
        getConnection(),
        program as any,
        keypair,
        proposalPda,
        treasuryPk,
        recipientPk,
      );

      return toolTextResponse(
        [
          "Proposal executed successfully.",
          `Proposal PDA: ${proposalPda.toBase58()}`,
          `Transaction Signature: ${txSignature}`,
        ].join("\n"),
      );
    }),
  );

  // --------------------------------------------------------------------------
  // Cancel Proposal
  // --------------------------------------------------------------------------
  server.tool(
    "agenc_cancel_proposal",
    "Cancel an active proposal (proposer only)",
    {
      proposal_pda: z.string().describe("Proposal account PDA (base58)"),
    },
    withToolErrorResponse(async ({ proposal_pda }) => {
      const { program, keypair } = await getSigningProgram();
      const proposalPda = new PublicKey(proposal_pda);

      const { txSignature } = await cancelProposal(
        getConnection(),
        program as any,
        keypair,
        proposalPda,
      );

      return toolTextResponse(
        [
          "Proposal cancelled successfully.",
          `Proposal PDA: ${proposalPda.toBase58()}`,
          `Transaction Signature: ${txSignature}`,
        ].join("\n"),
      );
    }),
  );

  // --------------------------------------------------------------------------
  // Get Proposal
  // --------------------------------------------------------------------------
  server.tool(
    "agenc_get_proposal",
    "Get full details and voting metrics for a governance proposal",
    {
      proposal_pda: z.string().describe("Proposal account PDA (base58)"),
    },
    withToolErrorResponse(async ({ proposal_pda }) => {
      const program = getReadOnlyProgram();
      const proposalPda = new PublicKey(proposal_pda);
      const account = await (program.account as any).proposal.fetch(proposalPda);

      return toolTextResponse(
        formatProposalAccount(account as Record<string, unknown>, proposalPda),
      );
    }),
  );

  // --------------------------------------------------------------------------
  // Get Governance Config
  // --------------------------------------------------------------------------
  server.tool(
    "agenc_get_governance_config",
    "Get global governance parameters (voting period, execution delay, quorum bps, approval threshold bps)",
    {},
    withToolErrorResponse(async () => {
      const program = getReadOnlyProgram();
      const [configPda] = deriveGovernanceConfigPda(getCurrentProgramId());
      const account = await (program.account as any).governanceConfig.fetch(
        configPda,
      );

      const votingPeriod = Number(account.votingPeriod ?? 0);
      const executionDelay = Number(account.executionDelay ?? 0);
      const quorumBps = Number(account.quorumBps ?? 0);
      const approvalThresholdBps = Number(account.approvalThresholdBps ?? 0);
      const minProposalStake = safeBigInt(account.minProposalStake);

      const lines = [
        "Governance Config PDA: " + configPda.toBase58(),
        "Authority: " + safePubkey(account.authority),
        "Voting Period: " + votingPeriod + "s (" + (votingPeriod / 3600).toFixed(1) + "h)",
        "Execution Delay: " + executionDelay + "s (" + (executionDelay / 3600).toFixed(1) + "h)",
        "Quorum: " + quorumBps + " bps (" + (quorumBps / 100).toFixed(2) + "%)",
        "Approval Threshold: " + approvalThresholdBps + " bps (" + (approvalThresholdBps / 100).toFixed(2) + "%)",
        "Min Proposal Stake: " + formatSol(minProposalStake),
        "Total Proposals: " + safeBigInt(account.proposalCount ?? 0).toString(),
      ];

      return toolTextResponse(lines.join("\n"));
    }),
  );
}
