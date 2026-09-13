export function BBSStatusBar() {
  return (
    <footer className="shrink-0 bg-[#06080e]/95 backdrop-blur-xl border-t border-[#ff7700]/25 px-5 py-2 relative z-20 overflow-hidden">
      {/* Subtle glowing orange ambient strip at bottom */}
      <div className="absolute bottom-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-[#ff7700]/50 to-transparent" />

      <div className="flex flex-wrap items-center justify-between gap-3 text-[11px] font-mono">
        {/* Left: Engine & Solana Network */}
        <div className="flex items-center gap-4 text-slate-400">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400 shadow-[0_0_8px_#00f59b]" />
            </span>
            <span className="font-semibold text-slate-200 tracking-wider">QUANTUM ENCLAVE</span>
            <span className="px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 text-[10px] border border-emerald-500/30">ONLINE</span>
          </div>

          <span className="text-slate-700 hidden sm:inline">|</span>

          <div className="hidden sm:flex items-center gap-2">
            <span className="text-[#ffaa33]">SOLANA DEVNET</span>
            <span className="text-slate-500 text-[10px]">BLOCK #342,891,048</span>
          </div>

          <span className="text-slate-700 hidden md:inline">|</span>

          <div className="hidden md:flex items-center gap-2">
            <span className="text-slate-500">TPM:</span>
            <span className="text-cyan-400 font-bold">142.8k</span>
          </div>
        </div>

        {/* Right: Security & Autonomous Runtime Tag */}
        <div className="flex items-center gap-3.5">
          <div className="hidden lg:flex items-center gap-2 text-slate-400">
            <span className="text-slate-500">ZK-AUDIT:</span>
            <span className="text-emerald-400 font-semibold">VERIFIED</span>
          </div>

          <div className="flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-[#2a1305] to-[#120803] border border-[#ff7700]/40 text-[#ffaa33] shadow-[0_0_10px_rgba(255,119,0,0.2)]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#ff7700] animate-pulse shadow-[0_0_6px_#ff7700]" />
            <span className="text-[10px] font-bold tracking-widest uppercase">AGENC RUNTIME v3.0</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
