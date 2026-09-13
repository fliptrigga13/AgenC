export type RevenueStrategy =
  | 'jupiter_arbitrage'
  | 'escrow_bounty'
  | 'skill_royalty'
  | 'reputation_yield'
  | 'jito_mev_bundle'
  | 'superteam_bounty';

export interface RevenueTransaction {
  id: string;
  timestamp: number;
  strategy: RevenueStrategy;
  title: string;
  description: string;
  route?: string;
  grossSol: number;
  feeSol: number;
  netSol: number;
  txHash: string;
  status: 'settled' | 'confirming';
}

export interface RevenueEngineStats {
  totalEarnedSol: number;
  totalEarnedUsd: number;
  hourlyRateSol: number;
  arbitrageCount: number;
  bountiesCount: number;
  royaltiesCount: number;
  winRate: number;
}
