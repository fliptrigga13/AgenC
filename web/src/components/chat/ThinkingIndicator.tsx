interface ThinkingIndicatorProps {
  label?: string;
}

export function ThinkingIndicator({ label = 'AGENT COGNITIVE SYNTHESIS' }: ThinkingIndicatorProps) {
  return (
    <div
      data-testid="chat-thinking-indicator"
      className="animate-msg-agent my-3 relative overflow-hidden rounded-xl border border-[#ffaa33]/30 bg-gradient-to-b from-[#130b05]/95 via-[#0c0906]/95 to-[#06060a]/98 p-4 shadow-[0_4px_28px_rgba(0,0,0,0.6),0_0_20px_rgba(255,119,0,0.12)] backdrop-blur-2xl animate-classy-thinking"
    >
      {/* Subtle atmospheric aurora wave */}
      <div
        className="pointer-events-none absolute inset-0 animate-classy-aurora"
        style={{
          background:
            'linear-gradient(90deg, transparent 0%, rgba(255,140,20,0.06) 40%, rgba(255,200,80,0.12) 50%, rgba(255,140,20,0.06) 60%, transparent 100%)',
        }}
      />

      {/* Ambient background glow highlights */}
      <div className="pointer-events-none absolute -top-12 left-1/4 h-32 w-64 rounded-full bg-[#ff7700]/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-12 right-1/4 h-32 w-64 rounded-full bg-[#00e5ff]/05 blur-3xl" />

      {/* Header and status */}
      <div className="relative z-10 flex items-center justify-between gap-3 border-b border-white/[0.07] pb-2.5">
        <div className="flex items-center gap-2.5">
          {/* Refined radiant amber nexus */}
          <div className="relative flex h-3 w-3 items-center justify-center">
            <span className="relative inline-flex h-2 w-2 rounded-full bg-gradient-to-tr from-[#ff6600] to-[#ffbb44] shadow-[0_0_8px_#ff8800]" />
          </div>

          <span className="font-mono text-xs font-semibold tracking-[1.5px] text-[#ffb347] drop-shadow-[0_0_6px_rgba(255,130,0,0.4)]">
            {label}
          </span>
          <span className="hidden font-mono text-[10px] tracking-wider text-slate-400 sm:inline">
            // QUANTUM HARMONICS ACTIVE
          </span>
        </div>

        {/* Dynamic smooth frequency bars */}
        <div className="flex items-center gap-1.5">
          <span
            className="inline-block h-3 w-1 rounded-full bg-[#ff9933] shadow-[0_0_4px_rgba(255,119,0,0.4)] animate-classy-bar"
            style={{ animationDelay: '0ms' }}
          />
          <span
            className="inline-block h-4 w-1 rounded-full bg-[#ffaa44] shadow-[0_0_6px_rgba(255,140,0,0.4)] animate-classy-bar"
            style={{ animationDelay: '180ms' }}
          />
          <span
            className="inline-block h-5 w-1 rounded-full bg-[#ffbb55] shadow-[0_0_8px_rgba(255,160,0,0.4)] animate-classy-bar"
            style={{ animationDelay: '360ms' }}
          />
          <span
            className="inline-block h-3.5 w-1 rounded-full bg-[#ffaa44] shadow-[0_0_6px_rgba(255,140,0,0.4)] animate-classy-bar"
            style={{ animationDelay: '540ms' }}
          />
          <span
            className="inline-block h-2.5 w-1 rounded-full bg-[#ff8822] shadow-[0_0_4px_rgba(255,119,0,0.4)] animate-classy-bar"
            style={{ animationDelay: '720ms' }}
          />
        </div>
      </div>

      {/* Description & thinking status */}
      <div className="relative z-10 mt-2.5 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 font-mono text-slate-300">
          <span className="text-[#ffaa33] font-bold">{'>'}</span>
          <span>Synthesizing live telemetry, verifying tools & preparing response...</span>
          <span className="inline-block h-3 w-1.5 bg-[#ffaa33] shadow-[0_0_4px_#ff8800] animate-bbs-cursor" />
        </div>
        <span className="hidden font-mono text-[10px] text-emerald-400/80 md:inline">
          RESONANCE 100%
        </span>
      </div>
    </div>
  );
}
