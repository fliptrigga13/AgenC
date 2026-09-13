import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { VoiceState, VoiceMode } from '../../types';
import { VoiceButton } from './VoiceButton';

interface ChatInputProps {
  onSend: (content: string, attachments?: File[]) => void;
  onStop?: () => void;
  isGenerating?: boolean;
  disabled?: boolean;
  voiceState?: VoiceState;
  voiceMode?: VoiceMode;
  onVoiceToggle?: () => void;
  onPushToTalkStart?: () => void;
  onPushToTalkStop?: () => void;
}

interface SlashCommandOption {
  name: string;
  description: string;
  args?: string;
}

const SLASH_COMMANDS: SlashCommandOption[] = [
  { name: 'help', description: 'Show available commands' },
  { name: 'status', description: 'Show agent status' },
  { name: 'new', description: 'Start a new session' },
  { name: 'reset', description: 'Reset session and clear context' },
  { name: 'restart', description: 'Restart current chat context' },
  { name: 'stop', description: 'Pause the agent' },
  { name: 'start', description: 'Resume the agent' },
  { name: 'context', description: 'Show context window usage' },
  { name: 'compact', description: 'Force conversation compaction' },
  { name: 'model', description: 'Show current model', args: '[name]' },
  { name: 'skills', description: 'List available skills' },
  { name: 'task', description: 'Show current task status' },
  { name: 'tasks', description: 'List tasks' },
  { name: 'balance', description: 'Show token balance' },
  { name: 'reputation', description: 'Show reputation score' },
  { name: 'eval', description: 'Model eval or in-session tool eval', args: '[prompt] | full [prompt] | script [args]' },
  { name: 'progress', description: 'Show recent task progress' },
  { name: 'pipeline', description: 'Run pipeline from JSON steps', args: '<json>' },
  { name: 'resume', description: 'Resume halted pipeline', args: '[pipeline-id]' },
  { name: 'goal', description: 'Create or list goals', args: '[description]' },
  { name: 'desktop', description: 'Desktop sandbox control', args: '<start|stop|status|vnc|list|attach> [--memory 4g] [--cpu 2.0]' },
];

function getSlashQuery(value: string): string | null {
  if (!value.startsWith('/')) return null;
  if (value.includes('\n')) return null;
  const spaceIndex = value.indexOf(' ');
  if (spaceIndex !== -1) return null;
  return value.slice(1).toLowerCase();
}

export function ChatInput({
  onSend,
  onStop,
  isGenerating = false,
  disabled,
  voiceState = 'inactive',
  voiceMode = 'vad',
  onVoiceToggle,
  onPushToTalkStart,
  onPushToTalkStop,
}: ChatInputProps) {
  const [value, setValue] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [activeCommandIndex, setActiveCommandIndex] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const slashQuery = useMemo(() => getSlashQuery(value), [value]);
  const visibleCommands = useMemo(() => {
    if (slashQuery === null) return [];
    if (!slashQuery) return SLASH_COMMANDS;
    return SLASH_COMMANDS.filter((cmd) => cmd.name.startsWith(slashQuery));
  }, [slashQuery]);
  const showCommandMenu = visibleCommands.length > 0;

  useEffect(() => {
    setActiveCommandIndex(0);
  }, [slashQuery]);

  const focusComposer = useCallback(() => {
    const focus = () => {
      const el = textareaRef.current;
      if (!el) return;
      el.focus({ preventScroll: true });
      const cursor = el.value.length;
      el.setSelectionRange(cursor, cursor);
    };
    focus();
    if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
      window.requestAnimationFrame(focus);
    }
  }, []);

  useEffect(() => {
    if (disabled) return;
    const active = document.activeElement;
    const activeIsTextInput =
      active instanceof HTMLInputElement ||
      active instanceof HTMLTextAreaElement ||
      active instanceof HTMLSelectElement ||
      (active instanceof HTMLElement && active.isContentEditable);
    if (activeIsTextInput && active !== textareaRef.current) return;
    focusComposer();
  }, [disabled, focusComposer]);

  const applyCommand = useCallback((cmd: SlashCommandOption) => {
    const nextValue = `/${cmd.name} `;
    setValue(nextValue);
    setActiveCommandIndex(0);
    focusComposer();
  }, [focusComposer]);

  const handleSubmit = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed && attachments.length === 0) return;
    if (disabled) return;
    onSend(trimmed, attachments.length > 0 ? attachments : undefined);
    setValue('');
    setAttachments([]);

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    focusComposer();
  }, [attachments, disabled, focusComposer, onSend, value]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setAttachments((prev) => [...prev, ...Array.from(files)]);
    }
    e.target.value = '';
  }, []);

  const removeAttachment = useCallback((index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (showCommandMenu) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setActiveCommandIndex((prev) => (prev + 1) % visibleCommands.length);
          return;
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          setActiveCommandIndex((prev) => (prev - 1 + visibleCommands.length) % visibleCommands.length);
          return;
        }
        if (e.key === 'Enter' || e.key === 'Tab') {
          e.preventDefault();
          const selected = visibleCommands[activeCommandIndex];
          if (selected) applyCommand(selected);
          return;
        }
      }
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [activeCommandIndex, applyCommand, handleSubmit, showCommandMenu, visibleCommands],
  );

  const handleInput = useCallback(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
    }
  }, []);

  return (
    <div className="px-3 pb-3 md:px-6 md:pb-4">
      <div className="border border-[#ff7700]/40 bg-[#0b0c13]/95 backdrop-blur-md rounded-xl overflow-visible relative shadow-[0_0_22px_rgba(255,107,0,0.14)] focus-within:border-[#ff9933] focus-within:shadow-[0_0_30px_rgba(255,119,0,0.32)] transition-all duration-300">
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleFileSelect}
          accept="image/*,.pdf,.txt,.md,.json,.csv,.doc,.docx"
        />

        {/* Attachment chips */}
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 px-4 pt-3">
            {attachments.map((file, i) => (
              <span
                key={`${file.name}-${i}`}
                className="inline-flex items-center gap-2 px-2.5 py-1 text-xs text-cyan-300 border border-cyan-500/30 rounded-lg bg-cyan-950/30 backdrop-blur-sm"
              >
                <svg className="w-3.5 h-3.5 text-cyan-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
                <span className="font-mono truncate max-w-[180px]">{file.name}</span>
                <button
                  onClick={() => removeAttachment(i)}
                  className="text-slate-400 hover:text-red-400 transition-colors p-0.5"
                >
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Prompt line */}
        <div className="flex items-start gap-3 px-4 py-3">
          <div className="flex items-center justify-center w-5 h-5 rounded bg-[#ff7700]/20 border border-[#ff7700]/50 text-[#ffaa33] font-mono text-xs font-bold shrink-0 mt-0.5 shadow-[0_0_8px_#ff7700]">
            ⚡
          </div>
          <textarea
            ref={textareaRef}
            data-chat-composer="true"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onInput={handleInput}
            placeholder="Enter command..."
            disabled={disabled}
            rows={1}
            className="flex-1 text-sm text-white resize-none focus:outline-none placeholder:text-slate-500 disabled:opacity-50 bg-transparent leading-relaxed caret-[#ffaa33] font-sans"
          />
        </div>

        {/* Slash command menu */}
        {showCommandMenu && (
          <div
            data-testid="slash-command-menu"
            className="mx-4 mb-3 border border-[#ff7700]/30 bg-[#0c0d15]/95 backdrop-blur-md rounded-lg overflow-hidden shadow-[0_0_25px_rgba(0,0,0,0.9)]"
          >
            <div className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-[#ffaa33] font-mono font-semibold border-b border-[#ff7700]/20 bg-[#ff7700]/10 flex items-center justify-between">
              <span>Commands</span>
              <span className="text-slate-400 font-normal">Use ↑↓ to navigate • Enter to select</span>
            </div>
            <div className="max-h-56 overflow-y-auto divide-y divide-white/[0.04]">
              {visibleCommands.map((cmd, idx) => (
                <button
                  key={cmd.name}
                  type="button"
                  data-testid={`slash-command-${cmd.name}`}
                  onClick={() => applyCommand(cmd)}
                  className={`w-full text-left px-3.5 py-2 transition-all text-xs ${
                    idx === activeCommandIndex ? 'bg-[#ff7700]/20 text-[#ffaa33] font-semibold pl-4' : 'text-slate-300 hover:bg-white/[0.04]'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[#ffaa33] font-mono font-bold">/{cmd.name}</span>
                    {cmd.args && <span className="text-slate-500 font-mono text-[11px]">{cmd.args}</span>}
                  </div>
                  <div className="mt-0.5 text-slate-400 text-[11px]">{cmd.description}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Bottom row: attach, mic, send/stop */}
        <div className="flex items-center justify-between gap-3 px-4 pb-3 pt-1 border-t border-white/[0.05]">
          <div className="flex items-center gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-[#ffaa33] hover:bg-white/[0.04] border border-white/10 hover:border-[#ff7700]/40 transition-all disabled:opacity-40"
              title="Attach file"
            >
              <svg className="w-3.5 h-3.5 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
              </svg>
              <span>Attach</span>
            </button>
          </div>

          <div className="flex items-center gap-2.5">
            {onVoiceToggle && (
              <VoiceButton
                voiceState={voiceState}
                mode={voiceMode}
                onToggle={onVoiceToggle}
                onPushToTalkStart={onPushToTalkStart}
                onPushToTalkStop={onPushToTalkStop}
                disabled={disabled}
              />
            )}

            {isGenerating ? (
              <button
                onClick={onStop}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs text-white bg-gradient-to-r from-red-600 to-amber-600 hover:brightness-110 font-bold transition-all active:scale-95 shadow-[0_0_16px_rgba(239,68,68,0.5)]"
                title="Stop generation"
              >
                <span className="w-2.5 h-2.5 rounded-sm bg-white animate-pulse" />
                <span>Stop</span>
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={disabled || (!value.trim() && attachments.length === 0)}
                className="btn-orange-primary flex items-center gap-2 px-5 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-30 disabled:cursor-not-allowed active:scale-95 shadow-[0_0_20px_rgba(255,107,0,0.45)] cursor-pointer"
                title="Send message"
              >
                <span>Dispatch</span>
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
