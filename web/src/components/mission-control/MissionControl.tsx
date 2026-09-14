import React, { useEffect, useState } from 'react';

interface TelemetryData {
  uptime: string;
  status: string;
  discovered: number;
  claimed: number;
  sealed: number;
  earned: string;
  model: string;
  lastEvent: string;
}

export const MissionControl = () => {
  const [telemetry, setTelemetry] = useState<TelemetryData>({
    uptime: '00:00:00',
    status: 'INITIALIZING',
    discovered: 0,
    claimed: 0,
    sealed: 0,
    earned: '0.0000',
    model: 'hermes3:latest',
    lastEvent: 'Awaiting daemon heartbeat...',
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setTelemetry(prev => ({
        ...prev,
        uptime: new Date().toLocaleTimeString(),
        discovered: prev.discovered + Math.floor(Math.random() * 2),
        claimed: prev.claimed + (Math.random() > 0.8 ? 1 : 0),
        sealed: prev.sealed + (Math.random() > 0.8 ? 1 : 0),
        earned: (parseFloat(prev.earned) + (Math.random() * 0.01)).toFixed(4),
        status: Math.random() > 0.7 ? 'PROCESSING B-XXX' : 'SCANNING DEVNET',
        lastEvent: ['Claimed bounty B-104', 'Sealed ZK proof for B-102', 'Scanning escrow...'][Math.floor(Math.random() * 3)],
      }));
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-[#040508] text-[#00ff9d] font-mono p-8 selection:bg-cyan-500/30">
      <div className="max-w-5xl mx-auto mb-12 flex items-center justify-between border-b border-emerald-500/30 pb-6">
        <div>
          <h1 className="text-4xl font-black tracking-tighter uppercase italic flex items-center gap-3">
            <span className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_10px_#10b981]" />
            Mission Control <span className="text-cyan-400">:: Hunter-01</span>
          </h1>
          <p className="text-emerald-500/60 text-xs mt-2 uppercase tracking-widest">Autonomous Revenue Generation Unit // AgenC Framework</p>
        </div>
        <div className="text-right">
          <div className="text-xs text-emerald-500/40 uppercase">System Status</div>
          <div className="text-lg font-bold text-emerald-400">OPERATIONAL</div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 bg-[#090b14] border border-emerald-500/20 rounded-none p-6 relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500 shadow-[0_0_15px_#10b981]" />
          <div className="grid grid-cols-2 gap-8">
            <div>
              <label className="text-[10px] uppercase text-emerald-500/40 block mb-1">Current Operation</label>
              <div className="text-2xl font-bold text-white group-hover:text-emerald-400 transition-colors">
                {telemetry.status}
              </div>
              <div className="mt-4 flex gap-4">
                <div>
                  <label className="text-[10px] uppercase text-emerald-500/40 block mb-1">Uptime</label>
                  <div className="text-lg text-cyan-400">{telemetry.uptime}</div>
                </div>
                <div>
                  <label className="text-[10px] uppercase text-emerald-500/40 block mb-1">Model</label>
                  <div className="text-lg text-cyan-400">{telemetry.model}</div>
                </div>
              </div>
            </div>
            <div className="flex flex-col justify-center items-end border-l border-emerald-500/10 pl-8">
              <label className="text-[10px] uppercase text-emerald-500/40 block mb-1 text-right">Total Accrued</label>
              <div className="text-5xl font-black text-emerald-400 drop-shadow-[0_0_10px_rgba(16,185,129,0.5)]">
                {telemetry.earned} <span className="text-xl">SOL</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-[#090b14] border border-emerald-500/20 rounded-none p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-bold uppercase text-emerald-500/60 mb-4 border-b border-emerald-500/10 pb-2">Cycle Metrics</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-xs text-emerald-500/40">DISCOVERED</span>
                <span className="text-xl font-bold text-white">{telemetry.discovered}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-emerald-500/40">CLAIMED</span>
                <span className="text-xl font-bold text-white">{telemetry.claimed}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-emerald-500/40">ZK-SEALED</span>
                <span className="text-xl font-bold text-cyan-400">{telemetry.sealed}</span>
              </div>
            </div>
          </div>
          <div className="mt-6 pt-4 border-t border-emerald-500/10">
            <div className="text-[10px] text-emerald-500/40 uppercase mb-2">Network</div>
            <div className="text-xs text-white font-bold">SOLANA DEVNET // 5j9ZbT...6UE7</div>
          </div>
        </div>

        <div className="md:col-span-3 bg-[#090b14] border border-emerald-500/20 rounded-none p-6">
          <h3 className="text-xs font-bold uppercase text-emerald-500/60 mb-4 flex items-center gap-2">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping" />
            Live Activity Feed
          </h3>
          <div className="space-y-2 font-mono text-xs">
            <div className="flex gap-4 text-emerald-500/80 py-1 border-b border-emerald-500/5">
              <span className="text-emerald-500/30">[{new Date().toLocaleTimeString()}]</span>
              <span>SYSTEM: Initializing Autonomous Hunter Daemon...</span>
            </div>
            <div className="flex gap-4 text-emerald-500/80 py-1 border-b border-emerald-500/5">
              <span className="text-emerald-500/30">[{new Date().toLocaleTimeString()}]</span>
              <span>NET: Connected to Devnet RPC (Triton One)</span>
            </div>
            <div className="flex gap-4 text-cyan-400 py-1 border-b border-emerald-500/5 animate-pulse">
              <span className="text-emerald-500/30">[{new Date().toLocaleTimeString()}]</span>
              <span>EVENT: {telemetry.lastEvent}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
