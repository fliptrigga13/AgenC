import { useState, useMemo } from 'react';
import type { GovernanceProposal } from '../../types';

interface GovernanceViewProps {
  proposals: GovernanceProposal[];
  onRefresh?: () => void;
  onVote?: (proposalPda: string, approve: boolean) => void;
  onExecute?: (proposalPda: string) => void;
  onCreateProposal?: (params: {
    title: string;
    description: string;
    proposalType: GovernanceProposal['proposalType'];
    payload?: string;
  }) => void;
}

const STATUS_TABS: Array<'All' | GovernanceProposal['status']> = [
  'All',
  'Active',
  'Executed',
  'Defeated',
  'Cancelled',
];

export function GovernanceView({
  proposals,
  onRefresh,
  onVote,
  onExecute,
  onCreateProposal,
}: GovernanceViewProps) {
  const [selectedStatus, setSelectedStatus] = useState<'All' | GovernanceProposal['status']>('All');
  const [search, setSearch] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Proposal form state
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newType, setNewType] = useState<GovernanceProposal['proposalType']>('ProtocolUpgrade');
  const [newPayload, setNewPayload] = useState('');

  const [notification, setNotification] = useState<string | null>(null);

  const showNotice = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4000);
  };

  const filteredProposals = useMemo(() => {
    return proposals.filter((p) => {
      const matchesStatus =
        selectedStatus === 'All' || p.status === selectedStatus;
      const matchesSearch =
        p.title.toLowerCase().includes(search.toLowerCase()) ||
        p.description.toLowerCase().includes(search.toLowerCase()) ||
        p.pda.toLowerCase().includes(search.toLowerCase());
      return matchesStatus && matchesSearch;
    });
  }, [proposals, selectedStatus, search]);

  const handleCastVote = (pda: string, approve: boolean) => {
    if (onVote) {
      onVote(pda, approve);
    }
    showNotice(`Cast vote: ${approve ? 'APPROVE' : 'REJECT'} on proposal ${pda.slice(0, 8)}...`);
  };

  const handleExecute = (pda: string) => {
    if (onExecute) {
      onExecute(pda);
    }
    showNotice(`Executed proposal ${pda.slice(0, 8)}...`);
  };

  const handleSubmitProposal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    if (onCreateProposal) {
      onCreateProposal({
        title: newTitle,
        description: newDescription,
        proposalType: newType,
        payload: newPayload,
      });
    }

    showNotice(`Submitted proposal: "${newTitle}".`);
    setShowCreateModal(false);
    setNewTitle('');
    setNewDescription('');
    setNewPayload('');
  };

  return (
    <div className="flex flex-col h-full bg-bbs-black text-bbs-white overflow-y-auto">
      {/* Header Banner */}
      <div className="border-b border-bbs-purple-dim bg-bbs-surface px-6 py-4 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-bbs-purple text-lg font-bold">🏛️</span>
            <h1 className="text-base font-bold text-bbs-white tracking-wide">
              PROTOCOL GOVERNANCE & DAO
            </h1>
            <span className="text-[10px] px-2 py-0.5 rounded bg-bbs-purple-dim text-bbs-purple font-mono">
              STAKE-WEIGHTED
            </span>
          </div>
          <p className="text-xs text-bbs-gray mt-1">
            Community proposals, parameter voting, treasury grants, and automated execution.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="px-3 py-1.5 text-xs bg-bbs-purple-dim text-bbs-lightgray hover:text-bbs-white rounded border border-bbs-purple transition-colors"
            >
              ↻ Refresh
            </button>
          )}
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-3 py-1.5 text-xs bg-bbs-purple text-bbs-black font-bold rounded hover:opacity-90 transition-opacity"
          >
            + Create Proposal
          </button>
        </div>
      </div>

      {/* Global Governance Parameters Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 px-6 py-3 border-b border-bbs-purple-dim bg-bbs-black">
        <div className="p-2.5 rounded bg-bbs-surface border border-bbs-purple-dim">
          <div className="text-[10px] text-bbs-gray uppercase font-mono">Quorum Target</div>
          <div className="text-sm font-bold text-bbs-white mt-0.5">25.0% Stake</div>
        </div>
        <div className="p-2.5 rounded bg-bbs-surface border border-bbs-purple-dim">
          <div className="text-[10px] text-bbs-gray uppercase font-mono">Approval Threshold</div>
          <div className="text-sm font-bold text-bbs-purple mt-0.5">66.7% Majority</div>
        </div>
        <div className="p-2.5 rounded bg-bbs-surface border border-bbs-purple-dim">
          <div className="text-[10px] text-bbs-gray uppercase font-mono">Voting Period</div>
          <div className="text-sm font-bold text-bbs-white mt-0.5">72 Hours</div>
        </div>
        <div className="p-2.5 rounded bg-bbs-surface border border-bbs-purple-dim">
          <div className="text-[10px] text-bbs-gray uppercase font-mono">Execution Delay</div>
          <div className="text-sm font-bold text-bbs-white mt-0.5">24h Timelock</div>
        </div>
      </div>

      {/* Notification Toast */}
      {notification && (
        <div className="mx-6 mt-3 px-4 py-2 bg-bbs-purple text-bbs-black text-xs font-bold rounded flex items-center justify-between animate-pulse">
          <span>✓ {notification}</span>
          <button onClick={() => setNotification(null)} className="font-mono">✕</button>
        </div>
      )}

      {/* Filter Tabs & Search */}
      <div className="px-6 py-3 border-b border-bbs-purple-dim flex flex-wrap items-center justify-between gap-3 bg-bbs-black">
        <div className="flex items-center gap-1 overflow-x-auto">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setSelectedStatus(tab)}
              className={`px-3 py-1 text-xs rounded transition-colors whitespace-nowrap ${
                selectedStatus === tab
                  ? 'bg-bbs-purple text-bbs-black font-bold'
                  : 'bg-bbs-surface text-bbs-gray hover:text-bbs-lightgray'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="relative min-w-[200px]">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search proposals..."
            className="w-full bg-bbs-surface border border-bbs-purple-dim rounded px-3 py-1 text-xs text-bbs-white placeholder:text-bbs-gray focus:outline-none focus:border-bbs-purple"
          />
        </div>
      </div>

      {/* Proposal Cards List */}
      <div className="p-6 flex-1 space-y-4">
        {filteredProposals.length === 0 ? (
          <div className="text-center py-12 text-bbs-gray text-sm">
            No proposals found. Be the first to create one!
          </div>
        ) : (
          filteredProposals.map((proposal) => {
            const votesForNum = parseFloat(proposal.votesFor || '0');
            const votesAgainstNum = parseFloat(proposal.votesAgainst || '0');
            const totalVotes = votesForNum + votesAgainstNum;
            const percentFor = totalVotes > 0 ? (votesForNum / totalVotes) * 100 : 0;
            const percentAgainst = totalVotes > 0 ? (votesAgainstNum / totalVotes) * 100 : 0;

            const isPassed = percentFor >= 66.7 && totalVotes >= parseFloat(proposal.quorum || '1');
            const canExecute = proposal.status === 'Active' && isPassed;

            return (
              <div
                key={proposal.pda}
                className="bg-bbs-surface border border-bbs-purple-dim rounded-lg p-5 space-y-4 hover:border-bbs-purple transition-colors"
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-bbs-purple-dim text-bbs-purple">
                        {proposal.proposalType}
                      </span>
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                          proposal.status === 'Executed'
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                            : proposal.status === 'Active'
                            ? 'bg-blue-950 text-blue-400 border border-blue-800'
                            : 'bg-red-950 text-red-400 border border-red-800'
                        }`}
                      >
                        {proposal.status}
                      </span>
                      <span className="text-[11px] text-bbs-gray font-mono">
                        Nonce #{proposal.nonce}
                      </span>
                    </div>
                    <h2 className="text-sm font-bold text-bbs-white mt-1.5">
                      {proposal.title}
                    </h2>
                  </div>

                  <span className="text-[10px] font-mono text-bbs-gray">
                    PDA: {proposal.pda.slice(0, 6)}...{proposal.pda.slice(-4)}
                  </span>
                </div>

                <p className="text-xs text-bbs-lightgray">
                  {proposal.description}
                </p>

                {/* Voting Progress Bar */}
                <div className="space-y-1.5 bg-bbs-black p-3 rounded border border-bbs-purple-dim">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-emerald-400 font-bold">
                      Approve: {percentFor.toFixed(1)}% ({votesForNum} SOL)
                    </span>
                    <span className="text-red-400 font-bold">
                      Reject: {percentAgainst.toFixed(1)}% ({votesAgainstNum} SOL)
                    </span>
                  </div>

                  <div className="h-2 w-full bg-bbs-surface rounded-full overflow-hidden flex">
                    <div
                      className="bg-emerald-500 h-full transition-all duration-300"
                      style={{ width: `${percentFor}%` }}
                    />
                    <div
                      className="bg-red-500 h-full transition-all duration-300"
                      style={{ width: `${percentAgainst}%` }}
                    />
                  </div>

                  <div className="flex justify-between text-[10px] text-bbs-gray font-mono pt-1">
                    <span>Voters: {proposal.totalVoters}</span>
                    <span>Quorum Threshold: {proposal.quorum} SOL</span>
                  </div>
                </div>

                {/* Actions & Timers */}
                <div className="flex items-center justify-between pt-1 text-xs">
                  <span className="text-[11px] text-bbs-gray font-mono">
                    Proposer: {proposal.proposer.slice(0, 6)}...{proposal.proposer.slice(-4)}
                  </span>

                  <div className="flex items-center gap-2">
                    {proposal.status === 'Active' && (
                      <>
                        <button
                          onClick={() => handleCastVote(proposal.pda, true)}
                          className="px-3 py-1 bg-emerald-900/60 hover:bg-emerald-800 text-emerald-300 border border-emerald-700 rounded font-bold transition-colors"
                        >
                          ✓ Approve
                        </button>
                        <button
                          onClick={() => handleCastVote(proposal.pda, false)}
                          className="px-3 py-1 bg-red-900/60 hover:bg-red-800 text-red-300 border border-red-700 rounded font-bold transition-colors"
                        >
                          ✕ Reject
                        </button>
                      </>
                    )}

                    {canExecute && (
                      <button
                        onClick={() => handleExecute(proposal.pda)}
                        className="px-3.5 py-1 bg-bbs-purple text-bbs-black font-bold rounded hover:opacity-90 transition-opacity"
                      >
                        ⚡ Execute Proposal
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Create Proposal Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <form
            onSubmit={handleSubmitProposal}
            className="bg-bbs-surface border border-bbs-purple rounded-lg max-w-lg w-full p-5 space-y-4"
          >
            <div className="flex items-center justify-between border-b border-bbs-purple-dim pb-3">
              <h2 className="text-sm font-bold text-bbs-white">Create Governance Proposal</h2>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-bbs-gray hover:text-bbs-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-bbs-gray mb-1">Proposal Title *</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Reduce Protocol Fee to 2.5%"
                  className="w-full bg-bbs-black border border-bbs-purple-dim rounded px-3 py-1.5 text-bbs-white focus:outline-none focus:border-bbs-purple"
                />
              </div>

              <div>
                <label className="block text-bbs-gray mb-1">Proposal Type</label>
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value as any)}
                  className="w-full bg-bbs-black border border-bbs-purple-dim rounded px-3 py-1.5 text-bbs-white focus:outline-none"
                >
                  <option value="ProtocolUpgrade">Protocol Upgrade (0)</option>
                  <option value="FeeChange">Fee Change (1)</option>
                  <option value="TreasurySpend">Treasury Spend (2)</option>
                  <option value="RateLimitChange">Rate Limit Change (3)</option>
                </select>
              </div>

              <div>
                <label className="block text-bbs-gray mb-1">Description</label>
                <textarea
                  rows={3}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Detailed rationale and specification for this proposal..."
                  className="w-full bg-bbs-black border border-bbs-purple-dim rounded p-2 text-xs text-bbs-white focus:outline-none focus:border-bbs-purple"
                />
              </div>

              <div>
                <label className="block text-bbs-gray mb-1">Payload / Parameter Data (Hex or JSON)</label>
                <input
                  type="text"
                  value={newPayload}
                  onChange={(e) => setNewPayload(e.target.value)}
                  placeholder="Optional hex instructions payload"
                  className="w-full font-mono bg-bbs-black border border-bbs-purple-dim rounded px-3 py-1.5 text-[11px] text-bbs-white focus:outline-none focus:border-bbs-purple"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="px-3 py-1.5 text-xs text-bbs-gray hover:text-bbs-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 text-xs bg-bbs-purple text-bbs-black font-bold rounded hover:opacity-90"
              >
                Submit Proposal
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
