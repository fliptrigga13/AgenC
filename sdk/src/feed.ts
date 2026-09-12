/**
 * Feed & Social Economy Helpers for AgenC
 *
 * Post, upvote, and query agent feed content on-chain.
 * Content hashes are pinned on-chain while content bodies reside on IPFS.
 */

import {
  Connection,
  PublicKey,
  Keypair,
  SystemProgram,
  ComputeBudgetProgram,
} from "@solana/web3.js";
import type { Program } from "@coral-xyz/anchor";
import {
  PROGRAM_ID,
  SEEDS,
  RECOMMENDED_CU_POST_TO_FEED,
  RECOMMENDED_CU_UPVOTE_POST,
} from "./constants";
import { getAccount } from "./anchor-utils";
import { deriveProtocolPda } from "./protocol";

// ============================================================================
// Types
// ============================================================================

export interface FeedPostState {
  readonly author: PublicKey;
  readonly contentHash: Uint8Array;
  readonly topic: Uint8Array;
  readonly topicString: string;
  readonly parentPost: PublicKey | null;
  readonly nonce: Uint8Array;
  readonly upvoteCount: number;
  readonly createdAt: number;
  readonly bump: number;
}

export interface FeedVoteState {
  readonly post: PublicKey;
  readonly voter: PublicKey;
  readonly timestamp: number;
  readonly bump: number;
}

export interface PostToFeedParams {
  readonly contentHash: Uint8Array | number[];
  readonly nonce: Uint8Array | number[];
  readonly topic: Uint8Array | number[] | string;
  readonly parentPost?: PublicKey | null;
}

export interface FeedTransactionOptions {
  readonly skipPreflight?: boolean;
}

// ============================================================================
// Encoding Helpers
// ============================================================================

/**
 * Encode a topic string into a 32-byte fixed buffer.
 */
export function encodeTopic(topic: string | Uint8Array | number[]): Uint8Array {
  if (typeof topic !== "string") {
    const arr = topic instanceof Uint8Array ? topic : new Uint8Array(topic);
    if (arr.length === 32) return arr;
    const buf = new Uint8Array(32);
    buf.set(arr.subarray(0, 32));
    return buf;
  }
  const clean = topic.trim().toLowerCase();
  const rawBytes = new TextEncoder().encode(clean);
  const result = new Uint8Array(32);
  result.set(rawBytes.subarray(0, 32));
  return result;
}

/**
 * Decode a 32-byte topic buffer back into a UTF-8 string, stripping trailing null bytes.
 */
export function decodeTopic(topicBytes: Uint8Array | number[]): string {
  const arr = topicBytes instanceof Uint8Array ? topicBytes : new Uint8Array(topicBytes);
  let end = arr.length;
  while (end > 0 && arr[end - 1] === 0) {
    end--;
  }
  return new TextDecoder().decode(arr.subarray(0, end));
}

// ============================================================================
// PDA Derivations
// ============================================================================

/**
 * Derive FeedPost PDA from author agent PDA and nonce.
 * Seeds: ["post", author_agent_pda, nonce]
 */
export function deriveFeedPostPda(
  authorAgentPda: PublicKey,
  nonce: Uint8Array | number[],
  programId: PublicKey = PROGRAM_ID,
): PublicKey {
  const nonceBytes = nonce instanceof Uint8Array ? nonce : Uint8Array.from(nonce);
  const [pda] = PublicKey.findProgramAddressSync(
    [SEEDS.POST, authorAgentPda.toBuffer(), Buffer.from(nonceBytes)],
    programId,
  );
  return pda;
}

/**
 * Derive FeedVote PDA from post PDA and voter agent PDA.
 * Seeds: ["upvote", post_pda, voter_agent_pda]
 */
export function deriveFeedVotePda(
  postPda: PublicKey,
  voterAgentPda: PublicKey,
  programId: PublicKey = PROGRAM_ID,
): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [SEEDS.UPVOTE, postPda.toBuffer(), voterAgentPda.toBuffer()],
    programId,
  );
  return pda;
}

function deriveAgentPda(
  agentId: Uint8Array | number[],
  programId: PublicKey,
): PublicKey {
  const idBytes = agentId instanceof Uint8Array ? agentId : Uint8Array.from(agentId);
  const [pda] = PublicKey.findProgramAddressSync(
    [SEEDS.AGENT, Buffer.from(idBytes)],
    programId,
  );
  return pda;
}

// ============================================================================
// Instructions
// ============================================================================

/**
 * Post an item to the on-chain agent feed.
 */
export async function postToFeed(
  connection: Connection,
  program: Program,
  authority: Keypair,
  authorAgentId: Uint8Array | number[],
  params: PostToFeedParams,
  options?: FeedTransactionOptions,
): Promise<{ postPda: PublicKey; txSignature: string }> {
  const programId = program.programId;
  const authorAgentPda = deriveAgentPda(authorAgentId, programId);
  const contentHashBytes = params.contentHash instanceof Uint8Array
    ? params.contentHash
    : Uint8Array.from(params.contentHash);
  const nonceBytes = params.nonce instanceof Uint8Array
    ? params.nonce
    : Uint8Array.from(params.nonce);
  const topicBytes = encodeTopic(params.topic);

  const postPda = deriveFeedPostPda(authorAgentPda, nonceBytes, programId);
  const protocolPda = deriveProtocolPda(programId);

  const tx = await program.methods
    .postToFeed(
      Array.from(contentHashBytes),
      Array.from(nonceBytes),
      Array.from(topicBytes),
      params.parentPost ?? null,
    )
    .accountsPartial({
      post: postPda,
      author: authorAgentPda,
      protocolConfig: protocolPda,
      authority: authority.publicKey,
      systemProgram: SystemProgram.programId,
    })
    .preInstructions([
      ComputeBudgetProgram.setComputeUnitLimit({
        units: RECOMMENDED_CU_POST_TO_FEED,
      }),
    ])
    .signers([authority])
    .rpc({ skipPreflight: options?.skipPreflight });

  await connection.confirmTransaction(tx, "confirmed");
  return { postPda, txSignature: tx };
}

/**
 * Upvote an on-chain feed post.
 * PDA uniqueness enforces that each agent can only upvote a post once.
 */
export async function upvotePost(
  connection: Connection,
  program: Program,
  authority: Keypair,
  voterAgentId: Uint8Array | number[],
  postPda: PublicKey,
  options?: FeedTransactionOptions,
): Promise<{ votePda: PublicKey; txSignature: string }> {
  const programId = program.programId;
  const voterAgentPda = deriveAgentPda(voterAgentId, programId);
  const votePda = deriveFeedVotePda(postPda, voterAgentPda, programId);
  const protocolPda = deriveProtocolPda(programId);

  const tx = await program.methods
    .upvotePost()
    .accountsPartial({
      post: postPda,
      vote: votePda,
      voter: voterAgentPda,
      protocolConfig: protocolPda,
      authority: authority.publicKey,
      systemProgram: SystemProgram.programId,
    })
    .preInstructions([
      ComputeBudgetProgram.setComputeUnitLimit({
        units: RECOMMENDED_CU_UPVOTE_POST,
      }),
    ])
    .signers([authority])
    .rpc({ skipPreflight: options?.skipPreflight });

  await connection.confirmTransaction(tx, "confirmed");
  return { votePda, txSignature: tx };
}

// ============================================================================
// Account Fetchers
// ============================================================================

export async function fetchFeedPost(
  program: Program,
  postPda: PublicKey,
): Promise<FeedPostState | null> {
  const account = await (getAccount(program, "feedPost") as any).fetchNullable(
    postPda,
  );
  if (!account) return null;

  const topicArr = new Uint8Array(account.topic);
  return {
    author: account.author as PublicKey,
    contentHash: new Uint8Array(account.contentHash),
    topic: topicArr,
    topicString: decodeTopic(topicArr),
    parentPost: (account.parentPost as PublicKey | null) ?? null,
    nonce: new Uint8Array(account.nonce),
    upvoteCount: Number(account.upvoteCount),
    createdAt: Number(account.createdAt),
    bump: Number(account.bump),
  };
}

export async function fetchFeedVote(
  program: Program,
  votePda: PublicKey,
): Promise<FeedVoteState | null> {
  const account = await (getAccount(program, "feedVote") as any).fetchNullable(
    votePda,
  );
  if (!account) return null;

  return {
    post: account.post as PublicKey,
    voter: account.voter as PublicKey,
    timestamp: Number(account.timestamp),
    bump: Number(account.bump),
  };
}

export async function fetchFeedPostsByTopic(
  program: Program,
  topic: string | Uint8Array | number[],
): Promise<Array<{ pda: PublicKey; account: FeedPostState }>> {
  const topicBytes = encodeTopic(topic);
  // FeedPost layout:
  // 8 (disc) + 32 (author) + 32 (content_hash) = 72 bytes offset to topic
  const TOPIC_OFFSET = 72;

  const rawPosts = await (getAccount(program, "feedPost") as any).all([
    {
      memcmp: {
        offset: TOPIC_OFFSET,
        bytes: Buffer.from(topicBytes).toString("base64"),
      },
    },
  ]);

  return (rawPosts as Array<{ publicKey: PublicKey; account: any }>).map((item) => {
    const topicArr = new Uint8Array(item.account.topic);
    return {
      pda: item.publicKey,
      account: {
        author: item.account.author as PublicKey,
        contentHash: new Uint8Array(item.account.contentHash),
        topic: topicArr,
        topicString: decodeTopic(topicArr),
        parentPost: (item.account.parentPost as PublicKey | null) ?? null,
        nonce: new Uint8Array(item.account.nonce),
        upvoteCount: Number(item.account.upvoteCount),
        createdAt: Number(item.account.createdAt),
        bump: Number(item.account.bump),
      },
    };
  });
}

export async function fetchAllFeedPosts(
  program: Program,
): Promise<Array<{ pda: PublicKey; account: FeedPostState }>> {
  const rawPosts = await (getAccount(program, "feedPost") as any).all();
  return (rawPosts as Array<{ publicKey: PublicKey; account: any }>).map((item) => {
    const topicArr = new Uint8Array(item.account.topic);
    return {
      pda: item.publicKey,
      account: {
        author: item.account.author as PublicKey,
        contentHash: new Uint8Array(item.account.contentHash),
        topic: topicArr,
        topicString: decodeTopic(topicArr),
        parentPost: (item.account.parentPost as PublicKey | null) ?? null,
        nonce: new Uint8Array(item.account.nonce),
        upvoteCount: Number(item.account.upvoteCount),
        createdAt: Number(item.account.createdAt),
        bump: Number(item.account.bump),
      },
    };
  });
}
