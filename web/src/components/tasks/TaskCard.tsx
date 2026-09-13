import { useState } from 'react';
import type { TaskInfo } from '../../types';

interface TaskCardProps {
  task: TaskInfo;
  onCancel: (taskId: string) => void;
  onClaim?: (taskId: string) => void;
}

const STATUS_STYLES: Record<string, { bg: string; text: string; dot: string }> = {
  open: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', dot: 'bg-emerald-400' },
  in_progress: { bg: 'bg-amber-500/10', text: 'text-amber-400', dot: 'bg-amber-400' },
  completed: { bg: 'bg-cyan-500/10', text: 'text-cyan-400', dot: 'bg-cyan-400' },
  cancelled: { bg: 'bg-tetsuo-200/50', text: 'text-tetsuo-400', dot: 'bg-tetsuo-400' },
  disputed: { bg: 'bg-red-500/10', text: 'text-red-400', dot: 'bg-red-400' },
};

export function TaskCard({ task, onCancel, onClaim }: TaskCardProps) {
  const [isExecuting, setIsExecuting] = useState(false);
  const style = STATUS_STYLES[task.status.toLowerCase()] ?? STATUS_STYLES.open;

  const handleClaim = () => {
    if (!onClaim || isExecuting) return;
    setIsExecuting(true);
    setTimeout(() => {
      onClaim(task.id);
      setIsExecuting(false);
    }, 600);
  };

  return (
    <div className="px-4 py-3.5 rounded-xl border border-white/[0.08] bg-[#0c0d16]/80 hover:border-amber-500/30 transition-all duration-200 hover:shadow-[0_4px_20px_rgba(0,0,0,0.4)]">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          {task.description ? (
            <div className="text-sm font-semibold text-slate-100 tracking-tight font-heading truncate">{task.description}</div>
          ) : (
            <div className="text-sm font-semibold text-slate-100 truncate font-mono">{task.id.slice(0, 16)}...</div>
          )}
          <div className="text-[10px] text-slate-500 font-mono mt-0.5">{task.id.slice(0, 16)}...</div>
        </div>
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider shrink-0 ${style.bg} ${style.text} border border-current/20`}>
          <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
          {task.status}
        </span>
      </div>
      <div className="mt-2.5 flex items-center gap-4 text-xs text-slate-400">
        {task.reward && (
          <span className="flex items-center gap-1 font-mono font-medium text-amber-400">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8" /><path d="M12 18V6" /></svg>
            {task.reward}
          </span>
        )}
        {task.creator && (
          <span className="flex items-center gap-1 font-mono text-[11px] text-slate-400">
            <span>by: {task.creator}</span>
          </span>
        )}
        {task.worker && (
          <span className="flex items-center gap-1 font-mono text-[11px] text-emerald-400">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
            {task.worker}
          </span>
        )}
      </div>

      {task.status.toLowerCase() === 'open' && (
        <div className="mt-3 pt-2.5 border-t border-white/[0.06] flex items-center justify-between gap-3">
          <button
            onClick={handleClaim}
            disabled={isExecuting}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-[#FF7700] via-[#FFAA22] to-[#FF8800] text-black font-semibold text-xs shadow-[0_2px_14px_rgba(255,119,0,0.35)] hover:shadow-[0_2px_20px_rgba(255,119,0,0.55)] hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 cursor-pointer disabled:opacity-60"
          >
            <svg className={`w-3.5 h-3.5 text-black ${isExecuting ? 'animate-spin' : 'animate-pulse'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              {isExecuting ? (
                <>
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
                  <path fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" className="opacity-75" />
                </>
              ) : (
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              )}
            </svg>
            <span>{isExecuting ? 'Executing Arbitrage...' : `Claim & Execute (+${task.reward || '0.25 SOL'})`}</span>
          </button>

          <button
            onClick={() => onCancel(task.id)}
            className="flex items-center gap-1 text-xs text-slate-500 hover:text-red-400 transition-colors"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>
            Cancel
          </button>
        </div>
      )}

      {task.status.toLowerCase() === 'completed' && (
        <div className="mt-3 pt-2.5 border-t border-white/[0.06] flex items-center gap-2 text-xs text-emerald-400 font-medium">
          <svg className="w-3.5 h-3.5 text-emerald-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span className="font-mono text-[11px]">Bounty Settled · {task.reward} Credited to Agent Treasury</span>
        </div>
      )}
    </div>
  );
}
