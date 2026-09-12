/**
 * MCP tools for interacting with the on-chain Skill Marketplace.
 *
 * @module
 */

import { PublicKey } from "@solana/web3.js";
import {
  deriveSkillPda,
  deriveSkillPurchasePda,
  deriveProtocolPda,
  registerSkill,
  updateSkill,
  purchaseSkill,
  rateSkill,
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

function parseHexOrStringTo32Bytes(val: string): Uint8Array {
  const trimmed = val.trim();
  if (/^[0-9a-fA-F]{64}$/.test(trimmed)) {
    return new Uint8Array(Buffer.from(trimmed, "hex"));
  }
  const hash = createHash("sha256").update(trimmed).digest();
  return new Uint8Array(hash);
}

function stringToPaddedBytes(str: string, length: number): Uint8Array {
  const enc = new TextEncoder();
  const bytes = enc.encode(str);
  const result = new Uint8Array(length);
  result.set(bytes.subarray(0, length));
  return result;
}

function formatSkillAccount(
  account: Record<string, unknown>,
  pda: PublicKey,
): string {
  const skillId = account.skillId as Uint8Array | number[];
  const idHex = Buffer.from(
    skillId instanceof Uint8Array ? skillId : new Uint8Array(skillId),
  ).toString("hex");

  const nameBytes = account.name as Uint8Array | number[];
  const nameStr = Buffer.from(
    nameBytes instanceof Uint8Array ? nameBytes : new Uint8Array(nameBytes),
  )
    .toString("utf-8")
    .replace(/\0+$/, "");

  const contentHash = account.contentHash as Uint8Array | number[];
  const hashHex = Buffer.from(
    contentHash instanceof Uint8Array
      ? contentHash
      : new Uint8Array(contentHash),
  ).toString("hex");

  const tagsBytes = account.tags as Uint8Array | number[];
  const tagsStr = Buffer.from(
    tagsBytes instanceof Uint8Array ? tagsBytes : new Uint8Array(tagsBytes),
  )
    .toString("utf-8")
    .replace(/\0+$/, "");

  const price = safeBigInt(account.price);
  const ratingCount = Number(account.ratingCount ?? 0);
  const totalRating = Number(account.totalRating ?? 0);
  const avgRating =
    ratingCount > 0 ? (totalRating / ratingCount).toFixed(2) : "0.00";

  const lines = [
    "Skill PDA: " + pda.toBase58(),
    "Skill ID: " + idHex,
    "Name: " + (nameStr || "Unnamed"),
    "Author: " + safePubkey(account.author),
    "Active: " + (Boolean(account.isActive) ? "Yes" : "No"),
    "Version: " + (account.version ?? 1),
    "",
    "--- Marketplace ---",
    "Price: " + (price === 0n ? "Free" : formatSol(price)),
    "Price Mint: " +
      (account.priceMint ? safePubkey(account.priceMint) : "Native SOL"),
    "Tags: " + (tagsStr || "None"),
    "Content Hash: " + hashHex,
    "",
    "--- Performance ---",
    "Rating: " + avgRating + " / 5 (" + ratingCount + " ratings)",
    "Downloads: " + (account.downloadCount ?? 0),
    "",
    "--- Timestamps ---",
    "Created: " + formatTimestamp(Number(account.createdAt ?? 0)),
    "Updated: " + formatTimestamp(Number(account.updatedAt ?? 0)),
  ];

  return lines.join("\n");
}

export function registerSkillTools(server: McpServer): void {
  // --------------------------------------------------------------------------
  // Register Skill
  // --------------------------------------------------------------------------
  server.tool(
    "agenc_register_skill",
    "Register a new skill in the on-chain skill marketplace",
    {
      author_agent_pda: z.string().describe("Author agent PDA (base58)"),
      name: z.string().describe("Human-readable skill name (max 32 chars)"),
      content_hash: z
        .string()
        .describe("SHA-256 hex content hash or raw content string to hash"),
      skill_id: z
        .string()
        .optional()
        .describe(
          "Optional skill ID (64-char hex or string). Defaults to content_hash",
        ),
      price_lamports: z
        .union([z.number(), z.string()])
        .optional()
        .describe("Price in lamports (default: 0 for free)"),
      price_mint: z
        .string()
        .optional()
        .describe("Optional SPL token mint public key"),
      tags: z
        .string()
        .optional()
        .describe("Comma-separated tags (max 64 bytes)"),
    },
    withToolErrorResponse(
      async ({
        author_agent_pda,
        name,
        content_hash,
        skill_id,
        price_lamports,
        price_mint,
        tags,
      }) => {
        const { program, keypair } = await getSigningProgram();
        const authorAgentPda = new PublicKey(author_agent_pda);

        const contentHashBytes = parseHexOrStringTo32Bytes(content_hash);
        const skillIdBytes = skill_id
          ? parseHexOrStringTo32Bytes(skill_id)
          : contentHashBytes;
        const nameBytes = stringToPaddedBytes(name, 32);
        const tagsBytes = stringToPaddedBytes(tags ?? "", 64);
        const price = price_lamports ? BigInt(price_lamports.toString()) : 0n;
        const priceMint = price_mint ? new PublicKey(price_mint) : undefined;

        const { skillPda, txSignature } = await registerSkill(
          getConnection(),
          program as any,
          keypair,
          authorAgentPda,
          {
            skillId: skillIdBytes,
            name: nameBytes,
            contentHash: contentHashBytes,
            price,
            priceMint,
            tags: tagsBytes,
          },
        );

        return toolTextResponse(
          [
            "Skill registered successfully on-chain.",
            `Skill PDA: ${skillPda.toBase58()}`,
            `Transaction Signature: ${txSignature}`,
          ].join("\n"),
        );
      },
    ),
  );

  // --------------------------------------------------------------------------
  // Update Skill
  // --------------------------------------------------------------------------
  server.tool(
    "agenc_update_skill",
    "Update an existing skill in the on-chain marketplace",
    {
      author_agent_pda: z.string().describe("Author agent PDA (base58)"),
      skill_id: z.string().describe("Skill ID (64-char hex or string)"),
      content_hash: z.string().describe("New content hash (hex or string)"),
      price_lamports: z
        .union([z.number(), z.string()])
        .describe("Updated price in lamports"),
      tags: z
        .string()
        .optional()
        .describe("Updated comma-separated tags (max 64 bytes)"),
      is_active: z
        .boolean()
        .optional()
        .describe("Whether the skill is active (default: true)"),
    },
    withToolErrorResponse(
      async ({
        author_agent_pda,
        skill_id,
        content_hash,
        price_lamports,
        tags,
        is_active,
      }) => {
        const { program, keypair } = await getSigningProgram();
        const authorAgentPda = new PublicKey(author_agent_pda);
        const skillIdBytes = parseHexOrStringTo32Bytes(skill_id);
        const contentHashBytes = parseHexOrStringTo32Bytes(content_hash);
        const tagsBytes = tags ? stringToPaddedBytes(tags, 64) : undefined;
        const price = BigInt(price_lamports.toString());

        const { skillPda, txSignature } = await updateSkill(
          getConnection(),
          program as any,
          keypair,
          authorAgentPda,
          skillIdBytes,
          {
            contentHash: contentHashBytes,
            price,
            tags: tagsBytes,
            isActive: is_active ?? true,
          },
        );

        return toolTextResponse(
          [
            "Skill updated successfully on-chain.",
            `Skill PDA: ${skillPda.toBase58()}`,
            `Transaction Signature: ${txSignature}`,
          ].join("\n"),
        );
      },
    ),
  );

  // --------------------------------------------------------------------------
  // Rate Skill
  // --------------------------------------------------------------------------
  server.tool(
    "agenc_rate_skill",
    "Rate a purchased skill in the on-chain marketplace (1-5 stars)",
    {
      skill_pda: z.string().describe("Skill account PDA (base58)"),
      rater_agent_pda: z.string().describe("Rater agent PDA (base58)"),
      rating: z
        .number()
        .int()
        .min(1)
        .max(5)
        .describe("Rating value (1 to 5)"),
      review: z.string().optional().describe("Optional review text to hash"),
    },
    withToolErrorResponse(
      async ({ skill_pda, rater_agent_pda, rating, review }) => {
        const { program, keypair } = await getSigningProgram();
        const skillPda = new PublicKey(skill_pda);
        const raterAgentPda = new PublicKey(rater_agent_pda);

        const [purchaseRecordPda] = deriveSkillPurchasePda(
          skillPda,
          raterAgentPda,
          getCurrentProgramId(),
        );

        const reviewHash = review
          ? new Uint8Array(createHash("sha256").update(review).digest())
          : undefined;

        const { ratingPda, txSignature } = await rateSkill(
          getConnection(),
          program as any,
          keypair,
          raterAgentPda,
          skillPda,
          purchaseRecordPda,
          {
            rating,
            reviewHash,
          },
        );

        return toolTextResponse(
          [
            "Skill rated successfully on-chain.",
            `Rating PDA: ${ratingPda.toBase58()}`,
            `Transaction Signature: ${txSignature}`,
          ].join("\n"),
        );
      },
    ),
  );

  // --------------------------------------------------------------------------
  // Purchase Skill
  // --------------------------------------------------------------------------
  server.tool(
    "agenc_purchase_skill",
    "Purchase a skill on-chain to record entitlement and unlock download",
    {
      skill_pda: z.string().describe("Skill account PDA (base58)"),
      buyer_agent_pda: z.string().describe("Buyer agent PDA (base58)"),
      max_price_lamports: z
        .union([z.number(), z.string()])
        .describe("Maximum price in lamports willing to pay"),
      author_agent_pda: z.string().describe("Author agent PDA (base58)"),
      author_wallet: z
        .string()
        .describe("Author wallet address for payout (base58)"),
      treasury: z
        .string()
        .optional()
        .describe("Protocol treasury PDA (optional, derived if not provided)"),
    },
    withToolErrorResponse(
      async ({
        skill_pda,
        buyer_agent_pda,
        max_price_lamports,
        author_agent_pda,
        author_wallet,
        treasury,
      }) => {
        const { program, keypair } = await getSigningProgram();
        const skillPda = new PublicKey(skill_pda);
        const buyerAgentPda = new PublicKey(buyer_agent_pda);
        const authorAgent = new PublicKey(author_agent_pda);
        const authorWallet = new PublicKey(author_wallet);
        const treasuryPk = treasury
          ? new PublicKey(treasury)
          : deriveProtocolPda(getCurrentProgramId());

        const maxPrice = BigInt(max_price_lamports.toString());

        const { purchasePda, txSignature } = await purchaseSkill(
          getConnection(),
          program as any,
          keypair,
          buyerAgentPda,
          skillPda,
          {
            maxPrice,
            authorAgent,
            authorWallet,
            treasury: treasuryPk,
          },
        );

        return toolTextResponse(
          [
            "Skill purchased successfully on-chain.",
            `Purchase Record PDA: ${purchasePda.toBase58()}`,
            `Transaction Signature: ${txSignature}`,
          ].join("\n"),
        );
      },
    ),
  );

  // --------------------------------------------------------------------------
  // Get Skill
  // --------------------------------------------------------------------------
  server.tool(
    "agenc_get_skill",
    "Get skill account state by PDA or by author agent PDA and skill ID",
    {
      skill_pda: z.string().optional().describe("Skill PDA (base58)"),
      author_agent_pda: z
        .string()
        .optional()
        .describe("Author agent PDA (base58)"),
      skill_id: z
        .string()
        .optional()
        .describe("Skill ID (64-char hex or string)"),
    },
    withToolErrorResponse(async ({ skill_pda, author_agent_pda, skill_id }) => {
      let pda: PublicKey;
      if (skill_pda) {
        pda = new PublicKey(skill_pda);
      } else if (author_agent_pda && skill_id) {
        const author = new PublicKey(author_agent_pda);
        const idBytes = parseHexOrStringTo32Bytes(skill_id);
        [pda] = deriveSkillPda(author, idBytes, getCurrentProgramId());
      } else {
        return toolTextResponse(
          "Error: provide either skill_pda or both author_agent_pda and skill_id",
        );
      }

      const program = getReadOnlyProgram();
      const account = await (program.account as any).skill.fetch(pda);
      return toolTextResponse(
        formatSkillAccount(account as Record<string, unknown>, pda),
      );
    }),
  );

  // --------------------------------------------------------------------------
  // List Skills
  // --------------------------------------------------------------------------
  server.tool(
    "agenc_list_skills",
    "List skills in the on-chain marketplace with optional author filtering",
    {
      author_agent_pda: z
        .string()
        .optional()
        .describe("Optional author agent PDA to filter by"),
      limit: z
        .number()
        .int()
        .min(1)
        .max(100)
        .optional()
        .describe("Maximum skills to return (default: 20)"),
    },
    withToolErrorResponse(async ({ author_agent_pda, limit = 20 }) => {
      const program = getReadOnlyProgram();
      const filters = author_agent_pda
        ? [
            {
              memcmp: {
                offset: 8, // after discriminator
                bytes: new PublicKey(author_agent_pda).toBase58(),
              },
            },
          ]
        : [];

      const accounts = await (program.account as any).skill.all(filters);
      if (accounts.length === 0) {
        return toolTextResponse("No skills found.");
      }

      const items = accounts.slice(0, limit).map(({ publicKey, account }: any) => {
        return formatSkillAccount(account, publicKey);
      });

      return toolTextResponse(
        `Found ${accounts.length} skill(s) (showing up to ${limit}):\n\n` +
          items.join("\n\n" + "=".repeat(40) + "\n\n"),
      );
    }),
  );
}
