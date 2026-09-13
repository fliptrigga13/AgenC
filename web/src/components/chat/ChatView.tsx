import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ChatMessage, TokenUsage, VoiceState, VoiceMode } from '../../types';

import type { ChatSessionInfo } from '../../hooks/useChat';
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';
import { VoiceOverlay } from './VoiceOverlay';
import { DesktopPanel } from './DesktopPanel';

interface ChatViewProps {
  messages: ChatMessage[];
  isTyping: boolean;
  onSend: (content: string, attachments?: File[]) => void;
  onStop?: () => void;
  connected: boolean;
  voiceState?: VoiceState;
  voiceTranscript?: string;
  voiceMode?: VoiceMode;
  onVoiceToggle?: () => void;
  onVoiceModeChange?: (mode: VoiceMode) => void;
  onPushToTalkStart?: () => void;
  onPushToTalkStop?: () => void;
  delegationTask?: string;
  theme?: 'light' | 'dark';
  onToggleTheme?: () => void;
  chatSessions?: ChatSessionInfo[];
  activeSessionId?: string | null;
  onSelectSession?: (sessionId: string) => void;
  onNewChat?: () => void;
  desktopUrl?: string | null;
  desktopOpen?: boolean;
  onToggleDesktop?: () => void;
  tokenUsage?: TokenUsage | null;
  onOpenRevenueEngine?: () => void;
}

export function ChatView({
  messages,
  isTyping,
  onSend,
  onStop,
  connected,
  voiceState = 'inactive',
  voiceTranscript = '',
  voiceMode = 'vad',
  onVoiceToggle,
  onVoiceModeChange,
  onPushToTalkStart,
  onPushToTalkStop,
  delegationTask = '',
  theme = 'dark',
  chatSessions = [],
  activeSessionId,
  onSelectSession,
  onNewChat,
  desktopUrl,
  desktopOpen = false,
  onToggleDesktop,
  tokenUsage,
  onOpenRevenueEngine,
}: ChatViewProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sessionsOpen, setSessionsOpen] = useState(false);
  const [contextPanelOpen, setContextPanelOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const toggleSearch = useCallback(() => {
    setSearchOpen((prev) => {
      if (prev) setSearchQuery('');
      return !prev;
    });
  }, []);

  useEffect(() => {
    if (searchOpen) searchInputRef.current?.focus();
  }, [searchOpen]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
        e.preventDefault();
        setSearchOpen(true);
      }
      if (e.key === 'Escape' && searchOpen) {
        setSearchOpen(false);
        setSearchQuery('');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [searchOpen]);

  const matchCount = searchQuery.trim()
    ? messages.filter((m) => m.content.toLowerCase().includes(searchQuery.trim().toLowerCase())).length
    : 0;

  const isEmpty = messages.length === 0 && !isTyping;
  const contextWindowTokens =
    tokenUsage && tokenUsage.contextWindowTokens && tokenUsage.contextWindowTokens > 0
      ? tokenUsage.contextWindowTokens
      : 0;
  const promptTokens =
    tokenUsage && tokenUsage.promptTokens && tokenUsage.promptTokens > 0
      ? tokenUsage.promptTokens
      : tokenUsage?.totalTokens ?? 0;
  const contextUsageRatio = contextWindowTokens > 0
    ? promptTokens / contextWindowTokens
    : 0;
  const sessionBudgetTokens =
    tokenUsage && tokenUsage.budget > 0
      ? tokenUsage.budget
      : 0;
  const sessionBudgetRatio = sessionBudgetTokens > 0
    ? (tokenUsage?.totalTokens ?? 0) / sessionBudgetTokens
    : 0;
  const hasModelContextWindow = contextWindowTokens > 0;
  const displayUsedTokens = hasModelContextWindow
    ? promptTokens
    : tokenUsage?.totalTokens ?? 0;
  const displayTotalTokens = hasModelContextWindow
    ? contextWindowTokens
    : sessionBudgetTokens;
  const displayRatio = hasModelContextWindow
    ? contextUsageRatio
    : sessionBudgetRatio;
  const displayPercent = displayRatio * 100;
  const contextUsageLabel =
    displayUsedTokens > 0 && displayPercent < 1
      ? '<1%'
      : `${Math.round(displayPercent)}%`;
  const contextBarPercent = Math.min(100, Math.max(0, displayPercent));

  // BBS-style context bar
  const contextBarFilled = Math.round(contextBarPercent / 100 * 30);
  const contextBarEmpty = 30 - contextBarFilled;
  const contextBarStr = '\u2588'.repeat(contextBarFilled) + '\u2591'.repeat(contextBarEmpty);

  const delegationSummary = useMemo(() => {
    const latestSubagentMessage = [...messages]
      .reverse()
      .find((message) => (message.subagents?.length ?? 0) > 0);
    if (!latestSubagentMessage?.subagents?.length) return null;

    const bySession = new Map<string, string>();
    for (const subagent of latestSubagentMessage.subagents) {
      const id = subagent.subagentSessionId;
      if (!id || id === '__synthesis__') continue;
      bySession.set(id, subagent.status);
    }
    if (bySession.size === 0) return null;

    let running = 0;
    let failed = 0;
    let completed = 0;
    for (const status of bySession.values()) {
      if (status === 'running' || status === 'started' || status === 'spawned' || status === 'planned') {
        running += 1;
      } else if (status === 'failed' || status === 'cancelled') {
        failed += 1;
      } else if (status === 'completed' || status === 'synthesized') {
        completed += 1;
      }
    }

    return { total: bySession.size, running, failed, completed };
  }, [messages]);

  // ── Welcome / splash state ──
  if (isEmpty) {
    const quickPrompts = [
      {
        icon: '💰',
        badge: 'REVENUE',
        title: 'Autonomous Money Loop',
        desc: 'Execute Jupiter flash arbitrage, claim open escrow bounties, and collect marketplace royalties',
        prompt: 'Start the autonomous revenue cycle: scan open escrow bounties, capture Jupiter DEX arbitrage spreads, and report net earnings.',
      },
      {
        icon: '⚡',
        badge: 'ORACLE',
        title: 'Live SOL/JUP Price Oracle',
        desc: 'Fetch real-time Solana & Jupiter market prices, liquidity, and 24h volume',
        prompt: 'Fetch live SOL and JUP prices with 24h volume analysis',
      },
      {
        icon: '🛡️',
        badge: 'SECURITY',
        title: 'Smart Contract CPI Audit',
        desc: 'Analyze Anchor IDL, verify signer authorization, and check PDA bounds',
        prompt: 'Audit smart contract instructions for reentrancy, signer checks, and PDA safety',
      },
      {
        icon: '📋',
        badge: 'ON-CHAIN',
        title: 'Deploy Bounty Task',
        desc: 'Dispatch an autonomous escrow task to Solana Devnet with reward lock',
        prompt: 'Deploy an autonomous high-priority task with 2.5 SOL escrow to Solana Devnet',
      },
      {
        icon: '🧠',
        badge: 'COGNITIVE',
        title: 'Deep Memory Synthesis',
        desc: 'Recall cross-session memories, audit telemetry, and execute multi-agent synthesis',
        prompt: 'Recall recent memory context and synthesize autonomous agent execution priorities',
      },
    ];

    return (
      <div className="relative flex flex-col h-full bg-[#040508] overflow-y-auto">
        {/* Ambient background glow highlights */}
        <div className="absolute top-12 left-1/2 -translate-x-1/2 w-96 h-96 bg-[#ff7700]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-48 left-1/4 w-64 h-64 bg-[#00E5FF]/05 rounded-full blur-3xl pointer-events-none" />

        <div className="h-2 shrink-0" />

        {/* Central Quantum Neural Holographic Core */}
        <div className="flex flex-col items-center text-center px-4 max-w-4xl mx-auto w-full z-10 animate-welcome-in pt-1 pb-2">
          {/* Animated 3D Quantum Gyro Reactor */}
          <div className="relative w-24 h-24 md:w-32 md:h-32 flex items-center justify-center mb-3">
            {/* Outer Orbiting Energy Ring */}
            <div className="absolute inset-0 rounded-full border-2 border-dashed border-[#ff7700]/40 animate-spin" style={{ animationDuration: '28s' }} />
            <div className="absolute inset-2 rounded-full border border-[#ffaa33]/30 animate-spin" style={{ animationDuration: '18s', animationDirection: 'reverse' }} />

            {/* Cyan Cross-Telemetry Ring */}
            <div className="absolute inset-3 rounded-full border border-[#00e5ff]/35 animate-pulse" />

            {/* Glowing Amber Singularity Core */}
            <div className="relative w-14 h-14 md:w-16 md:h-16 rounded-full bg-gradient-to-tr from-[#ff4400] via-[#ff7700] to-[#ffaa22] shadow-[0_0_35px_rgba(255,119,0,0.85),inset_0_0_15px_rgba(255,255,255,0.6)] flex items-center justify-center animate-orb-breathe">
              {/* Inner core glyph */}
              <svg className="w-7 h-7 md:w-8 md:h-8 text-[#08080d] drop-shadow-md animate-pulse" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="12 2 2 7 12 12 22 7 12 2" />
                <polyline points="2 17 12 22 22 17" />
                <polyline points="2 12 12 17 22 12" />
              </svg>
            </div>

            {/* Orbiting Photon Particles */}
            <div className="absolute w-2 h-2 rounded-full bg-cyan-300 shadow-[0_0_8px_#00e5ff] opacity-80" style={{ top: '12%', left: '82%' }} />
            <div className="absolute w-1.5 h-1.5 rounded-full bg-amber-300 shadow-[0_0_6px_#ffaa00] opacity-70" style={{ bottom: '18%', left: '15%' }} />
          </div>

          {/* Futuristic Title & Badges */}
          <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full border border-[#ff7700]/40 bg-[#1f0d03]/60 backdrop-blur-md mb-2 text-[#ffaa33] text-[11px] font-mono tracking-widest uppercase shadow-[0_0_15px_rgba(255,119,0,0.2)]">
            <span className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-400 shadow-[0_0_8px_#00f59b]' : 'bg-amber-400 shadow-[0_0_8px_#ffaa00]'} animate-pulse`} />
            <span>{connected ? 'QUANTUM AI RUNTIME // SOLANA MESH' : 'INITIALIZING QUANTUM RUNTIME...'}</span>
          </div>

          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight font-heading glossy-text-shine drop-shadow-[0_0_25px_rgba(255,200,100,0.2)] mb-1.5">
            AGENC QUANTUM INTELLIGENCE
          </h1>

          <p className="text-xs md:text-sm text-slate-300 max-w-lg font-normal mb-3 leading-relaxed">
            Autonomous multi-agent execution cockpit for high-throughput Solana operations, decentralized escrow, and on-chain intelligence.
          </p>

          {/* Real-Time Telemetry Stream Badges */}
          <div className="flex flex-wrap items-center justify-center gap-2 mb-4 text-[11px] font-mono">
            <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-white/[0.03] border border-white/[0.08] text-slate-300">
              <span className="text-[#ff7700]">RPC:</span>
              <span className="text-emerald-400 font-semibold">14ms FAST</span>
            </span>
            <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-white/[0.03] border border-white/[0.08] text-slate-300">
              <span className="text-[#ff7700]">ZK-ENCLAVE:</span>
              <span className="text-cyan-400 font-semibold">ISOLATED</span>
            </span>
            <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-white/[0.03] border border-white/[0.08] text-slate-300">
              <span className="text-[#ff7700]">CORE:</span>
              <span className="text-[#ffaa33] font-semibold">v3.0 QUANTUM</span>
            </span>
          </div>

          {/* Interactive Futuristic Prompt Dispatch Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-2xl mb-4">
            {quickPrompts.map((card, i) => (
              <button
                key={i}
                type="button"
                onClick={() => onSend(card.prompt)}
                className="group text-left p-3.5 rounded-xl bg-gradient-to-br from-[#160c06]/85 via-[#0e0910]/75 to-[#07080f]/90 backdrop-blur-xl border border-white/[0.08] hover:border-[#ffaa33]/50 transition-all duration-300 hover:shadow-[0_4px_24px_rgba(255,119,0,0.18)] hover:-translate-y-0.5 flex flex-col justify-between"
              >
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{card.icon}</span>
                    <span className="text-[9px] font-mono font-bold tracking-wider px-2 py-0.5 rounded bg-[#ff7700]/15 text-[#ffaa33] border border-[#ff7700]/30">
                      {card.badge}
                    </span>
                  </div>
                  <svg className="w-3.5 h-3.5 text-slate-500 group-hover:text-[#ffaa33] group-hover:translate-x-1 transition-all" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xs md:text-sm font-semibold text-white group-hover:text-[#ffaa33] transition-colors mb-0.5">
                    {card.title}
                  </h3>
                  <p className="text-[11px] text-slate-400 group-hover:text-slate-300 transition-colors line-clamp-2 leading-relaxed font-sans">
                    {card.desc}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Input Dock */}
        <div className="px-4 md:px-6 max-w-4xl mx-auto w-full mb-2 z-20 animate-welcome-in" style={{ animationDelay: '0.1s' }}>
          <ChatInput
            onSend={onSend}
            onStop={onStop}
            isGenerating={isTyping}
            voiceState={voiceState}
            voiceMode={voiceMode}
            onVoiceToggle={onVoiceToggle}
            onPushToTalkStart={onPushToTalkStart}
            onPushToTalkStop={onPushToTalkStop}
          />
        </div>

        {/* Voice bar */}
        {onVoiceModeChange && onVoiceToggle && (
          <VoiceOverlay
            voiceState={voiceState}
            transcript={voiceTranscript}
            mode={voiceMode}
            onModeChange={onVoiceModeChange}
            onStop={onVoiceToggle}
            onPushToTalkStart={onPushToTalkStart}
            onPushToTalkStop={onPushToTalkStop}
            delegationTask={delegationTask}
          />
        )}

        <div className="h-2 shrink-0" />
      </div>
    );
  }

  // ── Active chat state ──
  return (
    <div className="relative flex flex-col h-full bg-[#040508] animate-chat-enter">
      {/* Super Classy Floating Search Pod */}
      {searchOpen && (
        <div className="px-4 py-2 bg-[#06070c]/80 backdrop-blur-md border-b border-white/[0.06] animate-slide-up">
          <div className="flex items-center gap-3 px-4 py-2 rounded-xl border border-[#ffaa33]/40 bg-gradient-to-r from-[#1c0f06]/95 via-[#0e0a12]/95 to-[#160d08]/95 shadow-[0_4px_24px_rgba(0,0,0,0.6),0_0_18px_rgba(255,119,0,0.12)]">
            {/* Luminous Search Icon */}
            <div className="flex items-center gap-2 text-[#ffb84d] text-xs font-mono font-bold shrink-0">
              <div className="w-6 h-6 rounded-lg bg-[#ff7700]/20 border border-[#ffaa33]/40 flex items-center justify-center shadow-[0_0_10px_rgba(255,119,0,0.25)]">
                <svg className="w-3.5 h-3.5 text-[#ffaa33]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </div>
              <span className="hidden sm:inline tracking-wider text-[11px]">TELEMETRY SEARCH</span>
            </div>

            {/* Input */}
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search conversation telemetry, tool results & logs..."
              className="flex-1 bg-transparent text-xs sm:text-sm text-white placeholder:text-slate-400 outline-none font-sans"
            />

            {/* Match status pill */}
            {searchQuery.trim() ? (
              <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#1e1008] border border-[#ffaa33]/35 text-[11px] font-mono shrink-0 shadow-inner">
                <span className={`w-1.5 h-1.5 rounded-full ${matchCount > 0 ? 'bg-emerald-400 shadow-[0_0_6px_#00f59b]' : 'bg-amber-500'}`} />
                <span className={matchCount > 0 ? 'text-[#ffb84d] font-bold' : 'text-slate-400'}>
                  {matchCount} {matchCount === 1 ? 'match' : 'matches'}
                </span>
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="ml-1 text-slate-400 hover:text-white transition-colors"
                  title="Clear search"
                >
                  ✕
                </button>
              </div>
            ) : (
              <span className="hidden md:inline text-[10px] font-mono text-slate-400 px-2 py-0.5 rounded border border-white/10 shrink-0">
                ESC to close
              </span>
            )}

            {/* Close Button */}
            <button
              onClick={toggleSearch}
              className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors shrink-0"
              title="Close search (Esc)"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Mobile-only: Recent Chats + delegation info */}
      <div className="flex lg:hidden flex-col gap-1 px-4 py-2 border-b border-[#ff7700]/20 bg-[#090b12]/90 backdrop-blur-md">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setSessionsOpen(true)}
            className="text-xs text-slate-300 hover:text-white flex items-center gap-1.5 transition-colors"
          >
            <span>💬 Sessions</span>
            {chatSessions.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-[#ff7700]/20 text-[#ffaa33] text-[10px] font-mono font-bold">
                {chatSessions.length}
              </span>
            )}
          </button>
          <div className="flex items-center gap-2">
            {onNewChat && (
              <button
                onClick={onNewChat}
                className="px-2.5 py-1 rounded-lg text-xs text-[#ffb84d] font-semibold border border-[#ffaa33]/30 bg-[#1e0f06]/70 hover:bg-[#ffaa33]/15 transition-all"
              >
                + New
              </button>
            )}
            {desktopUrl && onToggleDesktop && (
              <button
                onClick={onToggleDesktop}
                className={`px-2 py-0.5 rounded text-xs transition-colors ${desktopOpen ? 'text-emerald-400 bg-emerald-950/40 border border-emerald-500/40' : 'text-slate-400 hover:text-white'}`}
              >
                🖥️ Sandbox
              </button>
            )}
            <button
              onClick={toggleSearch}
              className={`p-1 rounded text-xs transition-colors ${searchOpen ? 'text-[#ffaa33]' : 'text-slate-400 hover:text-white'}`}
            >
              🔍
            </button>
          </div>
        </div>
        {delegationSummary && (
          <span className="text-xs text-cyan-400 font-mono">
            [{delegationSummary.total} agents: {delegationSummary.running > 0 ? `${delegationSummary.running} running` : `${delegationSummary.completed} done`}]
          </span>
        )}
      </div>

      {/* Desktop-only controls row */}
      <div className="hidden md:flex items-center justify-between px-5 py-2 border-b border-[#ff7700]/20 bg-[#080b12]/95 backdrop-blur-xl">
        <div className="flex items-center gap-4">
          {delegationSummary && (
            <span className="text-xs text-cyan-400 font-mono flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_#00e5ff]" />
              <span>{delegationSummary.total} AGENTS ACTIVE:</span>
              <span className="text-white font-bold">{delegationSummary.running > 0 ? `${delegationSummary.running} running` : `${delegationSummary.completed} synchronized`}</span>
            </span>
          )}
        </div>
        <div className="flex items-center gap-2.5 font-sans">
          {onNewChat && (
            <button
              onClick={onNewChat}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs text-[#ffb84d] font-bold border border-[#ffaa33]/35 bg-[#1d0e04]/80 hover:bg-[#ffaa33]/15 transition-all shadow-[0_2px_12px_rgba(255,119,0,0.18)]"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              <span>New Session</span>
            </button>
          )}
          {desktopUrl && onToggleDesktop && (
            <button
              onClick={onToggleDesktop}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold border transition-all ${desktopOpen ? 'border-emerald-500/60 text-emerald-400 bg-emerald-950/40 shadow-[0_0_12px_rgba(0,245,155,0.25)]' : 'border-white/10 text-slate-400 hover:text-white hover:border-white/20'}`}
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                <line x1="8" y1="21" x2="16" y2="21" />
                <line x1="12" y1="17" x2="12" y2="21" />
              </svg>
              <span>{desktopOpen ? 'Hide Sandbox' : 'Sandbox View'}</span>
            </button>
          )}
          {onOpenRevenueEngine && (
            <button
              onClick={onOpenRevenueEngine}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs text-amber-400 font-bold border border-amber-500/40 bg-amber-950/40 hover:bg-amber-500/20 transition-all shadow-[0_2px_12px_rgba(255,119,0,0.2)]"
            >
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              <span>⚡ Revenue Engine</span>
            </button>
          )}
          <button
            onClick={toggleSearch}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold border transition-all ${searchOpen ? 'border-[#ffaa33] text-[#ffaa33] bg-[#ff7700]/15 shadow-[0_2px_12px_rgba(255,119,0,0.2)]' : 'border-white/10 text-slate-400 hover:text-[#ffaa33] hover:border-[#ffaa33]/40'}`}
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <span>Search</span>
          </button>
        </div>
      </div>

      {/* Message list + optional desktop panel */}
      <div className="flex-1 min-h-0 flex">
        <MessageList messages={messages} isTyping={isTyping} theme={theme} searchQuery={searchQuery} />
        {desktopOpen && desktopUrl && (
          <div className="hidden md:block w-[55%] min-w-[480px] h-full shrink-0">
            <DesktopPanel vncUrl={desktopUrl} onClose={onToggleDesktop!} />
          </div>
        )}
      </div>

      {/* Voice bar */}
      {onVoiceModeChange && onVoiceToggle && (
        <VoiceOverlay
          voiceState={voiceState}
          transcript={voiceTranscript}
          mode={voiceMode}
          onModeChange={onVoiceModeChange}
          onStop={onVoiceToggle}
          onPushToTalkStart={onPushToTalkStart}
          onPushToTalkStop={onPushToTalkStop}
          delegationTask={delegationTask}
        />
      )}

      {/* Context usage bar */}
      {tokenUsage && displayTotalTokens > 0 && (
        <div className="relative px-4 py-1.5 border-t border-[#ff7700]/25 bg-[#090a10]/95 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setContextPanelOpen((prev) => !prev)}
              className="text-xs text-[#ffaa33] hover:text-white transition-colors font-mono font-semibold"
            >
              CONTEXT [{contextBarStr}] {contextUsageLabel}
            </button>
          </div>

          {contextPanelOpen && (
            <div className="absolute bottom-[40px] left-4 z-20 w-[min(420px,calc(100vw-2rem))] border border-bbs-border bg-bbs-dark p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold text-bbs-white">
                    {hasModelContextWindow ? 'Model Context Window' : 'Session Token Budget'}
                  </p>
                  <p className="text-xs text-bbs-gray">
                    {displayUsedTokens.toLocaleString()} / {displayTotalTokens.toLocaleString()} tokens
                  </p>
                </div>
                <span className="text-xs font-mono text-bbs-purple">{contextUsageLabel}</span>
              </div>

              <div className="mt-2 text-xs font-mono text-bbs-pink">
                [{contextBarStr}]
              </div>

              <div className="mt-3 space-y-1">
                {tokenUsage.sections && tokenUsage.sections.length > 0 ? (
                  tokenUsage.sections.map((section) => (
                    <div key={section.id} className="flex items-center justify-between text-xs">
                      <span className="text-bbs-lightgray">{section.label}</span>
                      <span className="font-mono text-bbs-gray">
                        {section.percent.toFixed(section.percent >= 10 ? 0 : 1)}% - {section.tokens.toLocaleString()}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-bbs-gray">
                    Section breakdown appears after the next model response.
                  </p>
                )}
              </div>

              {tokenUsage.compacted && (
                <p className="mt-2 text-xs text-bbs-yellow">
                  * Context was auto-compacted to stay within budget.
                </p>
              )}
            </div>
          )}
        </div>
      )}

      <ChatInput
        onSend={onSend}
        onStop={onStop}
        isGenerating={isTyping}
        voiceState={voiceState}
        voiceMode={voiceMode}
        onVoiceToggle={onVoiceToggle}
        onPushToTalkStart={onPushToTalkStart}
        onPushToTalkStop={onPushToTalkStop}
      />

      {/* Mobile sessions bottom sheet */}
      {sessionsOpen && (
        <div className="absolute inset-0 z-50 lg:hidden flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/60" onClick={() => setSessionsOpen(false)} />
          <div className="relative bg-bbs-dark border-t border-bbs-border max-h-[70vh] flex flex-col animate-slide-up">
            <div className="flex items-center justify-between px-4 py-3 border-b border-bbs-border">
              <span className="text-xs font-bold text-bbs-white">RECENT SESSIONS</span>
              <button onClick={() => setSessionsOpen(false)} className="text-xs text-bbs-gray hover:text-bbs-white">[X]</button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {chatSessions.length === 0 ? (
                <div className="px-4 py-8 text-xs text-bbs-gray text-center">No sessions</div>
              ) : (
                chatSessions.map((session) => {
                  const isActive = session.sessionId === activeSessionId;
                  return (
                    <button
                      key={session.sessionId}
                      onClick={() => { onSelectSession?.(session.sessionId); setSessionsOpen(false); }}
                      className={`w-full text-left px-4 py-3 text-xs transition-colors border-b border-bbs-border/50 ${
                        isActive ? 'bg-bbs-surface text-bbs-purple' : 'text-bbs-lightgray hover:bg-bbs-surface'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {isActive && <span className="text-bbs-purple">{'>'}</span>}
                        <span className="truncate">{session.label}</span>
                      </div>
                      <div className="text-bbs-gray mt-0.5 ml-4">
                        {session.messageCount} msgs - {new Date(session.lastActiveAt).toLocaleString()}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
