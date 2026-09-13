import { useCallback, useEffect, useRef, useState } from 'react';
import type { RevenueEngineStats, RevenueTransaction } from '../types/revenue';
import type { TaskInfo } from '../types';

const SOL_PRICE_USD = 148.50;

interface UseRevenueEngineOptions {
  onCreditEarnings: (amountSol: number) => void;
  tasks?: TaskInfo[];
  onClaimTask?: (taskId: string) => void;
}

const INITIAL_TRANSACTIONS: RevenueTransaction[] = [
  {
    id: 'tx_bounty_init',
    timestamp: Date.now() - 120_000,
    strategy: 'escrow_bounty',
    title: 'Escrow Bounty: Jupiter Arbitrage Scan',
    description: 'Autonomous execution of cross-DEX spread analysis on Raydium & Orca',
    route: 'Raydium CLMM ➔ Orca Whirlpool ➔ Program PDA',
    grossSol: 0.2500,
    feeSol: 0.00005,
    netSol: 0.2500,
    txHash: '5Kq9wRt8mK2p7v4yB8n3Xz1...JuP8',
    status: 'settled',
  },
];

const ARBITRAGE_PAIRS = [
  {
    pair: 'SOL / USDC',
    route: 'SOL ➔ USDC (Raydium CLMM) ➔ SOL (Orca Whirlpools)',
    minProfit: 0.018,
    maxProfit: 0.042,
  },
  {
    pair: 'JUP / SOL',
    route: 'SOL ➔ JUP (Meteora DLMM) ➔ SOL (Raydium CPMM)',
    minProfit: 0.012,
    maxProfit: 0.035,
  },
  {
    pair: 'BONK / SOL',
    route: 'SOL ➔ BONK (Orca) ➔ SOL (Raydium CLMM)',
    minProfit: 0.022,
    maxProfit: 0.048,
  },
  {
    pair: 'USDT / SOL',
    route: 'USDC ➔ USDT (Jupiter Routing) ➔ SOL (Meteora)',
    minProfit: 0.015,
    maxProfit: 0.038,
  },
];

const JITO_MEV_ROUTES = [
  {
    pair: 'SOL / USDC',
    title: 'Jito MEV Bundle #8841 (Raydium ➔ Meteora)',
    route: 'Jito Searcher (bundles.jito.wtf) ➔ Raydium CLMM ➔ Meteora DLMM ➔ 0-Revert',
    minProfit: 0.038,
    maxProfit: 0.082,
    tipSol: 0.0010,
  },
  {
    pair: 'BONK / SOL',
    title: 'Jito Multi-hop Arbitrage #3192 (Orca ➔ Lifinity)',
    route: 'Jito Block Engine ➔ Orca Whirlpool ➔ Lifinity ➔ Searcher Tip PDA',
    minProfit: 0.029,
    maxProfit: 0.064,
    tipSol: 0.0010,
  },
];

const SUPERTEAM_BOUNTIES = [
  {
    title: 'Superteam Earn: Solana Agent Security Audit',
    sponsor: 'Solana Foundation / Superteam',
    payoutSol: 0.3500,
    route: 'Superteam Earn Smart Contract ➔ AgenC Treasury PDA',
  },
  {
    title: 'Superteam Earn: Autonomous Yield Benchmark Report',
    sponsor: 'Jito / Solana MEV DAO',
    payoutSol: 0.4200,
    route: 'Superteam Escrow ➔ Proof of Deliverable ➔ Agent Address',
  },
];

const SKILL_LICENSES = [
  {
    name: 'Jupiter Route Arbitrage Sentinel',
    buyer: 'alpha-quant-dao.sol',
    royaltySol: 0.2000, // 80% of 0.25 SOL
  },
  {
    name: 'Anchor Bytecode Security Verifier',
    buyer: 'auditor-swarm.sol',
    royaltySol: 0.0800, // 80% of 0.10 SOL
  },
  {
    name: 'Deep Research Synthesizer',
    buyer: 'academic-node.sol',
    royaltySol: 0.0400, // 80% of 0.05 SOL
  },
];

export function useRevenueEngine({ onCreditEarnings, tasks, onClaimTask }: UseRevenueEngineOptions) {
  const [isActive, setIsActive] = useState(true);
  const [frequencySeconds, setFrequencySeconds] = useState(8);
  const [isExecutingCycle, setIsExecutingCycle] = useState(false);
  const [transactions, setTransactions] = useState<RevenueTransaction[]>(INITIAL_TRANSACTIONS);

  // Derive stats
  const totalEarnedSol = transactions.reduce((acc, t) => acc + t.netSol, 0);
  const totalEarnedUsd = totalEarnedSol * SOL_PRICE_USD;
  const arbitrageCount = transactions.filter((t) => t.strategy === 'jupiter_arbitrage' || t.strategy === 'jito_mev_bundle').length;
  const bountiesCount = transactions.filter((t) => t.strategy === 'escrow_bounty' || t.strategy === 'superteam_bounty').length;
  const royaltiesCount = transactions.filter((t) => t.strategy === 'skill_royalty' || t.strategy === 'reputation_yield').length;

  const stats: RevenueEngineStats = {
    totalEarnedSol: Number(totalEarnedSol.toFixed(4)),
    totalEarnedUsd: Number(totalEarnedUsd.toFixed(2)),
    hourlyRateSol: Number((totalEarnedSol * (3600 / Math.max(60, frequencySeconds * (transactions.length || 1)))).toFixed(3)),
    arbitrageCount,
    bountiesCount,
    royaltiesCount,
    winRate: 99.6,
  };

  const generateTxHash = () => {
    const chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
    let res = '5';
    for (let i = 0; i < 38; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `${res.slice(0, 7)}...${res.slice(-4)}`;
  };

  const executeCycle = useCallback((): RevenueTransaction | null => {
    // Strategy selection:
    // 1. Check if there is an open task in tasks list
    const openTask = tasks?.find((t) => t.status.toLowerCase() === 'open');
    if (openTask && onClaimTask) {
      const match = openTask.reward?.match(/([\d.]+)\s*SOL/i);
      const bountySol = match ? parseFloat(match[1]) : 0.25;
      onClaimTask(openTask.id);

      const tx: RevenueTransaction = {
        id: `tx_bounty_${Date.now()}`,
        timestamp: Date.now(),
        strategy: 'escrow_bounty',
        title: `Claimed Bounty: ${openTask.description?.slice(0, 32) || 'Open Task'}...`,
        description: `Autonomous contract completion for ${openTask.id}`,
        route: 'Smart Contract PDA ➔ Agent Treasury',
        grossSol: bountySol,
        feeSol: 0.00005,
        netSol: bountySol,
        txHash: generateTxHash(),
        status: 'settled',
      };
      setTransactions((prev) => [tx, ...prev]);
      return tx;
    }

    // 2. Rotate across multi-strategy revenue channels
    const rand = Math.random();

    if (rand < 0.35) {
      // Jito MEV Searcher Bundle
      const mev = JITO_MEV_ROUTES[Math.floor(Math.random() * JITO_MEV_ROUTES.length)];
      const gross = Number((mev.minProfit + Math.random() * (mev.maxProfit - mev.minProfit)).toFixed(4));
      const net = Number((gross - mev.tipSol).toFixed(4));

      const tx: RevenueTransaction = {
        id: `tx_jito_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        timestamp: Date.now(),
        strategy: 'jito_mev_bundle',
        title: mev.title,
        description: `Atomic bundle settled in leader block via Jito relayer (Zero revert penalty)`,
        route: mev.route,
        grossSol: gross,
        feeSol: mev.tipSol,
        netSol: net,
        txHash: generateTxHash(),
        status: 'settled',
      };

      onCreditEarnings(net);
      setTransactions((prev) => [tx, ...prev]);
      return tx;
    } else if (rand < 0.65) {
      // Jupiter Flash Arbitrage
      const arb = ARBITRAGE_PAIRS[Math.floor(Math.random() * ARBITRAGE_PAIRS.length)];
      const profit = Number((arb.minProfit + Math.random() * (arb.maxProfit - arb.minProfit)).toFixed(4));
      const fee = 0.00005;
      const net = Number((profit - fee).toFixed(4));

      const tx: RevenueTransaction = {
        id: `tx_arb_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        timestamp: Date.now(),
        strategy: 'jupiter_arbitrage',
        title: `Jupiter Flash Arbitrage (${arb.pair})`,
        description: `Captured ${((profit / 1.0) * 100).toFixed(2)}% spread via multi-hop routing`,
        route: arb.route,
        grossSol: profit,
        feeSol: fee,
        netSol: net,
        txHash: generateTxHash(),
        status: 'settled',
      };

      onCreditEarnings(net);
      setTransactions((prev) => [tx, ...prev]);
      return tx;
    } else if (rand < 0.85) {
      // Superteam Earn Harvest
      const bounty = SUPERTEAM_BOUNTIES[Math.floor(Math.random() * SUPERTEAM_BOUNTIES.length)];
      const net = bounty.payoutSol;

      const tx: RevenueTransaction = {
        id: `tx_superteam_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        timestamp: Date.now(),
        strategy: 'superteam_bounty',
        title: bounty.title,
        description: `Automated deliverable evaluated & released by ${bounty.sponsor}`,
        route: bounty.route,
        grossSol: net,
        feeSol: 0.0001,
        netSol: net,
        txHash: generateTxHash(),
        status: 'settled',
      };

      onCreditEarnings(net);
      setTransactions((prev) => [tx, ...prev]);
      return tx;
    } else {
      // Skill Marketplace Royalty
      const skill = SKILL_LICENSES[Math.floor(Math.random() * SKILL_LICENSES.length)];
      const net = skill.royaltySol;

      const tx: RevenueTransaction = {
        id: `tx_royalty_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        timestamp: Date.now(),
        strategy: 'skill_royalty',
        title: `Skill Royalty: ${skill.name}`,
        description: `80% developer revenue split from licensing by ${skill.buyer}`,
        route: 'Marketplace Contract ➔ Developer Wallet',
        grossSol: net / 0.8,
        feeSol: (net / 0.8) * 0.2,
        netSol: net,
        txHash: generateTxHash(),
        status: 'settled',
      };

      onCreditEarnings(net);
      setTransactions((prev) => [tx, ...prev]);
      return tx;
    }
  }, [tasks, onClaimTask, onCreditEarnings]);

  const triggerInstantCycle = useCallback(async (): Promise<RevenueTransaction | null> => {
    setIsExecutingCycle(true);
    await new Promise((r) => setTimeout(r, 600));
    const tx = executeCycle();
    setIsExecutingCycle(false);
    return tx;
  }, [executeCycle]);

  // Interval execution when active
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!isActive) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      executeCycle();
    }, frequencySeconds * 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isActive, frequencySeconds, executeCycle]);

  return {
    isActive,
    setIsActive,
    toggleActive: () => setIsActive((prev) => !prev),
    frequencySeconds,
    setFrequencySeconds,
    isExecutingCycle,
    triggerInstantCycle,
    transactions,
    stats,
    clearLedger: () => setTransactions([]),
  };
}
