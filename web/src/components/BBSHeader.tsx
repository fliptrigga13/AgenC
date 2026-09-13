import type { ConnectionState } from '../types';

interface BBSHeaderProps {
  connectionState: ConnectionState;
  approvalCount: number;
  totalEarnedSol?: number;
  isRevenueEngineActive?: boolean;
  onOpenRevenueEngine?: () => void;
}

const CONNECTION_LABELS: Record<ConnectionState, { text: string; color: string; dot: string }> = {
  connected: { text: 'QUANTUM SYNCED', color: 'text-emerald-400 border-emerald-500/40 bg-emerald-950/40', dot: 'bg-emerald-400' },
  connecting: { text: 'ORBITAL LOCKING...', color: 'text-amber-400 border-amber-500/40 bg-amber-950/40 animate-pulse', dot: 'bg-amber-400' },
  authenticating: { text: 'ZK AUTHENTICATING', color: 'text-amber-400 border-amber-500/40 bg-amber-950/40 animate-pulse', dot: 'bg-amber-400' },
  reconnecting: { text: 'RE-ESTABLISHING MESH', color: 'text-amber-400 border-amber-500/40 bg-amber-950/40 animate-pulse', dot: 'bg-amber-400' },
  disconnected: { text: 'OFFLINE NODE', color: 'text-red-400 border-red-500/40 bg-red-950/40', dot: 'bg-red-400' },
};

export function BBSHeader({
  connectionState,
  approvalCount,
  totalEarnedSol,
  isRevenueEngineActive,
  onOpenRevenueEngine,
}: BBSHeaderProps) {
  const conn = CONNECTION_LABELS[connectionState];

  return (
    <header className="shrink-0 border-b border-[#ff7700]/30 bg-[#040508]/95 backdrop-blur-xl relative overflow-hidden z-20">
      {/* Top glowing amber-orange laser horizon with sweeping pulse */}
      <div className="absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#ff7700] to-transparent opacity-90 shadow-[0_0_12px_#ff7700]" />
      <div className="absolute top-0 left-1/4 w-1/2 h-[1px] bg-gradient-to-r from-transparent via-amber-200 to-transparent animate-pulse" />

      <div className="flex items-center justify-between px-5 py-2.5">
        {/* Left: Futuristic Quantum Emblem + Wordmark */}
        <div className="flex items-center gap-3.5">
          {/* Animated Quantum Holographic Emblem */}
          <div className="relative flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-b from-[#1c0d05] to-[#0a0603] border border-[#ff7700]/60 shadow-[0_0_16px_rgba(255,107,0,0.35)]">
            <svg className="w-5 h-5 animate-ring-shimmer" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="9" stroke="#ff7700" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.8" />
              <polygon points="12,4 19,16 5,16" stroke="#00E5FF" strokeWidth="1.2" opacity="0.75" />
            </svg>
            <div className="absolute w-1.5 h-1.5 rounded-full bg-[#ffaa22] shadow-[0_0_8px_#ff7700] opacity-80" />
            <div className="absolute w-1 h-1 rounded-full bg-white shadow-[0_0_6px_#ffaa00]" />
          </div>

          {/* Wordmark and version */}
          <div className="flex items-center gap-2.5">
            <div className="flex flex-col">
              <span className="glossy-text-shine font-extrabold text-lg tracking-[5px] font-heading">
                AGENC
              </span>
              <span className="text-[8px] font-mono tracking-[2px] text-slate-400 uppercase -mt-0.5">
                Autonomous Quantum OS
              </span>
            </div>

            <span className="hidden sm:inline-flex items-center px-2.5 py-0.5 rounded-full text-[9px] font-mono font-bold tracking-widest uppercase border border-[#ffaa33]/40 bg-gradient-to-r from-[#2a1305] to-[#120803] glossy-amber-shine shadow-[0_2px_12px_rgba(255,119,0,0.2)]">
              v3.0 QUANTUM
            </span>
          </div>
        </div>

        {/* Right: High-Tech Telemetry Status Stream */}
        <div className="flex items-center gap-3 text-xs font-mono">
          <div className="hidden lg:flex items-center gap-2 px-2.5 py-1 rounded-md bg-white/[0.02] border border-white/[0.06] text-[11px] text-slate-400">
            <span className="text-[#ff7700]">SOLANA</span>
            <span className="text-slate-600">|</span>
            <span className="text-slate-300">DEVNET // MAINNET</span>
          </div>

          {onOpenRevenueEngine && (
            <button
              onClick={onOpenRevenueEngine}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-mono font-bold border transition-all cursor-pointer ${
                isRevenueEngineActive
                  ? 'border-emerald-500/50 bg-emerald-950/40 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.25)] hover:border-emerald-400'
                  : 'border-amber-500/40 bg-[#160c04] text-amber-400 hover:border-amber-400'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${isRevenueEngineActive ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'}`} />
              <span className="tracking-wider">
                {isRevenueEngineActive ? `AUTO-EARN: +${(totalEarnedSol ?? 0).toFixed(4)} SOL` : 'START AUTO-EARN'}
              </span>
            </button>
          )}

          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold border shadow-sm ${conn.color}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${conn.dot} animate-pulse`} />
            <span className="tracking-wider">{conn.text}</span>
          </div>

          {approvalCount > 0 && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-amber-500/60 bg-amber-500/15 text-amber-300 animate-pulse text-[11px] font-bold shadow-[0_0_12px_rgba(245,158,11,0.3)]">
              <span>!</span>
              <span>{approvalCount} APPROVALS</span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
