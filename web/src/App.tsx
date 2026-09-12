import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ViewId, WSMessage, ApprovalRequest } from './types';
import {
  WS_VOICE_SPEECH_STOPPED,
  WS_VOICE_DELEGATION,
  WS_VOICE_USER_TRANSCRIPT,
  WS_VOICE_TRANSCRIPT,
  WS_VOICE_RESPONSE_DONE,
} from './constants';
import { useWebSocket } from './hooks/useWebSocket';
import { useTheme } from './hooks/useTheme';
import { useChat } from './hooks/useChat';
import { useVoice } from './hooks/useVoice';
import { useAgentStatus } from './hooks/useAgentStatus';
import { useSkills } from './hooks/useSkills';
import { useTasks } from './hooks/useTasks';
import { useMemory } from './hooks/useMemory';
import { useApprovals } from './hooks/useApprovals';
import { useSettings } from './hooks/useSettings';
import { useWallet } from './hooks/useWallet';
import { useActivityFeed } from './hooks/useActivityFeed';
import { useAgents } from './hooks/useAgents';
import { useDesktop } from './hooks/useDesktop';
import { ErrorBoundary } from './components/ErrorBoundary';
import { BBSHeader } from './components/BBSHeader';
import { BBSMenuBar } from './components/BBSMenuBar';
import { BBSStatusBar } from './components/BBSStatusBar';
import { ApprovalBanner } from './components/approvals/ApprovalBanner';
import { ApprovalDialog } from './components/approvals/ApprovalDialog';
import { ChatView } from './components/chat/ChatView';
import { AgentStatusView } from './components/dashboard/AgentStatusView';
import { SkillsView } from './components/skills/SkillsView';
import { TasksView } from './components/tasks/TasksView';
import { MemoryView } from './components/memory/MemoryView';
import { ActivityFeedView } from './components/activity/ActivityFeedView';
import { SettingsView } from './components/settings/SettingsView';
import { PaymentView } from './components/payment/PaymentView';
import { DesktopView } from './components/desktop/DesktopView';
import { MarketplaceView } from './components/marketplace/MarketplaceView';
import { GovernanceView } from './components/governance/GovernanceView';
import { ReputationView } from './components/reputation/ReputationView';
import {
  INITIAL_MARKETPLACE_SKILLS,
  INITIAL_GOVERNANCE_PROPOSALS,
  INITIAL_REPUTATION_STAKE,
  INITIAL_REPUTATION_DELEGATIONS,
  INITIAL_FEED_POSTS,
} from './data/onChainData';
import type {
  MarketplaceSkill,
  GovernanceProposal,
  ReputationStakeInfo,
  ReputationDelegationInfo,
  FeedPostInfo,
} from './types';

const CHAT_COMPOSER_SELECTOR = 'textarea[data-chat-composer="true"]';

interface ComposerFocusSnapshot {
  element: HTMLTextAreaElement;
  selectionStart: number;
  selectionEnd: number;
}

function captureFocusedComposer(): ComposerFocusSnapshot | null {
  if (typeof document === 'undefined') return null;
  const active = document.activeElement;
  if (!(active instanceof HTMLTextAreaElement)) return null;
  if (active.dataset.chatComposer !== 'true') return null;

  return {
    element: active,
    selectionStart: active.selectionStart ?? active.value.length,
    selectionEnd: active.selectionEnd ?? active.value.length,
  };
}

function restoreComposerFocus(snapshot: ComposerFocusSnapshot) {
  const restore = () => {
    if (typeof document === 'undefined') return;
    const active = document.activeElement;
    const target = document.body.contains(snapshot.element)
      ? snapshot.element
      : document.querySelector(CHAT_COMPOSER_SELECTOR);
    if (!(target instanceof HTMLTextAreaElement)) return;

    const activeIsNeutral =
      active === null
      || active === document.body
      || active === target
      || active instanceof HTMLIFrameElement;

    if (!activeIsNeutral) return;

    target.focus();
    const start = Math.min(snapshot.selectionStart, target.value.length);
    const end = Math.min(snapshot.selectionEnd, target.value.length);
    target.setSelectionRange(start, end);
  };

  if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
    window.requestAnimationFrame(() => window.requestAnimationFrame(restore));
    return;
  }

  setTimeout(restore, 0);
}

export default function App() {
  const [currentView, setCurrentView] = useState<ViewId>('chat');
  const [selectedApproval, setSelectedApproval] = useState<ApprovalRequest | null>(null);
  const { theme } = useTheme();

  // WebSocket connection
  const { state: connectionState, send } = useWebSocket({
    onMessage: handleWSMessage,
  });

  const connected = connectionState === 'connected';

  // Type helper for hooks that expose handleMessage as an extra property
  type WithHandler<T> = T & { handleMessage: (msg: WSMessage) => void };

  // Hooks
  const chat = useChat({ send, connected });
  const handleDelegationResult = useCallback((task: string, content: string) => {
    chat.injectMessage(`[Voice] ${task}`, 'user');
    chat.injectMessage(content, 'agent');
  }, [chat]);
  const voice = useVoice({ send, onDelegationResult: handleDelegationResult });
  const agentStatus = useAgentStatus({ send, connected }) as WithHandler<ReturnType<typeof useAgentStatus>>;
  const skills = useSkills({ send }) as WithHandler<ReturnType<typeof useSkills>>;
  const tasks = useTasks({ send }) as WithHandler<ReturnType<typeof useTasks>>;
  const memory = useMemory({ send }) as WithHandler<ReturnType<typeof useMemory>>;
  const approvals = useApprovals({ send }) as WithHandler<ReturnType<typeof useApprovals>>;
  const gatewaySettings = useSettings({ send, connected });
  const walletInfo = useWallet({ send, connected });
  const activityFeed = useActivityFeed({ send, connected });
  const agentsData = useAgents({ send, connected }) as WithHandler<ReturnType<typeof useAgents>>;
  const desktop = useDesktop({ send, connected });
  const [desktopPanelOpen, setDesktopPanelOpen] = useState(false);
  const prevVncUrl = useRef<string | null>(null);
  const suppressNextVoiceTranscript = useRef(false);

  const sessionDesktopUrl = useMemo(
    () => desktop.vncUrlForSession(chat.sessionId)
      ?? (voice.isVoiceActive ? desktop.activeVncUrl : null),
    [desktop, chat.sessionId, voice.isVoiceActive],
  );

  const toggleDesktopPanel = useCallback(() => {
    setDesktopPanelOpen((prev) => !prev);
  }, []);

  // Auto-open desktop panel when a sandbox becomes ready
  useEffect(() => {
    if (sessionDesktopUrl && !prevVncUrl.current) {
      const focusedComposer = captureFocusedComposer();
      setDesktopPanelOpen(true);
      if (focusedComposer) {
        restoreComposerFocus(focusedComposer);
      }
    }
    prevVncUrl.current = sessionDesktopUrl;
  }, [sessionDesktopUrl]);

  // Periodically refresh sandbox list
  const desktopRefresh = desktop.refresh;
  useEffect(() => {
    if (!connected) return;
    const id = setInterval(() => desktopRefresh(), 5000);
    return () => clearInterval(id);
  }, [connected, desktopRefresh]);

  // Voice toggle
  const handleVoiceToggle = useCallback(() => {
    if (voice.isVoiceActive) {
      voice.stopVoice();
    } else {
      void voice.startVoice();
    }
  }, [voice]);

  // Central message router
  function handleWSMessage(msg: WSMessage) {
    chat.handleMessage(msg);
    voice.handleMessage(msg);
    agentStatus.handleMessage(msg);
    skills.handleMessage(msg);
    tasks.handleMessage(msg);
    memory.handleMessage(msg);
    approvals.handleMessage(msg);
    gatewaySettings.handleMessage(msg);
    walletInfo.handleMessage(msg);
    activityFeed.handleMessage(msg);
    agentsData.handleMessage(msg);
    desktop.handleMessage(msg);

    const payload = (msg.payload ?? {}) as Record<string, unknown>;
    if (msg.type === WS_VOICE_DELEGATION) {
      const status = payload.status as string;
      if (status === 'completed') {
        suppressNextVoiceTranscript.current = true;
      } else if (status === 'started' || status === 'error' || status === 'blocked') {
        suppressNextVoiceTranscript.current = false;
      }
    }
    if (msg.type === WS_VOICE_RESPONSE_DONE) {
      suppressNextVoiceTranscript.current = false;
    }

    if (msg.type === WS_VOICE_SPEECH_STOPPED) {
      chat.injectMessage('[Voice]', 'user');
    }
    if (msg.type === WS_VOICE_USER_TRANSCRIPT && typeof payload.text === 'string') {
      chat.replaceLastUserMessage(payload.text);
    }
    if (msg.type === WS_VOICE_TRANSCRIPT && payload.done && typeof payload.text === 'string') {
      if (suppressNextVoiceTranscript.current) {
        suppressNextVoiceTranscript.current = false;
        return;
      }
      chat.injectMessage(payload.text, 'agent');
    }
  }

  const handleApprove = useCallback(
    (requestId: string) => {
      approvals.respond(requestId, true);
      setSelectedApproval(null);
    },
    [approvals],
  );

  const handleDeny = useCallback(
    (requestId: string) => {
      approvals.respond(requestId, false);
      setSelectedApproval(null);
    },
    [approvals],
  );

  // On-Chain Marketplace, Governance, and Reputation state
  const [marketplaceSkills, setMarketplaceSkills] = useState(INITIAL_MARKETPLACE_SKILLS);
  const [governanceProposals, setGovernanceProposals] = useState(INITIAL_GOVERNANCE_PROPOSALS);
  const [reputationStake, setReputationStake] = useState<ReputationStakeInfo | null>(INITIAL_REPUTATION_STAKE);
  const [reputationDelegations, setReputationDelegations] = useState(INITIAL_REPUTATION_DELEGATIONS);
  const [feedPosts, setFeedPosts] = useState<FeedPostInfo[]>(INITIAL_FEED_POSTS);

  const handleUpvotePost = useCallback((postPda: string) => {
    setFeedPosts((prev) =>
      prev.map((p) => {
        if (p.pda !== postPda) return p;
        const nextUpvotes = p.hasUpvoted ? p.upvotes - 1 : p.upvotes + 1;
        return { ...p, upvotes: nextUpvotes, hasUpvoted: !p.hasUpvoted };
      }),
    );
  }, []);

  const handleCreatePost = useCallback((params: { topic: string; content: string }) => {
    const pseudoPda = `Post${Array.from({ length: 36 }, () =>
      Math.floor(Math.random() * 36).toString(36),
    ).join('')}`;
    const pseudoHash = `bafybei${Array.from({ length: 48 }, () =>
      Math.floor(Math.random() * 36).toString(36),
    ).join('')}`;
    const newPost: FeedPostInfo = {
      pda: pseudoPda,
      author: 'local-operator.sol',
      authorAgentPda: 'AgntCurrentAuthority11111111111111111111',
      topic: params.topic,
      content: params.content,
      contentHash: pseudoHash,
      upvotes: 1,
      hasUpvoted: true,
      createdAt: Date.now(),
      parentPost: null,
      replyCount: 0,
    };
    setFeedPosts((prev) => [newPost, ...prev]);
  }, []);

  const handlePurchaseSkill = useCallback((skill: MarketplaceSkill | string) => {
    const id = typeof skill === 'string' ? skill : skill.id;
    setMarketplaceSkills((prev) =>
      prev.map((s) => (s.id === id ? { ...s, downloads: s.downloads + 1 } : s))
    );
  }, []);

  const handleRateSkill = useCallback((skillId: string, rating: number) => {
    setMarketplaceSkills((prev) =>
      prev.map((s) => {
        if (s.id !== skillId) return s;
        const newCount = s.ratingCount + 1;
        const newRating = Number(((s.rating * s.ratingCount + rating) / newCount).toFixed(1));
        return { ...s, rating: newRating, ratingCount: newCount };
      })
    );
  }, []);

  const handlePublishSkill = useCallback(
    (params: {
      name: string;
      description: string;
      tags: string[];
      priceSol: string;
      content: string;
    }) => {
      const pseudoId = params.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const pseudoPda = `Mkt${Array.from({ length: 36 }, () => Math.floor(Math.random() * 36).toString(36)).join('')}`;
      const newSkill: MarketplaceSkill = {
        id: pseudoId,
        pda: pseudoPda,
        name: params.name,
        description: params.description,
        tags: params.tags,
        priceSol: params.priceSol,
        priceLamports: BigInt(Math.floor(parseFloat(params.priceSol || '0') * 1e9)).toString(),
        author: 'current-user.sol',
        authorAgentPda: 'AgntCurrentLocalUserAuthority11111111111111',
        contentHash: 'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi',
        isActive: true,
        version: 1,
        rating: 5.0,
        ratingCount: 1,
        downloads: 0,
        registeredAt: Date.now(),
        updatedAt: Date.now(),
      };
      setMarketplaceSkills((prev) => [newSkill, ...prev]);
    },
    [],
  );

  const handleVoteProposal = useCallback((proposalPda: string, approve: boolean) => {
    setGovernanceProposals((prev) =>
      prev.map((p) => {
        if (p.pda !== proposalPda) return p;
        const prevFor = BigInt(p.votesFor);
        const prevAgainst = BigInt(p.votesAgainst);
        const addWeight = BigInt('1000000');
        return {
          ...p,
          votesFor: (approve ? prevFor + addWeight : prevFor).toString(),
          votesAgainst: (!approve ? prevAgainst + addWeight : prevAgainst).toString(),
          totalVoters: p.totalVoters + 1,
        };
      })
    );
  }, []);

  const handleExecuteProposal = useCallback((proposalPda: string) => {
    setGovernanceProposals((prev) =>
      prev.map((p) => (p.pda === proposalPda ? { ...p, status: 'Executed', executedAt: Date.now() } : p))
    );
  }, []);

  const handleCreateProposal = useCallback(
    (params: {
      title: string;
      description: string;
      proposalType: GovernanceProposal['proposalType'];
      payload?: string;
    }) => {
      const pseudoPda = `Gov${Array.from({ length: 38 }, () => Math.floor(Math.random() * 36).toString(36)).join('')}`;
      const newProposal: GovernanceProposal = {
        pda: pseudoPda,
        proposer: 'AgntCurrentLocalUserAuthority11111111111111',
        nonce: (Date.now() % 1000).toString(),
        title: params.title,
        description: params.description,
        proposalType: params.proposalType,
        status: 'Active',
        votesFor: '1000000',
        votesAgainst: '0',
        totalVoters: 1,
        quorum: '10000000',
        votingDeadline: Date.now() + 7 * 86400000,
        executionAfter: Date.now() + 9 * 86400000,
        createdAt: Date.now(),
        payload: params.payload,
      };
      setGovernanceProposals((prev) => [newProposal, ...prev]);
    },
    [],
  );

  const handleStakeReputation = useCallback((amountSol: string) => {
    const addedSol = parseFloat(amountSol);
    if (isNaN(addedSol) || addedSol <= 0) return;
    setReputationStake((prev) => {
      const currentSol = prev ? parseFloat(prev.stakedSol) : 0;
      const totalSol = (currentSol + addedSol).toFixed(2);
      const lamports = BigInt(Math.floor(parseFloat(totalSol) * 1e9)).toString();
      return {
        agentPda: prev?.agentPda ?? 'AgntStkCurrentAuthority11111111111111111',
        stakedLamports: lamports,
        stakedSol: totalSol,
        lockedUntil: Date.now() + 7 * 86400000,
        slashCount: prev?.slashCount ?? 0,
        isUnlocked: false,
      };
    });
  }, []);

  const handleWithdrawReputation = useCallback(() => {
    setReputationStake((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        stakedSol: '0.00',
        stakedLamports: '0',
        isUnlocked: true,
      };
    });
  }, []);

  const handleDelegateReputation = useCallback(
    (params: { delegateePda: string; points: number; durationDays: number }) => {
      const pseudoPda = `Delg${Array.from({ length: 36 }, () => Math.floor(Math.random() * 36).toString(36)).join('')}`;
      const newDelegation: ReputationDelegationInfo = {
        pda: pseudoPda,
        delegatorAgentPda: reputationStake?.agentPda ?? 'AgntStkCurrentAuthority11111111111111111',
        delegateeAgentPda: params.delegateePda,
        points: params.points,
        expiresAt: Date.now() + params.durationDays * 86400000,
        isExpired: false,
      };
      setReputationDelegations((prev) => [newDelegation, ...prev]);
    },
    [reputationStake],
  );

  const handleRevokeReputationDelegation = useCallback((delegationPda: string) => {
    setReputationDelegations((prev) => prev.filter((d) => d.pda !== delegationPda));
  }, []);

  return (
    <ErrorBoundary>
      <div className="flex flex-col h-screen bg-bbs-black">
        <BBSHeader
          connectionState={connectionState}
          approvalCount={approvals.pending.length}
        />
        <BBSMenuBar
          currentView={currentView}
          onViewChange={setCurrentView}
        />

        <ApprovalBanner
          pending={approvals.pending}
          onSelect={setSelectedApproval}
        />

        <main className="flex-1 min-h-0">
          {currentView === 'chat' && (
            <ChatView
              messages={chat.messages}
              isTyping={chat.isTyping}
              onSend={chat.sendMessage}
              onStop={chat.stopGeneration}
              connected={connected}
              voiceState={voice.voiceState}
              voiceTranscript={voice.transcript}
              voiceMode={voice.mode}
              onVoiceToggle={handleVoiceToggle}
              onVoiceModeChange={voice.setMode}
              onPushToTalkStart={voice.pushToTalkStart}
              onPushToTalkStop={voice.pushToTalkStop}
              delegationTask={voice.delegationTask}
              theme={theme}
              chatSessions={chat.sessions}
              activeSessionId={chat.sessionId}
              onSelectSession={chat.resumeSession}
              onNewChat={chat.startNewChat}
              desktopUrl={sessionDesktopUrl}
              desktopOpen={desktopPanelOpen}
              onToggleDesktop={toggleDesktopPanel}
              tokenUsage={chat.tokenUsage}
            />
          )}
          {currentView === 'status' && (
            <AgentStatusView
              status={agentStatus.status}
              onRefresh={agentStatus.refresh}
            />
          )}
          {currentView === 'skills' && (
            <SkillsView
              skills={skills.skills}
              onRefresh={skills.refresh}
              onToggle={skills.toggle}
            />
          )}
          {currentView === 'tasks' && (
            <TasksView
              tasks={tasks.tasks}
              onRefresh={tasks.refresh}
              onCreate={tasks.create}
              onCancel={tasks.cancel}
            />
          )}
          {currentView === 'memory' && (
            <MemoryView
              results={memory.results}
              sessions={memory.sessions}
              onSearch={memory.search}
              onRefreshSessions={memory.refreshSessions}
            />
          )}
          {currentView === 'desktop' && (
            <DesktopView
              sandboxes={desktop.sandboxes}
              loading={desktop.loading}
              error={desktop.error}
              activeSessionId={chat.sessionId}
              onRefresh={desktop.refresh}
              onCreate={desktop.create}
              onAttach={(containerId, sessionId) => desktop.attach(containerId, sessionId)}
              onDestroy={desktop.destroy}
            />
          )}
          {currentView === 'activity' && (
            <ActivityFeedView
              events={activityFeed.events}
              onClear={activityFeed.clear}
              posts={feedPosts}
              onUpvotePost={handleUpvotePost}
              onCreatePost={handleCreatePost}
            />
          )}
          {currentView === 'settings' && (
            <SettingsView
              settings={gatewaySettings}
              autoApprove={approvals.autoApprove}
              onAutoApproveChange={approvals.setAutoApprove}
            />
          )}
          {currentView === 'payment' && (
            <PaymentView wallet={walletInfo} />
          )}
          {currentView === 'marketplace' && (
            <MarketplaceView
              skills={marketplaceSkills}
              onPurchase={handlePurchaseSkill}
              onRate={handleRateSkill}
              onPublish={handlePublishSkill}
            />
          )}
          {currentView === 'governance' && (
            <GovernanceView
              proposals={governanceProposals}
              onVote={handleVoteProposal}
              onExecute={handleExecuteProposal}
              onCreateProposal={handleCreateProposal}
            />
          )}
          {currentView === 'reputation' && (
            <ReputationView
              stakeInfo={reputationStake}
              delegations={reputationDelegations}
              onStake={handleStakeReputation}
              onWithdraw={handleWithdrawReputation}
              onDelegate={handleDelegateReputation}
              onRevokeDelegation={handleRevokeReputationDelegation}
            />
          )}
        </main>

        <BBSStatusBar />

        {selectedApproval && (
          <ApprovalDialog
            request={selectedApproval}
            onApprove={handleApprove}
            onDeny={handleDeny}
            onClose={() => setSelectedApproval(null)}
          />
        )}
      </div>
    </ErrorBoundary>
  );
}
