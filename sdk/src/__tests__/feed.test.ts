import { describe, expect, it, vi } from "vitest";
import { Connection, Keypair, PublicKey, SystemProgram } from "@solana/web3.js";
import type { Program } from "@coral-xyz/anchor";
import {
  deriveFeedPostPda,
  deriveFeedVotePda,
  encodeTopic,
  decodeTopic,
  postToFeed,
  upvotePost,
  fetchFeedPost,
  fetchFeedVote,
  fetchFeedPostsByTopic,
} from "../feed";
import { PROGRAM_ID, SEEDS, RECOMMENDED_CU_POST_TO_FEED, RECOMMENDED_CU_UPVOTE_POST } from "../constants";

describe("feed module", () => {
  it("encodes and decodes topic strings losslessly with normalization", () => {
    const topic = "  #Research-DeFi  ";
    const encoded = encodeTopic(topic);
    expect(encoded.length).toBe(32);
    const decoded = decodeTopic(encoded);
    expect(decoded).toBe("#research-defi");

    // Byte array input
    const rawBytes = new Uint8Array(32).fill(42);
    const encodedRaw = encodeTopic(rawBytes);
    expect(encodedRaw).toEqual(rawBytes);
  });

  it("PDA derivations match manual seeds", () => {
    const authorAgentPda = Keypair.generate().publicKey;
    const nonce = new Uint8Array(32).fill(7);
    const postPda = deriveFeedPostPda(authorAgentPda, nonce, PROGRAM_ID);

    const [expectedPost] = PublicKey.findProgramAddressSync(
      [SEEDS.POST, authorAgentPda.toBuffer(), Buffer.from(nonce)],
      PROGRAM_ID,
    );
    expect(postPda.equals(expectedPost)).toBe(true);

    const voterAgentPda = Keypair.generate().publicKey;
    const votePda = deriveFeedVotePda(postPda, voterAgentPda, PROGRAM_ID);
    const [expectedVote] = PublicKey.findProgramAddressSync(
      [SEEDS.UPVOTE, postPda.toBuffer(), voterAgentPda.toBuffer()],
      PROGRAM_ID,
    );
    expect(votePda.equals(expectedVote)).toBe(true);
  });

  it("postToFeed invokes on-chain instruction with correct accounts and CU budget", async () => {
    const rpc = vi.fn().mockResolvedValue("post-sig-123");
    const signers = vi.fn().mockReturnValue({ rpc });
    const preInstructions = vi.fn().mockReturnValue({ signers });
    const accountsPartial = vi.fn().mockReturnValue({ preInstructions });
    const postToFeedMethod = vi.fn().mockReturnValue({ accountsPartial });

    const program = {
      programId: PROGRAM_ID,
      methods: { postToFeed: postToFeedMethod },
    } as unknown as Program;

    const confirmTransaction = vi.fn().mockResolvedValue(undefined);
    const connection = { confirmTransaction } as unknown as Connection;

    const authority = Keypair.generate();
    const authorAgentId = new Uint8Array(32).fill(1);
    const contentHash = new Uint8Array(32).fill(2);
    const nonce = new Uint8Array(32).fill(3);
    const parentPost = Keypair.generate().publicKey;

    const result = await postToFeed(
      connection,
      program,
      authority,
      authorAgentId,
      {
        contentHash,
        nonce,
        topic: "announcements",
        parentPost,
      },
    );

    expect(postToFeedMethod).toHaveBeenCalledOnce();
    const args = postToFeedMethod.mock.calls[0];
    expect(args[0]).toEqual(Array.from(contentHash));
    expect(args[1]).toEqual(Array.from(nonce));
    expect(args[2]).toEqual(Array.from(encodeTopic("announcements")));
    expect(args[3]).toEqual(parentPost);

    expect(accountsPartial).toHaveBeenCalledWith(
      expect.objectContaining({
        authority: authority.publicKey,
        systemProgram: SystemProgram.programId,
      }),
    );
    expect(confirmTransaction).toHaveBeenCalledWith("post-sig-123", "confirmed");
    expect(result.txSignature).toBe("post-sig-123");
  });

  it("upvotePost invokes on-chain upvote instruction with correct accounts and CU budget", async () => {
    const rpc = vi.fn().mockResolvedValue("upvote-sig-456");
    const signers = vi.fn().mockReturnValue({ rpc });
    const preInstructions = vi.fn().mockReturnValue({ signers });
    const accountsPartial = vi.fn().mockReturnValue({ preInstructions });
    const upvotePostMethod = vi.fn().mockReturnValue({ accountsPartial });

    const program = {
      programId: PROGRAM_ID,
      methods: { upvotePost: upvotePostMethod },
    } as unknown as Program;

    const confirmTransaction = vi.fn().mockResolvedValue(undefined);
    const connection = { confirmTransaction } as unknown as Connection;

    const authority = Keypair.generate();
    const voterAgentId = new Uint8Array(32).fill(4);
    const postPda = Keypair.generate().publicKey;

    const result = await upvotePost(
      connection,
      program,
      authority,
      voterAgentId,
      postPda,
    );

    expect(upvotePostMethod).toHaveBeenCalledOnce();
    expect(accountsPartial).toHaveBeenCalledWith(
      expect.objectContaining({
        post: postPda,
        authority: authority.publicKey,
        systemProgram: SystemProgram.programId,
      }),
    );
    expect(confirmTransaction).toHaveBeenCalledWith("upvote-sig-456", "confirmed");
    expect(result.txSignature).toBe("upvote-sig-456");
  });

  it("fetchFeedPost parses account layout correctly", async () => {
    const postPda = Keypair.generate().publicKey;
    const author = Keypair.generate().publicKey;
    const contentHash = Array.from(new Uint8Array(32).fill(5));
    const topic = Array.from(encodeTopic("governance"));
    const nonce = Array.from(new Uint8Array(32).fill(6));

    const fetchNullable = vi.fn().mockResolvedValue({
      author,
      contentHash,
      topic,
      parentPost: null,
      nonce,
      upvoteCount: 42,
      createdAt: 1726000000,
      bump: 254,
    });

    const program = {
      programId: PROGRAM_ID,
      account: {
        feedPost: { fetchNullable },
      },
    } as unknown as Program;

    const postState = await fetchFeedPost(program, postPda);
    expect(postState).not.toBeNull();
    expect(postState?.author).toEqual(author);
    expect(postState?.topicString).toBe("governance");
    expect(postState?.upvoteCount).toBe(42);
    expect(postState?.createdAt).toBe(1726000000);
  });
});
