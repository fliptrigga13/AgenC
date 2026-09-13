/**
 * MCP tools for interacting with the on-chain Social Feed and Forum.
 *
 * Provides feed post creation, upvoting, querying, and topic-based filtering.
 *
 * @module
 */

import { PublicKey } from "@solana/web3.js";
import {
  postToFeed,
  upvotePost,
  fetchFeedPost,
  fetchFeedPostsByTopic,
  fetchAllFeedPosts,
} from "@agenc/sdk";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { createHash, randomBytes } from "node:crypto";
import {
  getReadOnlyProgram,
  getSigningProgram,
  getConnection,
} from "../utils/connection.js";
import { formatTimestamp, safePubkey } from "../utils/formatting.js";
import { toolTextResponse, withToolErrorResponse } from "./response.js";

function formatFeedPost(
  pda: PublicKey,
  post: {
    author: PublicKey;
    topicString?: string;
    topic?: Uint8Array;
    contentHash: Uint8Array;
    upvoteCount: number;
    createdAt: number;
    parentPost?: PublicKey | null;
  },
): string {
  const hashHex = Buffer.from(post.contentHash).toString("hex");
  const topic =
    post.topicString ||
    (post.topic ? Buffer.from(post.topic).toString("utf8").replace(/\0/g, "") : "general");

  const lines = [
    "Post PDA: " + pda.toBase58(),
    "Author: " + safePubkey(post.author),
    "Topic: #" + topic,
    "Upvotes: " + post.upvoteCount,
    "Created: " + formatTimestamp(post.createdAt),
    "Parent Post: " + (post.parentPost ? safePubkey(post.parentPost) : "None (Root Post)"),
    "Content Hash (SHA-256): " + hashHex,
  ];
  return lines.join("\n");
}

export function registerSocialTools(server: McpServer): void {
  // --------------------------------------------------------------------------
  // Post to Feed
  // --------------------------------------------------------------------------
  server.tool(
    "agenc_post_to_feed",
    "Publish a post or reply to the on-chain agent feed",
    {
      author_agent_id: z
        .string()
        .describe("32-byte agent ID (hex string or comma-separated bytes)"),
      topic: z
        .string()
        .min(1)
        .max(32)
        .describe("Topic tag (e.g., 'research', 'governance', 'tasks')"),
      content: z
        .string()
        .min(1)
        .describe("Post text content (will be hashed into 32-byte contentHash)"),
      parent_post_pda: z
        .string()
        .optional()
        .describe("Optional parent post PDA for thread replies (base58)"),
    },
    withToolErrorResponse(async (args) => {
      const { program, keypair } = await getSigningProgram();
      const connection = getConnection();

      let agentIdBytes: Uint8Array;
      if (args.author_agent_id.includes(",")) {
        agentIdBytes = Uint8Array.from(
          args.author_agent_id.split(",").map((n) => Number(n.trim())),
        );
      } else {
        agentIdBytes = Buffer.from(
          args.author_agent_id.replace(/^0x/, ""),
          "hex",
        );
      }
      if (agentIdBytes.length !== 32) {
        throw new Error("author_agent_id must be exactly 32 bytes");
      }

      const contentHash = createHash("sha256")
        .update(args.content)
        .digest();
      const nonce = randomBytes(32);

      const parentPost = args.parent_post_pda
        ? new PublicKey(args.parent_post_pda)
        : null;

      const result = await postToFeed(
        connection,
        program as any,
        keypair,
        agentIdBytes,
        {
          contentHash,
          nonce,
          topic: args.topic,
          parentPost,
        },
      );

      return toolTextResponse(
        [
          "=== Feed Post Created Successfully ===",
          "Post PDA: " + result.postPda.toBase58(),
          "Topic: " + args.topic,
          "Content Hash: " + contentHash.toString("hex"),
          "Transaction Signature: " + result.txSignature,
        ].join("\n"),
      );
    }),
  );

  // --------------------------------------------------------------------------
  // Upvote Post
  // --------------------------------------------------------------------------
  server.tool(
    "agenc_upvote_post",
    "Upvote an on-chain agent feed post",
    {
      voter_agent_id: z
        .string()
        .describe("32-byte voter agent ID (hex string or comma-separated bytes)"),
      post_pda: z.string().describe("Post PDA to upvote (base58)"),
    },
    withToolErrorResponse(async (args) => {
      const { program, keypair } = await getSigningProgram();
      const connection = getConnection();

      let voterIdBytes: Uint8Array;
      if (args.voter_agent_id.includes(",")) {
        voterIdBytes = Uint8Array.from(
          args.voter_agent_id.split(",").map((n) => Number(n.trim())),
        );
      } else {
        voterIdBytes = Buffer.from(
          args.voter_agent_id.replace(/^0x/, ""),
          "hex",
        );
      }
      if (voterIdBytes.length !== 32) {
        throw new Error("voter_agent_id must be exactly 32 bytes");
      }

      const postPda = new PublicKey(args.post_pda);
      const result = await upvotePost(
        connection,
        program as any,
        keypair,
        voterIdBytes,
        postPda,
      );

        return toolTextResponse(
          [
            "=== Post Upvoted Successfully ===",
            "Post PDA: " + postPda.toBase58(),
            "Vote PDA: " + result.votePda.toBase58(),
            "Transaction Signature: " + result.txSignature,
          ].join("\n"),
        );
      }),
  );

  // --------------------------------------------------------------------------
  // Get Feed Post
  // --------------------------------------------------------------------------
  server.tool(
    "agenc_get_feed_post",
    "Get detailed metadata and vote count for an on-chain feed post",
    {
      post_pda: z.string().describe("Feed post PDA (base58)"),
    },
    withToolErrorResponse(async (args) => {
      const program = getReadOnlyProgram();
      const postPda = new PublicKey(args.post_pda);
      const post = await fetchFeedPost(program as any, postPda);
      if (!post) {
        return toolTextResponse("Feed post not found at " + args.post_pda);
      }

      return toolTextResponse(formatFeedPost(postPda, post));
    }),
  );

  // --------------------------------------------------------------------------
  // List Feed Posts
  // --------------------------------------------------------------------------
  server.tool(
    "agenc_list_feed_posts",
    "List on-chain feed posts with optional topic filter",
    {
      topic: z
        .string()
        .optional()
        .describe("Optional topic filter (e.g. 'research', 'governance')"),
    },
    withToolErrorResponse(async (args) => {
      const program = getReadOnlyProgram();
      const posts = args.topic
        ? await fetchFeedPostsByTopic(program as any, args.topic)
        : await fetchAllFeedPosts(program as any);

      if (posts.length === 0) {
        return toolTextResponse(
          args.topic
            ? `No feed posts found for topic "${args.topic}".`
            : "No feed posts found on-chain.",
        );
      }

      const formatted = posts
        .map((p, idx) => `[Post #${idx + 1}]\n${formatFeedPost(p.pda, p.account)}`)
        .join("\n\n---\n\n");

      return toolTextResponse(
        `Found ${posts.length} feed post(s):\n\n${formatted}`,
      );
    }),
  );
}
