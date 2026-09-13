import { useCallback, useState } from 'react';

interface CreateTaskFormProps {
  onCreate: (params: Record<string, unknown>) => void;
}

export function CreateTaskForm({ onCreate }: CreateTaskFormProps) {
  const [description, setDescription] = useState('');
  const [reward, setReward] = useState('');
  const [expanded, setExpanded] = useState(false);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!description.trim()) return;
      onCreate({
        description: description.trim(),
        reward: reward ? Number(reward) : undefined,
      });
      setDescription('');
      setReward('');
      setExpanded(false);
    },
    [description, reward, onCreate],
  );

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-[#ffaa33]/35 rounded-xl text-sm font-semibold text-[#ffb84d] bg-[#1a0e05]/80 hover:bg-[#ffaa33]/15 hover:border-[#ffaa33]/60 transition-all duration-200 shadow-[0_2px_12px_rgba(255,119,0,0.15),inset_0_1px_0_rgba(255,200,100,0.1)]"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
        <span>+ Deploy Autonomous Task</span>
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3.5 p-5 rounded-xl border border-[#ff7700]/40 bg-[#0c0e17]/95 backdrop-blur-xl shadow-[0_0_25px_rgba(255,119,0,0.15)] animate-panel-enter">
      <div>
        <label className="text-[11px] text-slate-400 uppercase tracking-widest font-mono font-medium block mb-1.5">Task Objective & Instruction</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full bg-[#05070c] border border-white/10 rounded-lg px-3.5 py-2.5 text-sm text-slate-100 resize-none focus:outline-none focus:border-[#ffaa33] focus:shadow-[0_0_15px_rgba(255,119,0,0.25)] transition-all duration-200 placeholder:text-slate-500 font-sans"
          rows={3}
          placeholder="Describe on-chain objective, contract targets, or agent requirements..."
          autoFocus
        />
      </div>
      <div>
        <label className="text-[11px] text-slate-400 uppercase tracking-widest font-mono font-medium block mb-1.5">Escrow Bounty (SOL)</label>
        <input
          type="number"
          value={reward}
          onChange={(e) => setReward(e.target.value)}
          className="w-full bg-[#05070c] border border-white/10 rounded-lg px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-[#ffaa33] focus:shadow-[0_0_15px_rgba(255,119,0,0.25)] transition-all duration-200 placeholder:text-slate-500 font-mono"
          placeholder="0.00"
        />
      </div>
      <div className="flex gap-2.5 pt-1">
        <button
          type="submit"
          className="btn-orange-primary px-5 py-2 rounded-lg text-sm font-bold active:scale-[0.98] transition-all duration-200"
        >
          Deploy to Solana
        </button>
        <button
          type="button"
          onClick={() => setExpanded(false)}
          className="px-4 py-2 text-slate-400 text-sm hover:text-white transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
