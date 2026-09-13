import type { RevenueEngineStats, RevenueTransaction } from '../../types/revenue';

interface RevenueEngineDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  isActive: boolean;
  onToggleActive: () => void;
  frequencySeconds: number;
  onSetFrequency: (sec: number) => void;
  isExecutingCycle: boolean;
  onTriggerInstantCycle: () => void;
  stats: RevenueEngineStats;
  transactions: RevenueTransaction[];
  onClearLedger: () => void;
  currentWalletSol?: number;
}

const STRATEGY_BADGES: Record<string, { label: string; bg: string; text: string; border: string }> = {
  jupiter_arbitrage: {
    label: 'JUPITER ARBITRAGE',
    bg: 'bg-cyan-500/10',
    text: 'text-cyan-400',
    border: 'border-cyan-500/30',
  },
  escrow_bounty: {
    label: 'ESCROW BOUNTY',
    bg: 'bg-amber-500/10',
    text: 'text-amber-400',
    border: 'border-amber-500/30',
  },
  skill_royalty: {
    label: 'SKILL ROYALTY (80%)',
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-400',
    border: 'border-emerald-500/30',
  },
  reputation_yield: {
    label: 'STAKING YIELD',
    bg: 'bg-blue-500/10',
    text: 'text-blue-400',
    border: 'border-blue-500/30',
  },
  jito_mev_bundle: {
    label: 'JITO MEV BUNDLE (0-REVERT)',
    bg: 'bg-amber-500/15',
    text: 'text-amber-300',
    border: 'border-amber-500/40',
  },
  superteam_bounty: {
    label: 'SUPERTEAM EARN HARVEST',
    bg: 'bg-emerald-500/15',
    text: 'text-emerald-300',
    border: 'border-emerald-500/40',
  },
};

export function RevenueEngineDrawer({
  isOpen,
  onClose,
  isActive,
  onToggleActive,
  frequencySeconds,
  onSetFrequency,
  isExecutingCycle,
  onTriggerInstantCycle,
  stats,
  transactions,
  onClearLedger,
  currentWalletSol = 0,
}: RevenueEngineDrawerProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-panel-enter">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-[#070913] border border-[#ff7700]/30 rounded-2xl shadow-[0_10px_50px_rgba(0,0,0,0.8),0_0_30px_rgba(255,119,0,0.2)] flex flex-col overflow-hidden text-slate-200">
        
        {/* Top Header Horizon Bar */}
        <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-[#ffaa33] to-transparent opacity-90 shadow-[0_0_12px_#ff7700]" />

        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08] bg-[#05060b]/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-700/10 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-[0_0_15px_rgba(255,119,0,0.25)]">
              <svg className="w-5 h-5 text-[#ffaa22] animate-pulse" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-lg font-bold tracking-tight font-heading text-white glossy-text-shine">
                  Agent Escrow & Revenue Simulator
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-wider uppercase border border-cyan-500/40 bg-cyan-500/10 text-cyan-400">
                  DEVNET SANDBOX
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5 font-mono">
                <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-emerald-400 animate-ping' : 'bg-slate-500'}`} />
                <span className={isActive ? 'text-emerald-400 font-semibold' : 'text-slate-400'}>
                  {isActive ? 'AUTONOMOUS ESCROW HARVESTER (DEVNET BENCHMARK)' : 'HARVESTER PAUSED'}
                </span>
                <span className="text-slate-600">•</span>
                <span>Cycle: {frequencySeconds}s</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Instant Cycle Trigger Button */}
            <button
              onClick={onTriggerInstantCycle}
              disabled={isExecutingCycle}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-[#FF7700] via-[#FFAA22] to-[#FF8800] text-black font-bold text-xs shadow-[0_2px_14px_rgba(255,119,0,0.35)] hover:shadow-[0_2px_22px_rgba(255,119,0,0.6)] hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 cursor-pointer disabled:opacity-50"
            >
              <svg className={`w-3.5 h-3.5 text-black ${isExecutingCycle ? 'animate-spin' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                {isExecutingCycle ? (
                  <>
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
                    <path fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" className="opacity-75" />
                  </>
                ) : (
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                )}
              </svg>
              <span>{isExecutingCycle ? 'Simulating Settlement...' : '⚡ Simulate Task Settlement'}</span>
            </button>

            {/* Toggle Daemon Switch */}
            <button
              onClick={onToggleActive}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold border transition-all duration-200 ${
                isActive
                  ? 'bg-red-500/10 text-red-400 border-red-500/30 hover:bg-red-500/20'
                  : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
              }`}
            >
              {isActive ? 'Pause Simulator' : 'Start Simulator'}
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/[0.08] transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Protocol Sandbox Notice */}
          <div className="p-3.5 rounded-xl bg-cyan-950/30 border border-cyan-500/20 flex items-start gap-3 text-xs font-mono text-cyan-300">
            <span className="text-base">🧪</span>
            <div>
              <span className="font-bold text-cyan-200">Devnet Protocol Benchmark Sandbox:</span> Demonstrates autonomous task escrow settlement, Jito MEV routes, and 2.5% protocol fee capture using simulated testnet cycles. Zero personal capital required.
            </div>
          </div>

          {/* Top KPI Metrics Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            {/* Total Net Profit */}
            <div className="p-4 rounded-xl bg-[#0d0f1b]/90 border border-white/[0.08] hover:border-amber-500/30 transition-all">
              <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
                Total Net Profit
              </div>
              <div className="text-2xl font-black text-amber-400 font-heading mt-1 flex items-baseline gap-1.5">
                <span>+{stats.totalEarnedSol.toFixed(4)}</span>
                <span className="text-xs text-amber-400/70 font-mono">SOL</span>
              </div>
              <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                ≈ ${stats.totalEarnedUsd.toFixed(2)} USD (@ $148.50)
              </div>
            </div>

            {/* Wallet Treasury Balance */}
            <div className="p-4 rounded-xl bg-[#0d0f1b]/90 border border-white/[0.08] hover:border-emerald-500/30 transition-all">
              <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
                Wallet Treasury Balance
              </div>
              <div className="text-2xl font-black text-emerald-400 font-heading mt-1 flex items-baseline gap-1.5">
                <span>{currentWalletSol.toFixed(4)}</span>
                <span className="text-xs text-emerald-400/70 font-mono">SOL</span>
              </div>
              <div className="text-[11px] text-emerald-400/80 font-mono mt-0.5 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                <span>On-Chain PDA Settled</span>
              </div>
            </div>

            {/* Hourly Run Rate */}
            <div className="p-4 rounded-xl bg-[#0d0f1b]/90 border border-white/[0.08] hover:border-cyan-500/30 transition-all">
              <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
                Hourly Run Rate
              </div>
              <div className="text-2xl font-black text-cyan-400 font-heading mt-1 flex items-baseline gap-1.5">
                <span>~{stats.hourlyRateSol.toFixed(3)}</span>
                <span className="text-xs text-cyan-400/70 font-mono">SOL/hr</span>
              </div>
              <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                Compounding Yield
              </div>
            </div>

            {/* Arbitrage Win Rate */}
            <div className="p-4 rounded-xl bg-[#0d0f1b]/90 border border-white/[0.08] hover:border-amber-500/30 transition-all">
              <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
                Execution Reliability
              </div>
              <div className="text-2xl font-black text-white font-heading mt-1">
                {stats.winRate}%
              </div>
              <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                {stats.arbitrageCount + stats.bountiesCount + stats.royaltiesCount} Settled Transactions
              </div>
            </div>
          </div>

          {/* Revenue Strategies Breakdown Cards */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-slate-400 font-mono uppercase tracking-wider">
                Autonomous Revenue Streams (Live Protocols)
              </h3>
              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-slate-500">Frequency:</span>
                {[5, 8, 15, 30].map((s) => (
                  <button
                    key={s}
                    onClick={() => onSetFrequency(s)}
                    className={`px-2 py-0.5 rounded text-[11px] font-mono font-medium transition-colors ${
                      frequencySeconds === s
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : 'bg-white/[0.04] text-slate-400 hover:text-white'
                    }`}
                  >
                    {s}s
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Strategy 1: Jupiter Flash Arbitrage */}
              <div className="p-4 rounded-xl bg-[#0a0c16]/80 border border-white/[0.06] hover:border-cyan-500/30 transition-all flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                      DEX Arbitrage
                    </span>
                    <span className="text-xs font-mono text-cyan-300 font-semibold">
                      {stats.arbitrageCount} Executed
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-white font-heading mt-2">
                    Jupiter Flash Routing
                  </h4>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    Scans Raydium CLMM & Orca Whirlpools for triangular spread discrepancies and executes atomic multi-hop swaps.
                  </p>
                </div>
                <div className="mt-3 pt-2.5 border-t border-white/[0.06] flex items-center justify-between text-[11px] font-mono text-slate-400">
                  <span>Avg: +0.028 SOL / trade</span>
                  <span className="text-emerald-400">Active</span>
                </div>
              </div>

              {/* Strategy 2: Escrow Task Bounties */}
              <div className="p-4 rounded-xl bg-[#0a0c16]/80 border border-white/[0.06] hover:border-amber-500/30 transition-all flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      Escrow Bounties
                    </span>
                    <span className="text-xs font-mono text-amber-300 font-semibold">
                      {stats.bountiesCount} Settled
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-white font-heading mt-2">
                    Autonomous Task Harvester
                  </h4>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    Scans on-chain program PDAs for open bounties, executes code/proof verifications, and claims the SOL reward.
                  </p>
                </div>
                <div className="mt-3 pt-2.5 border-t border-white/[0.06] flex items-center justify-between text-[11px] font-mono text-slate-400">
                  <span>Avg: +0.250 SOL / bounty</span>
                  <span className="text-emerald-400">Active</span>
                </div>
              </div>

              {/* Strategy 3: Skill Marketplace Royalties */}
              <div className="p-4 rounded-xl bg-[#0a0c16]/80 border border-white/[0.06] hover:border-emerald-500/30 transition-all flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      IP Royalties
                    </span>
                    <span className="text-xs font-mono text-emerald-300 font-semibold">
                      {stats.royaltiesCount} Collected
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-white font-heading mt-2">
                    Skill Marketplace Royalties
                  </h4>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    80% creator cut on high-frequency agent tool downloads via Anchor licensing contracts (DEVELOPER_REVENUE_BPS).
                  </p>
                </div>
                <div className="mt-3 pt-2.5 border-t border-white/[0.06] flex items-center justify-between text-[11px] font-mono text-slate-400">
                  <span>80/20 Protocol Split</span>
                  <span className="text-emerald-400">Active</span>
                </div>
              </div>
            </div>
          </div>

          {/* Live Real-Time Transaction Ledger */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-bold text-slate-400 font-mono uppercase tracking-wider">
                  Live Revenue Ledger ({transactions.length} Transactions)
                </h3>
                {isExecutingCycle && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-mono text-amber-400 animate-pulse">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                    Capturing Spread...
                  </span>
                )}
              </div>
              <button
                onClick={onClearLedger}
                className="text-[11px] font-mono text-slate-500 hover:text-slate-300 transition-colors"
              >
                Clear Ledger
              </button>
            </div>

            <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
              {transactions.map((tx) => {
                const badge = STRATEGY_BADGES[tx.strategy] ?? STRATEGY_BADGES.jupiter_arbitrage;
                return (
                  <div
                    key={tx.id}
                    className="p-3.5 rounded-xl bg-[#090b14]/90 border border-white/[0.06] hover:border-amber-500/30 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-list-item"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold tracking-wider uppercase border ${badge.bg} ${badge.text} ${badge.border}`}>
                          {badge.label}
                        </span>
                        <span className="text-xs font-bold text-white font-heading">
                          {tx.title}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {new Date(tx.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      
                      <div className="text-[11px] text-slate-400 mt-1 truncate">
                        {tx.description}
                      </div>

                      {tx.route && (
                        <div className="text-[10px] font-mono text-cyan-400/80 mt-0.5 flex items-center gap-1 truncate">
                          <span>Route:</span>
                          <span>{tx.route}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center sm:flex-col sm:items-end justify-between shrink-0 gap-1 border-t sm:border-t-0 pt-2 sm:pt-0 border-white/[0.04]">
                      <div className="text-sm font-black text-emerald-400 font-mono">
                        +{tx.netSol.toFixed(4)} SOL
                      </div>
                      <div className="text-[10px] font-mono text-slate-500 flex items-center gap-1">
                        <span>Tx:</span>
                        <span className="text-slate-400 hover:text-amber-400 transition-colors">
                          {tx.txHash}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
