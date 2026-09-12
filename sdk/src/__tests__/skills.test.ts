import { describe, expect, it, vi } from "vitest";
import { Connection, Keypair, PublicKey, SystemProgram } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import type { Program } from "@coral-xyz/anchor";
import {
  deriveSkillPda,
  deriveSkillRatingPda,
  deriveSkillPurchasePda,
  registerSkill,
  updateSkill,
  purchaseSkill,
  rateSkill,
  fetchSkill,
  fetchSkillRating,
  fetchPurchaseRecord,
} from "../skills";
import { PROGRAM_ID, SEEDS } from "../constants";

describe("skills module", () => {
  it("PDA derivations match manual seeds", () => {
    const authorAgentPda = Keypair.generate().publicKey;
    const skillId = new Uint8Array(32).fill(1);
    const [skillPda] = deriveSkillPda(authorAgentPda, skillId, PROGRAM_ID);

    const [expectedSkill] = PublicKey.findProgramAddressSync(
      [SEEDS.SKILL, authorAgentPda.toBuffer(), Buffer.from(skillId)],
      PROGRAM_ID,
    );
    expect(skillPda.equals(expectedSkill)).toBe(true);

    const raterAgentPda = Keypair.generate().publicKey;
    const [ratingPda] = deriveSkillRatingPda(skillPda, raterAgentPda, PROGRAM_ID);
    const [expectedRating] = PublicKey.findProgramAddressSync(
      [SEEDS.SKILL_RATING, skillPda.toBuffer(), raterAgentPda.toBuffer()],
      PROGRAM_ID,
    );
    expect(ratingPda.equals(expectedRating)).toBe(true);

    const buyerAgentPda = Keypair.generate().publicKey;
    const [purchasePda] = deriveSkillPurchasePda(skillPda, buyerAgentPda, PROGRAM_ID);
    const [expectedPurchase] = PublicKey.findProgramAddressSync(
      [SEEDS.SKILL_PURCHASE, skillPda.toBuffer(), buyerAgentPda.toBuffer()],
      PROGRAM_ID,
    );
    expect(purchasePda.equals(expectedPurchase)).toBe(true);
  });

  it("registerSkill submits transaction with correct accounts and arguments", async () => {
    const rpc = vi.fn().mockResolvedValue("reg-sig");
    const signers = vi.fn().mockReturnValue({ rpc });
    const accountsPartial = vi.fn().mockReturnValue({ signers });
    const registerSkillMethod = vi.fn().mockReturnValue({ accountsPartial });

    const program = {
      programId: PROGRAM_ID,
      methods: { registerSkill: registerSkillMethod },
    } as unknown as Program;

    const confirmTransaction = vi.fn().mockResolvedValue(undefined);
    const connection = { confirmTransaction } as unknown as Connection;

    const authority = Keypair.generate();
    const authorAgentPda = Keypair.generate().publicKey;
    const skillId = new Uint8Array(32).fill(2);
    const name = new Uint8Array(32).fill(3);
    const contentHash = new Uint8Array(32).fill(4);
    const tags = new Uint8Array(64).fill(5);

    const result = await registerSkill(
      connection,
      program,
      authority,
      authorAgentPda,
      {
        skillId,
        name,
        contentHash,
        price: 50_000n,
        tags,
      },
    );

    expect(registerSkillMethod).toHaveBeenCalledOnce();
    const args = registerSkillMethod.mock.calls[0];
    expect(args[3].toString()).toBe("50000"); // price BN
    expect(args[4]).toBeNull(); // priceMint

    expect(accountsPartial).toHaveBeenCalledWith(
      expect.objectContaining({
        author: authorAgentPda,
        authority: authority.publicKey,
        systemProgram: SystemProgram.programId,
      }),
    );
    expect(confirmTransaction).toHaveBeenCalledWith("reg-sig", "confirmed");
    expect(result.txSignature).toBe("reg-sig");
  });

  it("updateSkill updates content hash, price and active status", async () => {
    const rpc = vi.fn().mockResolvedValue("update-sig");
    const signers = vi.fn().mockReturnValue({ rpc });
    const accountsPartial = vi.fn().mockReturnValue({ signers });
    const updateSkillMethod = vi.fn().mockReturnValue({ accountsPartial });

    const program = {
      programId: PROGRAM_ID,
      methods: { updateSkill: updateSkillMethod },
    } as unknown as Program;

    const confirmTransaction = vi.fn().mockResolvedValue(undefined);
    const connection = { confirmTransaction } as unknown as Connection;

    const authority = Keypair.generate();
    const authorAgentPda = Keypair.generate().publicKey;
    const skillId = new Uint8Array(32).fill(2);
    const contentHash = new Uint8Array(32).fill(9);

    const result = await updateSkill(
      connection,
      program,
      authority,
      authorAgentPda,
      skillId,
      {
        contentHash,
        price: 75_000n,
        isActive: true,
      },
    );

    expect(updateSkillMethod).toHaveBeenCalledOnce();
    const args = updateSkillMethod.mock.calls[0];
    expect(args[1].toString()).toBe("75000");
    expect(args[3]).toBe(true);
    expect(result.txSignature).toBe("update-sig");
  });

  it("purchaseSkill supports both native SOL and SPL token routes", async () => {
    const rpc = vi.fn().mockResolvedValue("purchase-sig");
    const signers = vi.fn().mockReturnValue({ rpc });
    const accountsPartial = vi.fn().mockReturnValue({ signers });
    const purchaseSkillMethod = vi.fn().mockReturnValue({ accountsPartial });

    const program = {
      programId: PROGRAM_ID,
      methods: { purchaseSkill: purchaseSkillMethod },
    } as unknown as Program;

    const confirmTransaction = vi.fn().mockResolvedValue(undefined);
    const connection = { confirmTransaction } as unknown as Connection;

    const authority = Keypair.generate();
    const buyerAgentPda = Keypair.generate().publicKey;
    const skillPda = Keypair.generate().publicKey;
    const authorAgent = Keypair.generate().publicKey;
    const authorWallet = Keypair.generate().publicKey;
    const treasury = Keypair.generate().publicKey;

    // 1. SOL route
    const solResult = await purchaseSkill(
      connection,
      program,
      authority,
      buyerAgentPda,
      skillPda,
      {
        maxPrice: 100_000n,
        authorAgent,
        authorWallet,
        treasury,
      },
    );
    expect(solResult.txSignature).toBe("purchase-sig");
    expect(accountsPartial).toHaveBeenLastCalledWith(
      expect.objectContaining({
        priceMint: null,
        tokenProgram: null,
      }),
    );

    // 2. Token route
    const priceMint = Keypair.generate().publicKey;
    const buyerTokenAccount = Keypair.generate().publicKey;
    const authorTokenAccount = Keypair.generate().publicKey;
    const treasuryTokenAccount = Keypair.generate().publicKey;

    await purchaseSkill(
      connection,
      program,
      authority,
      buyerAgentPda,
      skillPda,
      {
        maxPrice: 200_000n,
        authorAgent,
        authorWallet,
        treasury,
        priceMint,
        buyerTokenAccount,
        authorTokenAccount,
        treasuryTokenAccount,
      },
    );

    expect(accountsPartial).toHaveBeenLastCalledWith(
      expect.objectContaining({
        priceMint,
        buyerTokenAccount,
        authorTokenAccount,
        treasuryTokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
      }),
    );
  });

  it("rateSkill submits rating and optional review hash", async () => {
    const rpc = vi.fn().mockResolvedValue("rate-sig");
    const signers = vi.fn().mockReturnValue({ rpc });
    const accountsPartial = vi.fn().mockReturnValue({ signers });
    const rateSkillMethod = vi.fn().mockReturnValue({ accountsPartial });

    const program = {
      programId: PROGRAM_ID,
      methods: { rateSkill: rateSkillMethod },
    } as unknown as Program;

    const confirmTransaction = vi.fn().mockResolvedValue(undefined);
    const connection = { confirmTransaction } as unknown as Connection;

    const authority = Keypair.generate();
    const raterAgentPda = Keypair.generate().publicKey;
    const skillPda = Keypair.generate().publicKey;
    const purchaseRecordPda = Keypair.generate().publicKey;
    const reviewHash = new Uint8Array(32).fill(8);

    const result = await rateSkill(
      connection,
      program,
      authority,
      raterAgentPda,
      skillPda,
      purchaseRecordPda,
      {
        rating: 5,
        reviewHash,
      },
    );

    expect(rateSkillMethod).toHaveBeenCalledWith(5, Array.from(reviewHash));
    expect(result.txSignature).toBe("rate-sig");
  });

  it("fetch helpers return parsed state or null", async () => {
    const mockSkillData = {
      author: Keypair.generate().publicKey,
      skillId: Array.from(new Uint8Array(32).fill(1)),
      name: Array.from(new Uint8Array(32).fill(2)),
      contentHash: Array.from(new Uint8Array(32).fill(3)),
      price: 1000n,
      priceMint: null,
      tags: Array.from(new Uint8Array(64).fill(4)),
      totalRating: 5n,
      ratingCount: 1,
      downloadCount: 10,
      version: 1,
      isActive: true,
      createdAt: 100n,
      updatedAt: 200n,
      bump: 254,
    };

    const program = {
      account: {
        skillRegistration: {
          fetchNullable: vi.fn().mockResolvedValue(mockSkillData),
        },
        skillRating: {
          fetchNullable: vi.fn().mockResolvedValue(null),
        },
        purchaseRecord: {
          fetchNullable: vi.fn().mockResolvedValue(null),
        },
      },
    } as unknown as Program;

    const skillPda = Keypair.generate().publicKey;
    const skill = await fetchSkill(program, skillPda);
    expect(skill).not.toBeNull();
    expect(skill?.price).toBe(1000n);
    expect(skill?.isActive).toBe(true);

    const rating = await fetchSkillRating(program, skillPda);
    expect(rating).toBeNull();

    const purchase = await fetchPurchaseRecord(program, skillPda);
    expect(purchase).toBeNull();
  });
});
