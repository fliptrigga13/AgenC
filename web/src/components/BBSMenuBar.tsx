import { useEffect } from 'react';
import type { ViewId } from '../types';

interface BBSMenuBarProps {
  currentView: ViewId;
  onViewChange: (view: ViewId) => void;
}

interface MenuItem {
  key: string;
  label: string;
  view: ViewId;
  icon: string;
  ariaLabel: string;
}

const MENU_ITEMS: MenuItem[] = [
  { key: '1', label: 'Chat', view: 'chat', ariaLabel: '[1] CHAT', icon: 'M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z' },
  { key: '2', label: 'Telemetry', view: 'status', ariaLabel: '[2] DASH', icon: 'M13 10V3L4 14h7v7l9-11h-7z' },
  { key: '3', label: 'Skills', view: 'skills', ariaLabel: '[3] TOOLS', icon: 'M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4' },
  { key: '4', label: 'Tasks', view: 'tasks', ariaLabel: '[4] TASKS', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4' },
  { key: '5', label: 'Memory', view: 'memory', ariaLabel: '[5] MEMORY', icon: 'M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4' },
  { key: '6', label: 'Sandboxes', view: 'desktop', ariaLabel: '[6] DESKTOP', icon: 'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
  { key: '7', label: 'Live Feed', view: 'activity', ariaLabel: '[7] FEED', icon: 'M6 5c7.18 0 13 5.82 13 13M6 11a7 7 0 017 7m-6 0a1 1 0 11-2 0 1 1 0 012 0z' },
  { key: 'M', label: 'Marketplace', view: 'marketplace', ariaLabel: '[M] MARKET', icon: 'M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z' },
  { key: 'G', label: 'Governance', view: 'governance', ariaLabel: '[G] GOV', icon: 'M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z' },
  { key: 'R', label: 'Reputation', view: 'reputation', ariaLabel: '[R] REPUTE', icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' },
  { key: '8', label: 'Settings', view: 'settings', ariaLabel: '[8] SETTINGS', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z' },
  { key: '9', label: 'Wallet', view: 'payment', ariaLabel: '[9] WALLET', icon: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z' },
];

export function BBSMenuBar({ currentView, onViewChange }: BBSMenuBarProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const item = MENU_ITEMS.find((m) => m.key.toLowerCase() === e.key.toLowerCase());
      if (item) {
        e.preventDefault();
        onViewChange(item.view);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onViewChange]);

  return (
    <nav className="shrink-0 border-b border-[#ff7700]/25 bg-[#07080f]/95 backdrop-blur-xl overflow-x-auto relative z-10">
      <div className="flex items-center gap-1.5 px-4 py-2 min-w-max">
        {MENU_ITEMS.map((item) => {
          const isActive = currentView === item.view;
          return (
            <button
              key={item.view}
              onClick={() => onViewChange(item.view)}
              aria-label={item.ariaLabel}
              className={`group flex items-center gap-2 px-3 py-1.5 text-xs rounded-lg transition-all duration-200 whitespace-nowrap ${
                isActive
                  ? 'border border-[#ffaa33]/45 bg-gradient-to-r from-[#281307] via-[#1a0c04] to-[#0f0703] text-[#ffb84d] font-semibold shadow-[0_2px_14px_rgba(255,119,0,0.18),inset_0_1px_0_rgba(255,200,100,0.15)]'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.04] border border-transparent'
              }`}
            >
              {/* SVG Icon */}
              <svg
                className={`w-3.5 h-3.5 transition-colors ${
                  isActive ? 'text-[#ff7700] drop-shadow-[0_0_6px_#ff7700]' : 'text-slate-500 group-hover:text-amber-400'
                }`}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d={item.icon} />
              </svg>

              <span className={`tracking-wide font-medium ${isActive ? 'glossy-amber-shine font-bold' : ''}`}>
                {item.label}
              </span>

              {/* Futuristic Micro Shortcut Badge */}
              <span
                className={`px-1.5 py-0.5 rounded text-[9px] font-mono transition-colors ${
                  isActive
                    ? 'bg-[#ff7700]/30 text-amber-200 border border-[#ff7700]/60 font-bold'
                    : 'bg-white/[0.05] text-slate-500 group-hover:text-slate-300'
                }`}
              >
                {item.key}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
