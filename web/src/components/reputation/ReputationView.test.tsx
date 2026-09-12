import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ReputationView } from './ReputationView';
import {
  INITIAL_REPUTATION_STAKE,
  INITIAL_REPUTATION_DELEGATIONS,
} from '../../data/onChainData';

describe('ReputationView', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('renders reputation metrics and delegations table', () => {
    render(
      <ReputationView
        stakeInfo={INITIAL_REPUTATION_STAKE}
        delegations={INITIAL_REPUTATION_DELEGATIONS}
      />
    );

    expect(screen.getByText('REPUTATION & TRUST MESH')).toBeDefined();
    expect(screen.getByText('2.50 SOL')).toBeDefined();
    expect(screen.getByText('350 PTS')).toBeDefined();
    expect(screen.getByText('0 Slashes')).toBeDefined();
  });

  it('filters delegations by delegatee search query', () => {
    render(
      <ReputationView
        stakeInfo={INITIAL_REPUTATION_STAKE}
        delegations={INITIAL_REPUTATION_DELEGATIONS}
      />
    );

    const searchInput = screen.getByPlaceholderText('Search by delegatee or PDA...');
    fireEvent.change(searchInput, { target: { value: 'AgntSec' } });

    expect(screen.getByText('100 PTS')).toBeDefined();
    expect(screen.queryByText('250 PTS')).toBeNull();
  });

  it('calls onRevokeDelegation when clicking Revoke', () => {
    const handleRevoke = vi.fn();
    render(
      <ReputationView
        stakeInfo={INITIAL_REPUTATION_STAKE}
        delegations={INITIAL_REPUTATION_DELEGATIONS}
        onRevokeDelegation={handleRevoke}
      />
    );

    const revokeBtns = screen.getAllByRole('button', { name: 'REVOKE' });
    fireEvent.click(revokeBtns[0]);

    expect(handleRevoke).toHaveBeenCalledWith(
      INITIAL_REPUTATION_DELEGATIONS[0].pda
    );
  });

  it('opens stake modal and calls onStake', () => {
    const handleStake = vi.fn();
    render(
      <ReputationView
        stakeInfo={INITIAL_REPUTATION_STAKE}
        delegations={INITIAL_REPUTATION_DELEGATIONS}
        onStake={handleStake}
      />
    );

    const stakeBtn = screen.getByRole('button', { name: '+ STAKE SOL' });
    fireEvent.click(stakeBtn);

    expect(screen.getByText('STAKE REPUTATION COLLATERAL')).toBeDefined();

    const amountInput = screen.getByPlaceholderText('e.g. 1.5');
    fireEvent.change(amountInput, { target: { value: '2.0' } });

    const confirmBtn = screen.getByRole('button', { name: 'Confirm Stake' });
    fireEvent.click(confirmBtn);

    expect(handleStake).toHaveBeenCalledWith('2.0');
  });

  it('allows withdrawal when stake is unlocked', () => {
    const handleWithdraw = vi.fn();
    const unlockedStake = {
      ...INITIAL_REPUTATION_STAKE,
      isUnlocked: true,
      stakedSol: '1.50',
    };

    render(
      <ReputationView
        stakeInfo={unlockedStake}
        delegations={INITIAL_REPUTATION_DELEGATIONS}
        onWithdraw={handleWithdraw}
      />
    );

    const withdrawBtn = screen.getByRole('button', { name: 'Withdraw Stake' }) as HTMLButtonElement;
    expect(withdrawBtn.disabled).toBe(false);
    fireEvent.click(withdrawBtn);

    expect(handleWithdraw).toHaveBeenCalled();
  });

  it('opens delegate modal and calls onDelegate', () => {
    const handleDelegate = vi.fn();
    render(
      <ReputationView
        stakeInfo={INITIAL_REPUTATION_STAKE}
        delegations={INITIAL_REPUTATION_DELEGATIONS}
        onDelegate={handleDelegate}
      />
    );

    const delegateBtn = screen.getByRole('button', { name: '+ DELEGATE' });
    fireEvent.click(delegateBtn);

    expect(screen.getByText('DELEGATE REPUTATION')).toBeDefined();

    fireEvent.change(screen.getByPlaceholderText('Base58 Public Key / Agent PDA'), {
      target: { value: 'AgntDelegateeTestTarget1234567890' },
    });

    const createBtn = screen.getByRole('button', { name: 'Create Delegation' });
    fireEvent.click(createBtn);

    expect(handleDelegate).toHaveBeenCalledWith({
      delegateePda: 'AgntDelegateeTestTarget1234567890',
      points: 100,
      durationDays: 30,
    });
  });
});
