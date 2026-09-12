import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { GovernanceView } from './GovernanceView';
import { INITIAL_GOVERNANCE_PROPOSALS } from '../../data/onChainData';

describe('GovernanceView', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('renders governance header, global metrics, and proposal items', () => {
    render(<GovernanceView proposals={INITIAL_GOVERNANCE_PROPOSALS} />);

    expect(screen.getByText('PROTOCOL GOVERNANCE & DAO')).toBeDefined();
    expect(screen.getByText(/AIP-14: Slash Fee Parameter Readjustment/i)).toBeDefined();
    expect(screen.getByText(/AIP-13: Deployment of Multi-Tier Dispute Arbitrators/i)).toBeDefined();
  });

  it('filters proposals by status tab', () => {
    render(<GovernanceView proposals={INITIAL_GOVERNANCE_PROPOSALS} />);

    const executedTab = screen.getByRole('button', { name: 'Executed' });
    fireEvent.click(executedTab);

    expect(screen.getByText(/AIP-13: Deployment of Multi-Tier Dispute Arbitrators/i)).toBeDefined();
    expect(screen.queryByText(/AIP-14: Slash Fee Parameter Readjustment/i)).toBeNull();
  });

  it('filters proposals by search query', () => {
    render(<GovernanceView proposals={INITIAL_GOVERNANCE_PROPOSALS} />);

    const searchInput = screen.getByPlaceholderText('Search proposals...');
    fireEvent.change(searchInput, { target: { value: 'bounties' } });

    expect(screen.getByText(/AIP-15: Treasury Allocation for Decentralized Skill Bounties/i)).toBeDefined();
    expect(screen.queryByText(/AIP-14: Slash Fee Parameter Readjustment/i)).toBeNull();
  });

  it('allows voting Approve and Reject on active proposals', () => {
    const handleVote = vi.fn();
    render(
      <GovernanceView
        proposals={INITIAL_GOVERNANCE_PROPOSALS}
        onVote={handleVote}
      />
    );

    const approveBtns = screen.getAllByRole('button', { name: /Approve/i });
    fireEvent.click(approveBtns[0]);

    expect(handleVote).toHaveBeenCalledWith(
      INITIAL_GOVERNANCE_PROPOSALS[0].pda,
      true
    );

    const rejectBtns = screen.getAllByRole('button', { name: /Reject/i });
    fireEvent.click(rejectBtns[0]);

    expect(handleVote).toHaveBeenCalledWith(
      INITIAL_GOVERNANCE_PROPOSALS[0].pda,
      false
    );
  });

  it('allows executing a proposal when execution button is present', () => {
    const handleExecute = vi.fn();
    const eligibleProposal = {
      ...INITIAL_GOVERNANCE_PROPOSALS[0],
      pda: 'EligiblePda123',
      executionAfter: Date.now() - 1000,
    };

    render(
      <GovernanceView
        proposals={[eligibleProposal]}
        onExecute={handleExecute}
      />
    );

    const execBtn = screen.getByRole('button', { name: /Execute Proposal/i });
    fireEvent.click(execBtn);

    expect(handleExecute).toHaveBeenCalledWith('EligiblePda123');
  });

  it('opens create proposal modal and calls onCreateProposal', () => {
    const handleCreate = vi.fn();
    render(
      <GovernanceView
        proposals={INITIAL_GOVERNANCE_PROPOSALS}
        onCreateProposal={handleCreate}
      />
    );

    const createBtn = screen.getByRole('button', { name: '+ Create Proposal' });
    fireEvent.click(createBtn);

    expect(screen.getByText('Create Governance Proposal')).toBeDefined();

    fireEvent.change(screen.getByPlaceholderText('e.g. Reduce Protocol Fee to 2.5%'), {
      target: { value: 'AIP-16: New Test Proposal' },
    });
    fireEvent.change(screen.getByPlaceholderText('Detailed rationale and specification for this proposal...'), {
      target: { value: 'Proposal description for test' },
    });

    const submitBtn = screen.getByRole('button', { name: 'Submit Proposal' });
    fireEvent.click(submitBtn);

    expect(handleCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'AIP-16: New Test Proposal',
        description: 'Proposal description for test',
      })
    );
  });
});
