/**
 * Dynamic Solana priority fee estimator and compute budget utilities.
 *
 * Fetches recent prioritization fees from the network, computes percentile-based
 * fee bids to ensure fast transaction landing during congestion, and constructs
 * ComputeBudgetProgram instructions.
 *
 * @module
 */

import {
  ComputeBudgetProgram,
  type Connection,
  type PublicKey,
  type TransactionInstruction,
} from "@solana/web3.js";

export interface PriorityFeeConfig {
  /** Percentile (0 to 100) of recent priority fees to target. Default: 75 */
  readonly percentile?: number;
  /** Minimum fee floor in micro-lamports. Default: 1,000 (0.000001 SOL per 1M CU) */
  readonly minMicroLamports?: number;
  /** Maximum fee ceiling in micro-lamports. Default: 500,000 (0.0005 SOL per 1M CU) */
  readonly maxMicroLamports?: number;
  /** Fallback fee when network returns no recent data. Default: 5,000 */
  readonly defaultMicroLamports?: number;
}

export const DEFAULT_PRIORITY_FEE_CONFIG: Required<PriorityFeeConfig> = {
  percentile: 75,
  minMicroLamports: 1_000,
  maxMicroLamports: 500_000,
  defaultMicroLamports: 5_000,
};

/**
 * Computes a target percentile value from an array of numbers.
 *
 * @param values - Array of fee values
 * @param percentile - Target percentile between 0 and 100
 */
export function calculatePercentile(values: number[], percentile: number): number {
  if (values.length === 0) {
    return 0;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const clampedPercentile = Math.max(0, Math.min(100, percentile));
  const index = Math.floor((clampedPercentile / 100) * (sorted.length - 1));
  return sorted[index] ?? 0;
}

/**
 * Estimates dynamic priority fees (in micro-lamports per compute unit)
 * by querying `getRecentPrioritizationFees` from the active RPC connection.
 *
 * @param connection - Active Solana connection
 * @param accounts - Optional public keys for specific writable accounts to sample fees for
 * @param config - Optional configuration overrides
 * @returns Priority fee in micro-lamports, clamped between min and max bounds
 */
export async function estimatePriorityFee(
  connection: Connection,
  accounts?: PublicKey[],
  config?: PriorityFeeConfig,
): Promise<number> {
  const mergedConfig: Required<PriorityFeeConfig> = {
    ...DEFAULT_PRIORITY_FEE_CONFIG,
    ...config,
  };

  try {
    const recentFees = await connection.getRecentPrioritizationFees(
      accounts && accounts.length > 0
        ? { lockedWritableAccounts: accounts }
        : undefined,
    );

    if (!recentFees || recentFees.length === 0) {
      return clampFee(mergedConfig.defaultMicroLamports, mergedConfig);
    }

    // Filter out 0-fee slots if we have non-zero fees, or keep if all are zero
    const nonZeroFees = recentFees
      .map((f) => f.prioritizationFee)
      .filter((fee) => typeof fee === "number" && !isNaN(fee) && fee > 0);

    const feePool = nonZeroFees.length > 0 ? nonZeroFees : recentFees.map((f) => f.prioritizationFee);
    const estimated = calculatePercentile(feePool, mergedConfig.percentile);

    const finalFee = estimated > 0 ? estimated : mergedConfig.defaultMicroLamports;
    return clampFee(finalFee, mergedConfig);
  } catch {
    // If RPC call fails, return safe default within clamp range
    return clampFee(mergedConfig.defaultMicroLamports, mergedConfig);
  }
}

function clampFee(fee: number, config: Required<PriorityFeeConfig>): number {
  return Math.max(config.minMicroLamports, Math.min(config.maxMicroLamports, Math.round(fee)));
}

/**
 * Creates ComputeBudgetProgram instructions for compute unit limit and priority price.
 *
 * @param options - Compute unit limit and/or priority fee price
 * @returns Array of 1 or 2 TransactionInstructions
 */
export function createComputeBudgetInstructions(options: {
  computeUnits?: number;
  microLamports?: number;
}): TransactionInstruction[] {
  const instructions: TransactionInstruction[] = [];

  if (typeof options.computeUnits === "number" && options.computeUnits > 0) {
    instructions.push(
      ComputeBudgetProgram.setComputeUnitLimit({
        units: options.computeUnits,
      }),
    );
  }

  if (typeof options.microLamports === "number" && options.microLamports > 0) {
    instructions.push(
      ComputeBudgetProgram.setComputeUnitPrice({
        microLamports: options.microLamports,
      }),
    );
  }

  return instructions;
}
