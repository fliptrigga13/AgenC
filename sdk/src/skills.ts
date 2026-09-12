/**
 * Skills module — PDA helpers, types, and CU budget constants.
 */

import { Connection, Keypair, PublicKey, SystemProgram } from "@solana/web3.js";
import anchor, { type Program } from "@coral-xyz/anchor";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { PROGRAM_ID, SEEDS } from "./constants.js";
import { getAccount } from "./anchor-utils.js";
import { deriveProtocolPda } from "./protocol.js";
import { toBigInt, toNumber } from "./utils/numeric.js";

// ============================================================================
// PDA helpers
// ============================================================================

export function deriveSkillPda(
  authorAgentPda: PublicKey,
  skillId: Uint8Array | Buffer,
  programId: PublicKey = PROGRAM_ID,
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [SEEDS.SKILL, authorAgentPda.toBuffer(), Buffer.from(skillId)],
    programId,
  );
}

export function deriveSkillRatingPda(
  skillPda: PublicKey,
  raterAgentPda: PublicKey,
  programId: PublicKey = PROGRAM_ID,
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [SEEDS.SKILL_RATING, skillPda.toBuffer(), raterAgentPda.toBuffer()],
    programId,
  );
}

export function deriveSkillPurchasePda(
  skillPda: PublicKey,
  buyerAgentPda: PublicKey,
  programId: PublicKey = PROGRAM_ID,
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [SEEDS.SKILL_PURCHASE, skillPda.toBuffer(), buyerAgentPda.toBuffer()],
    programId,
  );
}

// ============================================================================
// Compute unit budgets
// ============================================================================

/** CU budget for register_skill instruction */
export const RECOMMENDED_CU_REGISTER_SKILL = 50_000;

/** CU budget for update_skill instruction */
export const RECOMMENDED_CU_UPDATE_SKILL = 30_000;

/** CU budget for rate_skill instruction */
export const RECOMMENDED_CU_RATE_SKILL = 40_000;

/** CU budget for purchase_skill instruction (SOL path) */
export const RECOMMENDED_CU_PURCHASE_SKILL = 60_000;

/** CU budget for purchase_skill instruction (SPL token path) */
export const RECOMMENDED_CU_PURCHASE_SKILL_TOKEN = 100_000;

// ============================================================================
// Types
// ============================================================================

export interface RegisterSkillParams {
  skillId: Uint8Array;
  name: Uint8Array;
  contentHash: Uint8Array;
  price: bigint;
  priceMint?: PublicKey;
  tags: Uint8Array;
}

export interface UpdateSkillParams {
  contentHash: Uint8Array;
  price: bigint;
  tags?: Uint8Array;
  isActive?: boolean;
}

export interface RateSkillParams {
  rating: number;
  reviewHash?: Uint8Array;
}

export interface SkillState {
  author: PublicKey;
  skillId: Uint8Array;
  name: Uint8Array;
  contentHash: Uint8Array;
  price: bigint;
  priceMint: PublicKey | null;
  tags: Uint8Array;
  totalRating: bigint;
  ratingCount: number;
  downloadCount: number;
  version: number;
  isActive: boolean;
  createdAt: bigint;
  updatedAt: bigint;
  bump: number;
}

export interface SkillRatingState {
  skill: PublicKey;
  rater: PublicKey;
  rating: number;
  reviewHash: Uint8Array | null;
  raterReputation: number;
  timestamp: bigint;
  bump: number;
}

export interface PurchaseRecordState {
  skill: PublicKey;
  buyer: PublicKey;
  pricePaid: bigint;
  timestamp: bigint;
  bump: number;
}

export interface PurchaseSkillParams {
  maxPrice: bigint;
  authorAgent: PublicKey;
  authorWallet: PublicKey;
  treasury: PublicKey;
  priceMint?: PublicKey | null;
  buyerTokenAccount?: PublicKey | null;
  authorTokenAccount?: PublicKey | null;
  treasuryTokenAccount?: PublicKey | null;
  tokenProgram?: PublicKey | null;
}

export interface SkillTransactionOptions {
  skipPreflight?: boolean;
}

// ============================================================================
// Instruction Execution Helpers
// ============================================================================

export async function registerSkill(
  connection: Connection,
  program: Program,
  authority: Keypair,
  authorAgentPda: PublicKey,
  params: RegisterSkillParams,
  options?: SkillTransactionOptions,
): Promise<{ skillPda: PublicKey; txSignature: string }> {
  if (params.price < 0n) {
    throw new Error("Skill price must be non-negative");
  }
  const programId = program.programId;
  const [skillPda] = deriveSkillPda(authorAgentPda, params.skillId, programId);
  const protocolPda = deriveProtocolPda(programId);

  const tx = await program.methods
    .registerSkill(
      Array.from(params.skillId),
      Array.from(params.name),
      Array.from(params.contentHash),
      new anchor.BN(params.price.toString()),
      params.priceMint ?? null,
      Array.from(params.tags),
    )
    .accountsPartial({
      skill: skillPda,
      author: authorAgentPda,
      protocolConfig: protocolPda,
      authority: authority.publicKey,
      systemProgram: SystemProgram.programId,
    })
    .signers([authority])
    .rpc({ skipPreflight: options?.skipPreflight });

  await connection.confirmTransaction(tx, "confirmed");
  return { skillPda, txSignature: tx };
}

export async function updateSkill(
  connection: Connection,
  program: Program,
  authority: Keypair,
  authorAgentPda: PublicKey,
  skillId: Uint8Array | Buffer,
  params: UpdateSkillParams,
  options?: SkillTransactionOptions,
): Promise<{ skillPda: PublicKey; txSignature: string }> {
  if (params.price < 0n) {
    throw new Error("Skill price must be non-negative");
  }
  const programId = program.programId;
  const [skillPda] = deriveSkillPda(authorAgentPda, skillId, programId);
  const protocolPda = deriveProtocolPda(programId);

  const tags = params.tags
    ? Array.from(params.tags)
    : Array.from(new Uint8Array(64));
  const isActive = params.isActive ?? true;

  const tx = await program.methods
    .updateSkill(
      Array.from(params.contentHash),
      new anchor.BN(params.price.toString()),
      tags,
      isActive,
    )
    .accountsPartial({
      skill: skillPda,
      author: authorAgentPda,
      protocolConfig: protocolPda,
      authority: authority.publicKey,
    })
    .signers([authority])
    .rpc({ skipPreflight: options?.skipPreflight });

  await connection.confirmTransaction(tx, "confirmed");
  return { skillPda, txSignature: tx };
}

export async function purchaseSkill(
  connection: Connection,
  program: Program,
  authority: Keypair,
  buyerAgentPda: PublicKey,
  skillPda: PublicKey,
  params: PurchaseSkillParams,
  options?: SkillTransactionOptions,
): Promise<{ purchasePda: PublicKey; txSignature: string }> {
  if (params.maxPrice < 0n) {
    throw new Error("Skill maxPrice must be non-negative");
  }
  const programId = program.programId;
  const [purchasePda] = deriveSkillPurchasePda(
    skillPda,
    buyerAgentPda,
    programId,
  );
  const protocolPda = deriveProtocolPda(programId);
  const isToken = Boolean(params.priceMint);

  const tx = await program.methods
    .purchaseSkill(new anchor.BN(params.maxPrice.toString()))
    .accountsPartial({
      skill: skillPda,
      purchaseRecord: purchasePda,
      buyer: buyerAgentPda,
      authorAgent: params.authorAgent,
      authorWallet: params.authorWallet,
      protocolConfig: protocolPda,
      treasury: params.treasury,
      authority: authority.publicKey,
      systemProgram: SystemProgram.programId,
      priceMint: params.priceMint ?? null,
      buyerTokenAccount: params.buyerTokenAccount ?? null,
      authorTokenAccount: params.authorTokenAccount ?? null,
      treasuryTokenAccount: params.treasuryTokenAccount ?? null,
      tokenProgram: isToken ? (params.tokenProgram ?? TOKEN_PROGRAM_ID) : null,
    } as any)
    .signers([authority])
    .rpc({ skipPreflight: options?.skipPreflight });

  await connection.confirmTransaction(tx, "confirmed");
  return { purchasePda, txSignature: tx };
}

export async function rateSkill(
  connection: Connection,
  program: Program,
  authority: Keypair,
  raterAgentPda: PublicKey,
  skillPda: PublicKey,
  purchaseRecordPda: PublicKey,
  params: RateSkillParams,
  options?: SkillTransactionOptions,
): Promise<{ ratingPda: PublicKey; txSignature: string }> {
  if (
    !Number.isInteger(params.rating) ||
    params.rating < 1 ||
    params.rating > 5
  ) {
    throw new Error("Rating must be an integer between 1 and 5");
  }
  const programId = program.programId;
  const [ratingPda] = deriveSkillRatingPda(
    skillPda,
    raterAgentPda,
    programId,
  );
  const protocolPda = deriveProtocolPda(programId);
  const reviewHash = params.reviewHash
    ? Array.from(params.reviewHash)
    : null;

  const tx = await program.methods
    .rateSkill(params.rating, reviewHash)
    .accountsPartial({
      skill: skillPda,
      ratingAccount: ratingPda,
      rater: raterAgentPda,
      purchaseRecord: purchaseRecordPda,
      protocolConfig: protocolPda,
      authority: authority.publicKey,
      systemProgram: SystemProgram.programId,
    })
    .signers([authority])
    .rpc({ skipPreflight: options?.skipPreflight });

  await connection.confirmTransaction(tx, "confirmed");
  return { ratingPda, txSignature: tx };
}

// ============================================================================
// Fetch Helpers
// ============================================================================

export async function fetchSkill(
  program: Program,
  skillPda: PublicKey,
): Promise<SkillState | null> {
  const account = await (
    getAccount(program, "skillRegistration") as any
  ).fetchNullable(skillPda);
  if (!account) return null;
  return {
    author: account.author as PublicKey,
    skillId: new Uint8Array(account.skillId),
    name: new Uint8Array(account.name),
    contentHash: new Uint8Array(account.contentHash),
    price: toBigInt(account.price),
    priceMint: (account.priceMint as PublicKey | null) ?? null,
    tags: new Uint8Array(account.tags),
    totalRating: toBigInt(account.totalRating),
    ratingCount: toNumber(account.ratingCount),
    downloadCount: toNumber(account.downloadCount),
    version: toNumber(account.version),
    isActive: Boolean(account.isActive),
    createdAt: toBigInt(account.createdAt),
    updatedAt: toBigInt(account.updatedAt),
    bump: toNumber(account.bump),
  };
}

export async function fetchSkillRating(
  program: Program,
  ratingPda: PublicKey,
): Promise<SkillRatingState | null> {
  const account = await (
    getAccount(program, "skillRating") as any
  ).fetchNullable(ratingPda);
  if (!account) return null;
  return {
    skill: account.skill as PublicKey,
    rater: account.rater as PublicKey,
    rating: toNumber(account.rating),
    reviewHash: account.reviewHash ? new Uint8Array(account.reviewHash) : null,
    raterReputation: toNumber(account.raterReputation),
    timestamp: toBigInt(account.timestamp),
    bump: toNumber(account.bump),
  };
}

export async function fetchPurchaseRecord(
  program: Program,
  purchasePda: PublicKey,
): Promise<PurchaseRecordState | null> {
  const account = await (
    getAccount(program, "purchaseRecord") as any
  ).fetchNullable(purchasePda);
  if (!account) return null;
  return {
    skill: account.skill as PublicKey,
    buyer: account.buyer as PublicKey,
    pricePaid: toBigInt(account.pricePaid),
    timestamp: toBigInt(account.timestamp),
    bump: toNumber(account.bump),
  };
}
