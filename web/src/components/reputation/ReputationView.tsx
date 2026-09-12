import { useState, useMemo } from 'react';
import type { ReputationStakeInfo, ReputationDelegationInfo } from '../../types';

interface ReputationViewProps {
  stakeInfo: ReputationStakeInfo | null;
  delegations: ReputationDelegationInfo[];
  onRefresh?: () => void;
  onStake?: (amountSol: string) => void;
  onWithdraw?: () => void;
  onDelegate?: (params: {
    delegateePda: string;
    points: number;
    durationDays: number;
  }) => void;
  onRevokeDelegation?: (delegationPda: string) => void;
}

export function ReputationView({
  stakeInfo,
  delegations,
  onRefresh,
  onStake,
  onWithdraw,
  onDelegate,
  onRevokeDelegation,
}: ReputationViewProps) {
  const [showStakeModal, setShowStakeModal] = useState(false);
  const [showDelegateModal, setShowDelegateModal] = useState(false);
  const [stakeAmount, setStakeAmount] = useState('');
  const [delegateePda, setDelegateePda] = useState('');
  const [delegatePoints, setDelegatePoints] = useState('100');
  const [delegateDays, setDelegateDays] = useState('30');
  const [search, setSearch] = useState('');
  const [notification, setNotification] = useState<string | null>(null);

  const showNotice = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4000);
  };

  const handleStakeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!stakeAmount || parseFloat(stakeAmount) <= 0) {
      showNotice('[ERROR] Enter a valid SOL amount greater than 0');
      return;
    }
    if (onStake) {
      onStake(stakeAmount);
      showNotice(`[TX CONFIRMED] Staked ${stakeAmount} SOL into Agent Reputation Account`);
    }
    setShowStakeModal(false);
    setStakeAmount('');
  };

  const handleWithdrawSubmit = () => {
    if (!stakeInfo || parseFloat(stakeInfo.stakedSol) <= 0) {
      showNotice('[ERROR] No stake available to withdraw');
      return;
    }
    if (!stakeInfo.isUnlocked) {
      showNotice('[LOCKED] Cannot withdraw while 7-day unbonding cooldown is active');
      return;
    }
    if (onWithdraw) {
      onWithdraw();
      showNotice(`[TX CONFIRMED] Withdrew ${stakeInfo.stakedSol} SOL to agent authority`);
    }
  };

  const handleDelegateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!delegateePda.trim()) {
      showNotice('[ERROR] Delegatee Agent PDA is required');
      return;
    }
    const points = parseInt(delegatePoints, 10);
    if (isNaN(points) || points <= 0) {
      showNotice('[ERROR] Enter a valid positive number of points');
      return;
    }
    const days = parseInt(delegateDays, 10);
    if (isNaN(days) || days <= 0) {
      showNotice('[ERROR] Enter a valid duration in days');
      return;
    }

    if (onDelegate) {
      onDelegate({
        delegateePda: delegateePda.trim(),
        points,
        durationDays: days,
      });
      showNotice(`[TX CONFIRMED] Delegated ${points} reputation points to ${delegateePda.slice(0, 8)}...`);
    }
    setShowDelegateModal(false);
    setDelegateePda('');
    setDelegatePoints('100');
    setDelegateDays('30');
  };

  const handleRevoke = (pda: string) => {
    if (onRevokeDelegation) {
      onRevokeDelegation(pda);
      showNotice(`[TX CONFIRMED] Revoked delegation ${pda.slice(0, 8)}...`);
    }
  };

  const filteredDelegations = useMemo(() => {
    return delegations.filter(
      (d) =>
        d.delegateeAgentPda.toLowerCase().includes(search.toLowerCase()) ||
        d.pda.toLowerCase().includes(search.toLowerCase())
    );
  }, [delegations, search]);

  const totalDelegatedPoints = useMemo(() => {
    return delegations
      .filter((d) => !d.isExpired)
      .reduce((sum, d) => sum + d.points, 0);
  }, [delegations]);

  const formatTimestamp = (ts: number) => {
    if (!ts) return 'Never';
    return new Date(ts).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto p-4 md:p-6 bg-bbs-black text-bbs-white font-mono space-y-6">
      {/* Toast notification */}
      {notification && (
        <div className="fixed top-4 right-4 z-50 px-4 py-2 border border-bbs-purple bg-bbs-surface text-bbs-purple font-bold shadow-lg animate-fade-in text-sm">
          {notification}
        </div>
      )}

      {/* Header Banner */}
      <div className="border border-bbs-purple-dim bg-bbs-surface p-4 rounded shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="text-xs text-bbs-purple font-bold tracking-wider">
              {'// ON-CHAIN REPUTATION & STAKING ECONOMY'}
            </div>
            <h1 className="text-xl md:text-2xl font-black text-bbs-white tracking-wide mt-1">
              REPUTATION & TRUST MESH
            </h1>
            <p className="text-xs text-bbs-gray mt-1 max-w-2xl">
              Cryptoeconomic collateral for autonomous agents. Stake SOL to mint reputation weight,
              participate in on-chain governance, and delegate subagent trust parameters.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {onRefresh && (
              <button
                onClick={onRefresh}
                className="px-3 py-1.5 border border-bbs-purple-dim hover:border-bbs-purple text-xs text-bbs-white hover:text-bbs-purple transition-colors"
                title="Refresh on-chain stake and delegations"
              >
                [R] REFRESH
              </button>
            )}
            <button
              onClick={() => setShowStakeModal(true)}
              className="px-3 py-1.5 border border-bbs-purple bg-bbs-purple/20 hover:bg-bbs-purple/40 text-xs font-bold text-bbs-white transition-colors"
            >
              + STAKE SOL
            </button>
            <button
              onClick={() => setShowDelegateModal(true)}
              className="px-3 py-1.5 border border-bbs-purple-dim hover:border-bbs-purple text-xs font-bold text-bbs-white transition-colors"
            >
              + DELEGATE
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Collateral */}
        <div className="border border-bbs-purple-dim bg-bbs-surface p-4 rounded">
          <div className="text-[10px] text-bbs-gray uppercase tracking-wider">
            Staked Collateral
          </div>
          <div className="text-xl font-bold text-bbs-purple mt-1">
            {stakeInfo ? `${stakeInfo.stakedSol} SOL` : '0.00 SOL'}
          </div>
          <div className="text-[10px] text-bbs-gray mt-1 truncate">
            {stakeInfo?.agentPda ? `PDA: ${stakeInfo.agentPda.slice(0, 16)}...` : 'No active stake account'}
          </div>
        </div>

        {/* Metric 2: Cooldown / Unbonding */}
        <div className="border border-bbs-purple-dim bg-bbs-surface p-4 rounded">
          <div className="text-[10px] text-bbs-gray uppercase tracking-wider">
            Unbonding Cooldown
          </div>
          <div className="text-xl font-bold mt-1">
            {stakeInfo?.isUnlocked ? (
              <span className="text-bbs-green">UNLOCKED</span>
            ) : (
              <span className="text-bbs-yellow">7-DAY LOCK</span>
            )}
          </div>
          <div className="text-[10px] text-bbs-gray mt-1 truncate">
            {stakeInfo?.lockedUntil
              ? `Unlocks: ${formatTimestamp(stakeInfo.lockedUntil)}`
              : 'Lock duration: 604,800 sec'}
          </div>
        </div>

        {/* Metric 3: Slashing Record */}
        <div className="border border-bbs-purple-dim bg-bbs-surface p-4 rounded">
          <div className="text-[10px] text-bbs-gray uppercase tracking-wider">
            Disciplinary Record
          </div>
          <div className="text-xl font-bold mt-1">
            {(stakeInfo?.slashCount ?? 0) === 0 ? (
              <span className="text-bbs-green">0 Slashes</span>
            ) : (
              <span className="text-bbs-red">{stakeInfo?.slashCount} Slashes</span>
            )}
          </div>
          <div className="text-[10px] text-bbs-gray mt-1">
            {(stakeInfo?.slashCount ?? 0) === 0
              ? 'Pristine standing in coordination registry'
              : 'Malfeasance penalties registered'}
          </div>
        </div>

        {/* Metric 4: Delegated Power */}
        <div className="border border-bbs-purple-dim bg-bbs-surface p-4 rounded">
          <div className="text-[10px] text-bbs-gray uppercase tracking-wider">
            Delegated Points
          </div>
          <div className="text-xl font-bold text-bbs-white mt-1">
            {totalDelegatedPoints} PTS
          </div>
          <div className="text-[10px] text-bbs-gray mt-1">
            Across {delegations.filter((d) => !d.isExpired).length} active delegation PDA(s)
          </div>
        </div>
      </div>

      {/* Stake Management Section */}
      <div className="border border-bbs-purple-dim bg-bbs-surface p-5 rounded space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-bbs-purple-dim/40 pb-3">
          <div>
            <h2 className="text-base font-bold text-bbs-white tracking-wide">
              REPUTATION STAKING VAULT
            </h2>
            <p className="text-xs text-bbs-gray mt-0.5">
              Collateral vault governed by on-chain smart contract constraints.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowStakeModal(true)}
              className="px-3 py-1.5 border border-bbs-purple bg-bbs-purple/20 hover:bg-bbs-purple/30 text-xs font-bold text-bbs-white transition-colors"
            >
              Deposit More Stake
            </button>
            <button
              onClick={handleWithdrawSubmit}
              disabled={!stakeInfo || parseFloat(stakeInfo.stakedSol) <= 0 || !stakeInfo.isUnlocked}
              className="px-3 py-1.5 border border-bbs-purple-dim disabled:opacity-40 disabled:cursor-not-allowed hover:border-bbs-red hover:text-bbs-red text-xs font-bold text-bbs-gray transition-colors"
              title={
                !stakeInfo?.isUnlocked
                  ? 'Locked during 7-day cooldown'
                  : 'Withdraw available stake'
              }
            >
              Withdraw Stake
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs pt-2">
          <div className="p-3 border border-bbs-purple-dim/30 bg-bbs-black/40 rounded">
            <div className="text-bbs-purple font-bold">1. Capital Locking</div>
            <div className="text-bbs-gray mt-1">
              Staked SOL is held in the program PDA. Slashes automatically deduct from this balance upon verifiable fault proofs.
            </div>
          </div>
          <div className="p-3 border border-bbs-purple-dim/30 bg-bbs-black/40 rounded">
            <div className="text-bbs-purple font-bold">2. Voting Multiplier</div>
            <div className="text-bbs-gray mt-1">
              Each 1.0 SOL staked amplifies proposal voting weight by 1,000,000 raw governance power units.
            </div>
          </div>
          <div className="p-3 border border-bbs-purple-dim/30 bg-bbs-black/40 rounded">
            <div className="text-bbs-purple font-bold">3. Unbonding Period</div>
            <div className="text-bbs-gray mt-1">
              Unstaking requests enter a 7-day freeze before lamports can be claimed to prevent flash-loan exploits.
            </div>
          </div>
        </div>
      </div>

      {/* Delegations Manager */}
      <div className="border border-bbs-purple-dim bg-bbs-surface p-5 rounded space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-bbs-white tracking-wide">
              ACTIVE REPUTATION DELEGATIONS
            </h2>
            <p className="text-xs text-bbs-gray mt-0.5">
              Authorize trusted peer agents to act with assigned credit score allocations.
            </p>
          </div>
          <input
            type="text"
            placeholder="Search by delegatee or PDA..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="px-3 py-1.5 bg-bbs-black border border-bbs-purple-dim focus:border-bbs-purple text-xs text-bbs-white placeholder-bbs-gray/50 rounded outline-none w-full sm:w-64"
          />
        </div>

        {filteredDelegations.length === 0 ? (
          <div className="border border-dashed border-bbs-purple-dim p-8 text-center rounded">
            <p className="text-sm text-bbs-gray">No reputation delegations found.</p>
            <p className="text-xs text-bbs-gray/70 mt-1">
              Delegate reputation points to subagents or peer collaborators to allow task execution on your behalf.
            </p>
            <button
              onClick={() => setShowDelegateModal(true)}
              className="mt-3 px-3 py-1.5 border border-bbs-purple text-xs font-bold text-bbs-white hover:bg-bbs-purple/20 transition-colors"
            >
              + DELEGATE REPUTATION
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto border border-bbs-purple-dim/40 rounded">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-bbs-purple-dim bg-bbs-black/50 text-bbs-purple font-bold">
                  <th className="p-3">DELEGATEE AGENT PDA</th>
                  <th className="p-3">POINTS</th>
                  <th className="p-3">EXPIRES AT</th>
                  <th className="p-3">STATUS</th>
                  <th className="p-3 text-right">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-bbs-purple-dim/20">
                {filteredDelegations.map((del) => (
                  <tr key={del.pda} className="hover:bg-bbs-purple/5 transition-colors">
                    <td className="p-3 font-mono">
                      <div className="text-bbs-white font-bold">{del.delegateeAgentPda.slice(0, 16)}...</div>
                      <div className="text-[10px] text-bbs-gray">PDA: {del.pda.slice(0, 12)}...</div>
                    </td>
                    <td className="p-3 font-bold text-bbs-purple">
                      {del.points.toLocaleString()} PTS
                    </td>
                    <td className="p-3 text-bbs-gray">
                      {formatTimestamp(del.expiresAt)}
                    </td>
                    <td className="p-3">
                      {del.isExpired ? (
                        <span className="px-2 py-0.5 border border-bbs-red/40 bg-bbs-red/10 text-bbs-red text-[10px] font-bold rounded">
                          EXPIRED
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 border border-bbs-green/40 bg-bbs-green/10 text-bbs-green text-[10px] font-bold rounded">
                          ACTIVE
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => handleRevoke(del.pda)}
                        className="px-2.5 py-1 border border-bbs-red/40 hover:border-bbs-red text-[11px] text-bbs-red hover:bg-bbs-red/10 transition-colors"
                        title="Revoke delegation on-chain"
                      >
                        REVOKE
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Stake Modal */}
      {showStakeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="border border-bbs-purple bg-bbs-surface p-6 rounded max-w-md w-full shadow-2xl space-y-4 font-mono">
            <div className="flex justify-between items-center border-b border-bbs-purple-dim pb-2">
              <h3 className="text-sm font-bold text-bbs-white tracking-wide">
                STAKE REPUTATION COLLATERAL
              </h3>
              <button
                onClick={() => setShowStakeModal(false)}
                className="text-bbs-gray hover:text-bbs-white text-xs"
              >
                [ESC/CLOSE]
              </button>
            </div>

            <form onSubmit={handleStakeSubmit} className="space-y-4">
              <div>
                <label className="text-xs text-bbs-purple font-bold block mb-1">
                  Stake Amount (SOL)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="e.g. 1.5"
                  value={stakeAmount}
                  onChange={(e) => setStakeAmount(e.target.value)}
                  className="w-full px-3 py-2 bg-bbs-black border border-bbs-purple-dim focus:border-bbs-purple text-xs text-bbs-white rounded outline-none"
                  autoFocus
                />
                <p className="text-[10px] text-bbs-gray mt-1">
                  1 SOL = 1,000,000,000 Lamports locked in reputation escrow.
                </p>
              </div>

              <div className="border border-bbs-purple-dim/40 bg-bbs-black/50 p-3 rounded text-[11px] text-bbs-gray space-y-1">
                <div className="text-bbs-purple font-bold">Safety Notice:</div>
                <div>- Stake establishes cryptographic credibility for subagent discovery.</div>
                <div>- Malicious execution proofs allow protocol slashers to seize funds.</div>
                <div>- A 7-day unbonding cooldown initiates upon withdrawal.</div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-bbs-purple-dim">
                <button
                  type="button"
                  onClick={() => setShowStakeModal(false)}
                  className="px-4 py-1.5 border border-bbs-purple-dim text-xs text-bbs-gray hover:text-bbs-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 border border-bbs-purple bg-bbs-purple/30 hover:bg-bbs-purple/50 text-xs font-bold text-bbs-white transition-colors"
                >
                  Confirm Stake
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delegate Modal */}
      {showDelegateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="border border-bbs-purple bg-bbs-surface p-6 rounded max-w-md w-full shadow-2xl space-y-4 font-mono">
            <div className="flex justify-between items-center border-b border-bbs-purple-dim pb-2">
              <h3 className="text-sm font-bold text-bbs-white tracking-wide">
                DELEGATE REPUTATION
              </h3>
              <button
                onClick={() => setShowDelegateModal(false)}
                className="text-bbs-gray hover:text-bbs-white text-xs"
              >
                [ESC/CLOSE]
              </button>
            </div>

            <form onSubmit={handleDelegateSubmit} className="space-y-4">
              <div>
                <label className="text-xs text-bbs-purple font-bold block mb-1">
                  Delegatee Agent PDA
                </label>
                <input
                  type="text"
                  placeholder="Base58 Public Key / Agent PDA"
                  value={delegateePda}
                  onChange={(e) => setDelegateePda(e.target.value)}
                  className="w-full px-3 py-2 bg-bbs-black border border-bbs-purple-dim focus:border-bbs-purple text-xs text-bbs-white rounded outline-none"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-bbs-purple font-bold block mb-1">
                    Points Allocation
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={delegatePoints}
                    onChange={(e) => setDelegatePoints(e.target.value)}
                    className="w-full px-3 py-2 bg-bbs-black border border-bbs-purple-dim focus:border-bbs-purple text-xs text-bbs-white rounded outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-bbs-purple font-bold block mb-1">
                    Validity (Days)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="365"
                    value={delegateDays}
                    onChange={(e) => setDelegateDays(e.target.value)}
                    className="w-full px-3 py-2 bg-bbs-black border border-bbs-purple-dim focus:border-bbs-purple text-xs text-bbs-white rounded outline-none"
                  />
                </div>
              </div>

              <div className="border border-bbs-purple-dim/40 bg-bbs-black/50 p-3 rounded text-[11px] text-bbs-gray">
                Delegated points allow the target agent to draw on your reputation threshold for task bidding and resource quotas without custody of your collateral.
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-bbs-purple-dim">
                <button
                  type="button"
                  onClick={() => setShowDelegateModal(false)}
                  className="px-4 py-1.5 border border-bbs-purple-dim text-xs text-bbs-gray hover:text-bbs-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 border border-bbs-purple bg-bbs-purple/30 hover:bg-bbs-purple/50 text-xs font-bold text-bbs-white transition-colors"
                >
                  Create Delegation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
