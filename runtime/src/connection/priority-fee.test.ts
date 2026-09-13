import { describe, it, expect, vi } from "vitest";
import { PublicKey } from "@solana/web3.js";
import {
  calculatePercentile,
  estimatePriorityFee,
  createComputeBudgetInstructions,
  DEFAULT_PRIORITY_FEE_CONFIG,
} from "./priority-fee.js";

describe("priority-fee", () => {
  describe("calculatePercentile", () => {
    it("returns 0 for empty array", () => {
      expect(calculatePercentile([], 75)).toBe(0);
    });

    it("returns exact value for single element array", () => {
      expect(calculatePercentile([5000], 50)).toBe(5000);
      expect(calculatePercentile([5000], 90)).toBe(5000);
    });

    it("calculates accurate 50th, 75th, and 90th percentiles", () => {
      const fees = [1000, 2000, 3000, 4000, 5000, 6000, 7000, 8000, 9000, 10000];
      // 50th percentile: index 4 -> 5000
      expect(calculatePercentile(fees, 50)).toBe(5000);
      // 75th percentile: index 6 -> 7000
      expect(calculatePercentile(fees, 75)).toBe(7000);
      // 90th percentile: index 8 -> 9000
      expect(calculatePercentile(fees, 90)).toBe(9000);
    });
  });

  describe("estimatePriorityFee", () => {
    it("returns clamped default when RPC returns empty array", async () => {
      const mockConn = {
        getRecentPrioritizationFees: vi.fn().mockResolvedValue([]),
      } as unknown as import("@solana/web3.js").Connection;

      const fee = await estimatePriorityFee(mockConn);
      expect(fee).toBe(DEFAULT_PRIORITY_FEE_CONFIG.defaultMicroLamports);
    });

    it("returns clamped default when RPC call throws", async () => {
      const mockConn = {
        getRecentPrioritizationFees: vi.fn().mockRejectedValue(new Error("RPC timeout")),
      } as unknown as import("@solana/web3.js").Connection;

      const fee = await estimatePriorityFee(mockConn);
      expect(fee).toBe(DEFAULT_PRIORITY_FEE_CONFIG.defaultMicroLamports);
    });

    it("calculates 75th percentile from non-zero prioritization fees", async () => {
      const mockConn = {
        getRecentPrioritizationFees: vi.fn().mockResolvedValue([
          { slot: 100, prioritizationFee: 0 },
          { slot: 101, prioritizationFee: 10_000 },
          { slot: 102, prioritizationFee: 20_000 },
          { slot: 103, prioritizationFee: 30_000 },
          { slot: 104, prioritizationFee: 40_000 },
        ]),
      } as unknown as import("@solana/web3.js").Connection;

      const fee = await estimatePriorityFee(mockConn);
      // Non-zero pool: [10000, 20000, 30000, 40000], 75th percentile -> 30000
      expect(fee).toBe(30_000);
    });

    it("enforces min and max micro-lamports clamps", async () => {
      const mockConnLow = {
        getRecentPrioritizationFees: vi.fn().mockResolvedValue([
          { slot: 100, prioritizationFee: 50 },
        ]),
      } as unknown as import("@solana/web3.js").Connection;

      const lowFee = await estimatePriorityFee(mockConnLow, undefined, {
        minMicroLamports: 2_000,
      });
      expect(lowFee).toBe(2_000);

      const mockConnHigh = {
        getRecentPrioritizationFees: vi.fn().mockResolvedValue([
          { slot: 100, prioritizationFee: 10_000_000 },
        ]),
      } as unknown as import("@solana/web3.js").Connection;

      const highFee = await estimatePriorityFee(mockConnHigh, undefined, {
        maxMicroLamports: 100_000,
      });
      expect(highFee).toBe(100_000);
    });

    it("passes accounts filter to getRecentPrioritizationFees", async () => {
      const targetAccount = new PublicKey("11111111111111111111111111111111");
      const mockGetFees = vi.fn().mockResolvedValue([{ slot: 100, prioritizationFee: 12_000 }]);
      const mockConn = {
        getRecentPrioritizationFees: mockGetFees,
      } as unknown as import("@solana/web3.js").Connection;

      await estimatePriorityFee(mockConn, [targetAccount]);
      expect(mockGetFees).toHaveBeenCalledWith({ lockedWritableAccounts: [targetAccount] });
    });
  });

  describe("createComputeBudgetInstructions", () => {
    it("creates both CU limit and CU price instructions when both provided", () => {
      const ixs = createComputeBudgetInstructions({
        computeUnits: 150_000,
        microLamports: 25_000,
      });

      expect(ixs.length).toBe(2);
      expect(ixs[0].programId.toBase58()).toBe("ComputeBudget111111111111111111111111111111");
      expect(ixs[1].programId.toBase58()).toBe("ComputeBudget111111111111111111111111111111");
    });

    it("creates only CU limit when microLamports is 0 or undefined", () => {
      const ixs = createComputeBudgetInstructions({ computeUnits: 80_000 });
      expect(ixs.length).toBe(1);
    });

    it("creates only CU price when computeUnits is 0 or undefined", () => {
      const ixs = createComputeBudgetInstructions({ microLamports: 10_000 });
      expect(ixs.length).toBe(1);
    });
  });
});
