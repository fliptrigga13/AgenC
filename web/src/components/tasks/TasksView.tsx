import { useEffect, useMemo, useState } from 'react';
import type { TaskInfo } from '../../types';
import { TaskCard } from './TaskCard';
import { CreateTaskForm } from './CreateTaskForm';

const FILTERS = [
  { label: 'All', value: '' },
  { label: 'Open', value: 'open' },
  { label: 'In Progress', value: 'in_progress' },
  { label: 'Completed', value: 'completed' },
  { label: 'Cancelled', value: 'cancelled' },
] as const;

interface TasksViewProps {
  tasks: TaskInfo[];
  onRefresh: () => void;
  onCreate: (params: Record<string, unknown>) => void;
  onCancel: (taskId: string) => void;
  onClaim?: (taskId: string) => void;
}

export function TasksView({ tasks, onRefresh, onCreate, onCancel, onClaim }: TasksViewProps) {
  const [filter, setFilter] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    onRefresh();
  }, [onRefresh]);

  // Reverse order (newest first) and apply status filter and search query
  const filtered = useMemo(() => {
    let result = [...tasks].reverse();
    if (filter) {
      result = result.filter((t) => t.status.toLowerCase() === filter);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter((t) =>
        (t.description && t.description.toLowerCase().includes(q)) ||
        (t.id && t.id.toLowerCase().includes(q))
      );
    }
    return result;
  }, [tasks, filter, search]);

  // Count per status for filter badges
  const counts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const t of tasks) {
      const key = t.status.toLowerCase();
      m[key] = (m[key] ?? 0) + 1;
    }
    return m;
  }, [tasks]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-tetsuo-200">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-accent-bg flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-accent" strokeWidth="2" strokeLinecap="round">
              <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
            </svg>
          </div>
          <div>
            <h2 className="text-base font-bold glossy-text-shine tracking-tight font-heading">Tasks</h2>
            {tasks.length > 0 && (
              <div className="text-[10px] text-tetsuo-400 mt-0.5">{tasks.length} task{tasks.length !== 1 ? 's' : ''}</div>
            )}
          </div>
        </div>
        <button
          onClick={onRefresh}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-tetsuo-400 hover:text-accent hover:bg-tetsuo-100 transition-all duration-200 active:scale-90"
          title="Refresh"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" />
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
          </svg>
        </button>
      </div>

      {/* Filter chips & Search */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-2.5 border-b border-white/[0.08] bg-[#07080f]/90 backdrop-blur-md">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {FILTERS.map((f) => {
            const count = f.value ? (counts[f.value] ?? 0) : tasks.length;
            const active = filter === f.value;
            return (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all duration-200 ${
                  active
                    ? 'bg-gradient-to-r from-[#FF7700] to-[#FFAA22] text-[#06070a] shadow-[0_2px_12px_rgba(255,119,0,0.3)]'
                    : 'bg-white/[0.04] text-slate-400 hover:text-white hover:bg-white/[0.08] border border-white/5'
                }`}
              >
                {f.label}
                {count > 0 && (
                  <span className={`text-[10px] font-mono ${active ? 'text-black/75 font-bold' : 'text-slate-500'}`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Task Search Bar */}
        <div className="relative w-full sm:w-64">
          <div className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-[#ffaa33]">
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tasks..."
            className="w-full bg-[#10121c]/90 border border-white/10 rounded-lg pl-8 pr-7 py-1 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-[#ffaa33]/70 focus:shadow-[0_0_12px_rgba(255,119,0,0.2)] transition-all"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs transition-colors"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6"><div className="max-w-2xl mx-auto space-y-3">
        <div className="animate-list-item" style={{ animationDelay: '0ms' }}>
          <CreateTaskForm onCreate={onCreate} />
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-12">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-tetsuo-200" strokeWidth="1.5" strokeLinecap="round">
              <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
            </svg>
            <span className="text-sm text-tetsuo-400">
              {filter ? `No ${FILTERS.find((f) => f.value === filter)?.label.toLowerCase()} tasks` : 'No tasks found'}
            </span>
          </div>
        ) : (
          filtered.map((task, i) => (
            <div key={task.id} className="animate-list-item" style={{ animationDelay: `${(i + 1) * 50}ms` }}>
              <TaskCard task={task} onCancel={onCancel} onClaim={onClaim} />
            </div>
          ))
        )}
      </div></div>
    </div>
  );
}
