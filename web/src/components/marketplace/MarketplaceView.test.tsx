import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MarketplaceView } from './MarketplaceView';
import { INITIAL_MARKETPLACE_SKILLS } from '../../data/onChainData';

describe('MarketplaceView', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('renders marketplace title, metrics, and skill cards', () => {
    render(<MarketplaceView skills={INITIAL_MARKETPLACE_SKILLS} />);

    expect(screen.getByText('ON-CHAIN SKILL MARKETPLACE')).toBeDefined();
    expect(screen.getByText('Deep Research Synthesizer')).toBeDefined();
    expect(screen.getByText('Jupiter Route Arbitrage Sentinel')).toBeDefined();
  });

  it('filters skills by search query', () => {
    render(<MarketplaceView skills={INITIAL_MARKETPLACE_SKILLS} />);

    const searchInput = screen.getByPlaceholderText('Search skills, tags, authors...');
    fireEvent.change(searchInput, { target: { value: 'jupiter' } });

    expect(screen.getByText('Jupiter Route Arbitrage Sentinel')).toBeDefined();
    expect(screen.queryByText('Deep Research Synthesizer')).toBeNull();
  });

  it('filters skills by clicking a tag filter', () => {
    render(<MarketplaceView skills={INITIAL_MARKETPLACE_SKILLS} />);

    const defiTagBtn = screen.getByRole('button', { name: 'DeFi' });
    fireEvent.click(defiTagBtn);

    expect(screen.getByText('Jupiter Route Arbitrage Sentinel')).toBeDefined();
    expect(screen.queryByText('Deep Research Synthesizer')).toBeNull();
  });

  it('opens purchase modal and calls onPurchase callback', () => {
    const handlePurchase = vi.fn();
    render(
      <MarketplaceView
        skills={INITIAL_MARKETPLACE_SKILLS}
        onPurchase={handlePurchase}
      />
    );

    const purchaseBtns = screen.getAllByRole('button', { name: 'Purchase' });
    fireEvent.click(purchaseBtns[0]);

    expect(screen.getByText('Confirm Skill Purchase')).toBeDefined();

    const confirmBtn = screen.getByRole('button', { name: /Confirm & Pay/i });
    fireEvent.click(confirmBtn);

    expect(handlePurchase).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Anchor Bytecode Security Verifier',
      })
    );
  });

  it('opens rate modal and calls onRate callback', () => {
    const handleRate = vi.fn();
    render(
      <MarketplaceView
        skills={INITIAL_MARKETPLACE_SKILLS}
        onRate={handleRate}
      />
    );

    const rateBtns = screen.getAllByRole('button', { name: 'Rate' });
    fireEvent.click(rateBtns[0]);

    expect(screen.getByText(/Rate Skill:/i)).toBeDefined();

    const starBtns = screen.getAllByText('★');
    fireEvent.click(starBtns[4]);

    const submitBtn = screen.getByRole('button', { name: 'Submit On-Chain Rating' });
    fireEvent.click(submitBtn);

    expect(handleRate).toHaveBeenCalledWith('solana-contract-auditor', 5, '');
  });

  it('opens publish modal and calls onPublish callback', () => {
    const handlePublish = vi.fn();
    render(
      <MarketplaceView
        skills={INITIAL_MARKETPLACE_SKILLS}
        onPublish={handlePublish}
      />
    );

    const publishBtn = screen.getByRole('button', { name: '+ Publish Skill' });
    fireEvent.click(publishBtn);

    expect(screen.getByText('Publish Skill to Marketplace')).toBeDefined();

    fireEvent.change(screen.getByPlaceholderText('e.g. Jupiter Swap Pro'), {
      target: { value: 'New Test Skill' },
    });
    fireEvent.change(screen.getByPlaceholderText('Brief summary of what this skill does'), {
      target: { value: 'Automates custom tasks on chain' },
    });
    fireEvent.change(screen.getByPlaceholderText('DeFi, Swaps'), {
      target: { value: 'test, solana' },
    });

    const submitBtn = screen.getByRole('button', { name: 'Publish On-Chain' });
    fireEvent.click(submitBtn);

    expect(handlePublish).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'New Test Skill',
        description: 'Automates custom tasks on chain',
        tags: ['test', 'solana'],
      })
    );
  });
});
